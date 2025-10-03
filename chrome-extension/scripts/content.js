// PhishGuard 360 - Content Script for Gmail Integration
// Detects Gmail interface and injects security scanning functionality

// Prevent multiple initializations
if (window.phishGuardInitialized) {
    console.log('PhishGuard already initialized, skipping...');
} else {
    window.phishGuardInitialized = true;

    class PhishGuardScanner {
        constructor() {
            this.isGmailPage = this.detectGmailInterface();
            this.sidebarInjected = false;
            this.currentEmailData = null;
            this.scanInProgress = false;
            this.debounceTimer = null;
            this.lastCheckedUrl = '';

            if (this.isGmailPage) {
                this.initializeScanner();
            }
        }
    
    detectGmailInterface() {
        const url = window.location.href;
        const gmailSelectors = [
            '[role="main"]',
            '.nH.oy8Mbf',
            '.T-I.T-I-KE.L3'
        ];
        
        return (url.includes('mail.google.com') || url.includes('gmail.com')) &&
               gmailSelectors.some(selector => document.querySelector(selector));
    }
    
    initializeScanner() {
        console.log('🛡️ PhishGuard 360 initialized on Gmail');

        // Setup message listener for popup communication
        this.setupMessageListener();

        // Setup window message listener for sidebar communication
        this.setupSidebarMessageListener();

        // Wait for Gmail to fully load
        this.waitForGmailLoad().then(() => {
            this.setupEmailObserver();
            this.setupKeyboardShortcuts();
            this.checkAndInjectScanButton(); // Only inject when viewing an email
        });
    }
    
    setupMessageListener() {
        // Remove any existing listeners to prevent duplicates
        if (chrome.runtime.onMessage.hasListeners()) {
            console.log('PhishGuard: Removing existing message listeners');
        }
        
        // Listen for messages from popup and other extension components
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('PhishGuard: Received message:', message);
            
            // Always respond, even if just to acknowledge receipt
            try {
                switch (message.type) {
                    case 'TRIGGER_SCAN':
                        this.handleTriggerScan().then(result => {
                            sendResponse({ success: true, result });
                        }).catch(error => {
                            console.error('Scan trigger failed:', error);
                            sendResponse({ success: false, error: error.message });
                        });
                        return true; // Will respond asynchronously
                        
                case 'CHECK_EMAIL_STATUS':
                    const status = { 
                        hasEmail: this.isViewingSpecificEmail(),
                        canScan: this.isViewingSpecificEmail() && !this.scanInProgress,
                        url: window.location.href,
                        debugInfo: this.getEmailDetectionDebugInfo()
                    };
                    sendResponse(status);
                    break;                    case 'GET_CURRENT_EMAIL':
                        const emailData = this.extractCurrentEmailData();
                        sendResponse({ emailData });
                        break;
                        
                    case 'PING':
                        sendResponse({ pong: true, timestamp: Date.now() });
                        break;
                        
                    default:
                        sendResponse({ success: false, error: 'Unknown message type: ' + message.type });
                }
            } catch (error) {
                console.error('Message handler error:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
        
        console.log('PhishGuard: Message listener setup complete');
    }

    setupSidebarMessageListener() {
        // Listen for messages from sidebar iframe
        window.addEventListener('message', (event) => {
            // Only accept messages from our sidebar iframe
            if (event.data && event.data.type) {
                console.log('PhishGuard: Received window message:', event.data);

                switch (event.data.type) {
                    case 'CLOSE_SIDEBAR':
                        this.closeSidebar();
                        break;
                }
            }
        });
    }

    async handleTriggerScan() {
        if (!this.isViewingSpecificEmail()) {
            throw new Error('No email is currently open for scanning');
        }
        
        if (this.scanInProgress) {
            throw new Error('Scan already in progress');
        }
        
        // Start the email scan
        await this.startEmailScan();
        return { message: 'Scan started successfully' };
    }
    
    async waitForGmailLoad() {
        return new Promise((resolve) => {
            const checkLoad = () => {
                if (document.querySelector('[role="main"]') && 
                    document.querySelector('.nH.oy8Mbf')) {
                    resolve();
                } else {
                    setTimeout(checkLoad, 500);
                }
            };
            checkLoad();
        });
    }
    
    checkAndInjectScanButton() {
        // Only inject scan button when viewing a specific email (not inbox/compose)
        if (this.isViewingSpecificEmail()) {
            this.injectScanButton();
        } else {
            this.removeScanButton();
        }
    }
    
    isViewingSpecificEmail() {
        // Check if we're viewing a specific email thread (not inbox, compose, etc.)
        const url = window.location.href;
        console.log('PhishGuard: Checking email view for URL:', url);

        // CRITICAL: First check if we're in compose mode - if so, immediately return false
        const isComposing = document.querySelector('.M9') || // Compose window
                           document.querySelector('[role="dialog"][aria-label*="ompose"]') || // Compose dialog
                           url.includes('#compose') ||
                           url.includes('&compose=') ||
                           url.includes('view=cm');

        if (isComposing) {
            console.log('PhishGuard: In compose mode, not viewing email');
            return false;
        }

        // Simplified and more reliable Gmail email view URL patterns
        const emailViewPatterns = [
            /#inbox\/[a-zA-Z0-9]{15,}/, // #inbox/threadid (most common)
            /#sent\/[a-zA-Z0-9]{15,}/, // #sent/threadid
            /#starred\/[a-zA-Z0-9]{15,}/, // #starred/threadid
            /#label\/[^\/]+\/[a-zA-Z0-9]{15,}/, // #label/name/threadid
            /#all\/[a-zA-Z0-9]{15,}/, // #all/threadid
            /#trash\/[a-zA-Z0-9]{15,}/, // #trash/threadid
            /#spam\/[a-zA-Z0-9]{15,}/, // #spam/threadid
            /[#\/][a-zA-Z0-9]{16}/, // Any 16-char thread ID
        ];

        // Check URL patterns
        const isEmailURL = emailViewPatterns.some(pattern => {
            const match = pattern.test(url);
            if (match) console.log('PhishGuard: URL pattern matched:', pattern);
            return match;
        });

        // Most reliable DOM indicator: actual email body content
        const hasEmailBody = !!document.querySelector('.ii.gt');

        // Email header with sender information
        const hasEmailHeader = !!document.querySelector('.gD'); // Sender details (most reliable)

        // Subject line present
        const hasSubject = !!document.querySelector('.hP') || !!document.querySelector('.bog');

        // Thread container
        const hasThreadContainer = !!document.querySelector('[data-thread-perm-id]');

        // Email toolbar (reply, forward, etc buttons)
        const hasEmailToolbar = !!document.querySelector('[aria-label*="Reply"]') ||
                               !!document.querySelector('[data-tooltip*="Reply"]');

        // Check if we're in inbox list view (should see conversation list but NOT email body)
        const conversationList = document.querySelector('.ae4.UI') || document.querySelector('.Cp');
        const isInboxList = conversationList && !hasEmailBody && !hasEmailHeader;

        // Email view detection: need at least email body OR (header + subject)
        const hasEmailView = hasEmailBody || (hasEmailHeader && hasSubject) ||
                            (hasThreadContainer && hasEmailHeader);

        // Final decision
        const result = hasEmailView && !isInboxList;

        console.log('PhishGuard: Email detection result:', {
            url,
            isEmailURL,
            hasEmailBody,
            hasEmailHeader,
            hasSubject,
            hasThreadContainer,
            hasEmailToolbar,
            isInboxList,
            hasEmailView,
            finalResult: result,
            debugSelectors: {
                emailBody: !!document.querySelector('.ii.gt'),
                senderDetails: !!document.querySelector('.gD'),
                subject: !!document.querySelector('.hP'),
                threadContainer: !!document.querySelector('[data-thread-perm-id]')
            }
        });

        return result;
    }
    
    getEmailDetectionDebugInfo() {
        const url = window.location.href;
        return {
            url,
            hasEmailBody: !!document.querySelector('.ii.gt'),
            hasThreadContainer: !!document.querySelector('[data-thread-perm-id]'),
            hasEmailHeader: !!document.querySelector('.gH'),
            hasSenderInfo: !!document.querySelector('.gD'),
            hasSubject: !!document.querySelector('.hP'),
            isComposing: !!(document.querySelector('.M9') || url.includes('#compose')),
            hasInboxList: !!document.querySelector('.ae4.UI'),
            allEmailElements: this.getAllEmailElements()
        };
    }
    
    getAllEmailElements() {
        const selectors = ['.ii.gt', '[data-thread-perm-id]', '.adn.ads', '.h7', '.adf.ads', '.gs', '.hP', '.bog', '.gH', '.go', '.gD'];
        return selectors.filter(selector => document.querySelector(selector));
    }
    
    injectScanButton() {
        // Remove existing button first
        this.removeScanButton();
        
        // Don't inject if not viewing a specific email
        if (!this.isViewingSpecificEmail()) {
            return;
        }
        
        // Find email-specific toolbar with multiple fallback options
        const possibleToolbars = [
            '.ar9.T-I-J3.J-J5-Ji', // Email actions toolbar
            '.adf.ads', // Email header toolbar  
            '.amn', // Alternative email toolbar
            '[role="toolbar"]', // Generic toolbar
            '.gH', // Email header area
            '.adn.ads', // Email header container
            '.ams' // Email toolbar container
        ];
        
        let emailToolbar = null;
        for (const selector of possibleToolbars) {
            emailToolbar = document.querySelector(selector);
            if (emailToolbar && this.isElementInEmailView(emailToolbar)) {
                break;
            }
        }
        
        if (emailToolbar) {
            const scanButton = this.createScanButton();
            
            // Try to insert at the beginning of the toolbar for better visibility
            if (emailToolbar.firstChild) {
                emailToolbar.insertBefore(scanButton, emailToolbar.firstChild);
            } else {
                emailToolbar.appendChild(scanButton);
            }
            
            console.log('🛡️ PhishGuard scan button injected in email view');
        } else {
            console.warn('PhishGuard: Could not find suitable toolbar for button injection');
        }
    }
    
    isElementInEmailView(element) {
        // Check if the element is actually part of an email view (not compose, etc.)
        const emailContent = document.querySelector('.ii.gt') || 
                             document.querySelector('[data-thread-perm-id]');
        return emailContent && emailContent.contains(element) || 
               element.closest('[data-thread-perm-id]') ||
               element.closest('.h7'); // Email container
    }
    
    removeScanButton() {
        const existingButton = document.querySelector('#phishguard-scan-btn');
        if (existingButton) {
            existingButton.remove();
        }
    }
    
    injectScanButton_old() {
        // Find Gmail toolbar and inject scan button
        const toolbar = document.querySelector('.T-I.T-I-KE.L3') || 
                       document.querySelector('[role="toolbar"]');
        
        if (toolbar && !document.querySelector('#phishguard-scan-btn')) {
            const scanButton = this.createScanButton();
            toolbar.appendChild(scanButton);
        }
    }
    
    createScanButton() {
        const button = document.createElement('div');
        button.id = 'phishguard-scan-btn';
        button.className = 'phishguard-scan-button';
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', '0');
        button.setAttribute('title', 'Scan this email for phishing threats with PhishGuard 360');
        
        button.innerHTML = `
            <div class="scan-btn-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z" 
                          stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                <span>Scan Email</span>
            </div>
        `;
        
        // Add click and keyboard event listeners
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.startEmailScan();
        });
        
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                this.startEmailScan();
            }
        });
        
        return button;
    }
    
    setupEmailObserver() {
        // Debounced check to prevent infinite loops
        const debouncedCheck = () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.checkAndInjectScanButton();
            }, 500); // Wait 500ms after last change before checking
        };

        // Monitor URL changes for Gmail navigation (more reliable than DOM mutations)
        let lastUrl = location.href;
        setInterval(() => {
            const url = location.href;
            if (url !== lastUrl) {
                console.log('PhishGuard: URL changed, checking email view');
                lastUrl = url;
                this.lastCheckedUrl = url;
                debouncedCheck();
            }
        }, 1000); // Check every second for URL changes

        // Initial check
        debouncedCheck();
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+S to scan current email
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.startEmailScan();
            }
        });
    }
    
    async startEmailScan() {
        if (this.scanInProgress) return;

        const emailData = this.extractCurrentEmailData();
        if (!emailData) {
            this.showNotification('No email selected for scanning', 'warning');
            return;
        }

        // Store current email data for sidebar
        this.currentEmailData = emailData;

        this.scanInProgress = true;
        this.updateScanButtonState();
        this.injectSidebar();

        try {
            await this.performSecurityScan(emailData);
        } catch (error) {
            console.error('Scan failed:', error);
            this.showNotification('Scan failed: ' + error.message, 'error');
            this.scanInProgress = false;
            this.updateScanButtonState();
        }
    }
    
    extractCurrentEmailData() {
        // Only extract data if we're viewing a specific email
        if (!this.isViewingSpecificEmail()) {
            return null;
        }
        
        // Extract email content from Gmail interface with multiple selectors
        const emailSubject = document.querySelector('[data-thread-perm-id] h2')?.textContent ||
                            document.querySelector('.hP')?.textContent ||
                            document.querySelector('.bog')?.textContent ||
                            document.querySelector('[role="heading"]')?.textContent;
        
        const emailSender = document.querySelector('.gD')?.getAttribute('email') ||
                           document.querySelector('.go span')?.getAttribute('email') ||
                           document.querySelector('.yW span')?.getAttribute('email') ||
                           document.querySelector('[email]')?.getAttribute('email');
        
        const emailBody = document.querySelector('.ii.gt div')?.innerHTML ||
                         document.querySelector('[role="listitem"] .ii.gt')?.innerHTML ||
                         document.querySelector('.a3s.aiL')?.innerHTML ||
                         document.querySelector('.ii.gt')?.innerHTML;
        
        const emailDate = document.querySelector('.g3')?.getAttribute('title') ||
                         document.querySelector('.gH .g3')?.textContent ||
                         new Date().toISOString();
        
        if (!emailSubject || !emailSender) {
            console.warn('PhishGuard: Could not extract email data - missing subject or sender');
            return null;
        }
        
        const emailData = {
            subject: emailSubject.trim(),
            sender: emailSender.trim(),
            body: this.cleanEmailBody(emailBody),
            date: emailDate,
            url: window.location.href,
            timestamp: Date.now()
        };
        
        console.log('PhishGuard: Extracted email data:', { 
            subject: emailData.subject, 
            sender: emailData.sender,
            bodyLength: emailData.body.length 
        });
        
        return emailData;
    }
    
    cleanEmailBody(rawBody) {
        if (!rawBody) return '';
        
        // Remove HTML tags and clean up text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawBody;
        
        // Remove script tags and other dangerous content
        const scripts = tempDiv.querySelectorAll('script, style, link');
        scripts.forEach(script => script.remove());
        
        return tempDiv.textContent || tempDiv.innerText || '';
    }
    
    async performSecurityScan(emailData) {
        try {
            console.log('PhishGuard: Sending scan request to background script');

            // Send scan request to background script (which will call Flask API)
            const response = await chrome.runtime.sendMessage({
                type: 'PERFORM_SCAN',
                emailData: emailData,
                userId: await this.getUserId()
            });

            if (!response || !response.success) {
                throw new Error(response?.error || 'Scan failed');
            }

            console.log('PhishGuard: Scan completed successfully', response.data);
            this.displayScanResults(response.data);

            // Mark scan as complete
            this.scanInProgress = false;
            this.updateScanButtonState();

        } catch (error) {
            console.error('Backend communication failed:', error);
            throw error; // Propagate error to startEmailScan
        }
    }
    
    async getUserId() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['userId'], (result) => {
                resolve(result.userId || 'anonymous_' + Date.now());
            });
        });
    }
    
    injectSidebar() {
        if (this.sidebarInjected) {
            this.showSidebar();
            // Send email data again when reshowing
            this.sendEmailDataToSidebar();
            return;
        }

        const sidebarContainer = document.createElement('div');
        sidebarContainer.id = 'phishguard-sidebar';
        sidebarContainer.innerHTML = `
            <iframe src="${chrome.runtime.getURL('sidebar/sidebar.html')}"
                    frameborder="0"
                    width="100%"
                    height="100%">
            </iframe>
        `;

        document.body.appendChild(sidebarContainer);
        this.sidebarInjected = true;

        // Wait for iframe to load before sending data
        const iframe = sidebarContainer.querySelector('iframe');
        iframe.addEventListener('load', () => {
            console.log('PhishGuard: Sidebar iframe loaded');
            this.sendEmailDataToSidebar();
        });
    }

    showSidebar() {
        const sidebar = document.querySelector('#phishguard-sidebar');
        if (sidebar) {
            sidebar.style.display = 'block';
            sidebar.classList.add('phishguard-sidebar-visible');
        }
    }

    closeSidebar() {
        const sidebar = document.querySelector('#phishguard-sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
            sidebar.classList.remove('phishguard-sidebar-visible');
        }
        this.scanInProgress = false;
        this.updateScanButtonState();
    }

    sendEmailDataToSidebar() {
        // Send current email data to sidebar
        const sidebar = document.querySelector('#phishguard-sidebar iframe');
        if (sidebar && sidebar.contentWindow && this.currentEmailData) {
            console.log('PhishGuard: Sending email data to sidebar');
            sidebar.contentWindow.postMessage({
                type: 'START_SCAN',
                emailData: this.currentEmailData
            }, '*');
        }
    }

    displayScanResults(scanResult) {
        // Send results to sidebar iframe
        const sidebar = document.querySelector('#phishguard-sidebar iframe');
        if (sidebar && sidebar.contentWindow) {
            console.log('PhishGuard: Sending scan results to sidebar');
            sidebar.contentWindow.postMessage({
                type: 'SCAN_RESULTS',
                data: scanResult
            }, '*');
        } else {
            console.error('PhishGuard: Sidebar iframe not ready to receive results');
        }
    }
    
    updateScanButtonState() {
        // First check if we should show the button at all
        if (!this.isViewingSpecificEmail()) {
            this.removeScanButton();
            return;
        }
        
        // Make sure button exists if we're viewing an email
        if (!document.querySelector('#phishguard-scan-btn')) {
            this.injectScanButton();
        }
        
        const button = document.querySelector('#phishguard-scan-btn');
        if (!button) return;
        
        if (this.scanInProgress) {
            button.classList.add('scanning');
            button.querySelector('span').textContent = 'Scanning...';
        } else {
            button.classList.remove('scanning');
            button.querySelector('span').textContent = 'Scan Email';
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `phishguard-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('visible');
        }, 100);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

    // Store global instance
    let phishGuardInstance = null;

    // Initialize when DOM is ready
    function initializePhishGuard() {
        if (!phishGuardInstance) {
            phishGuardInstance = new PhishGuardScanner();
            window.phishGuardScanner = phishGuardInstance; // Global access for debugging
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePhishGuard);
    } else {
        initializePhishGuard();
    }

    // Handle dynamic Gmail navigation
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            if (phishGuardInstance) {
                phishGuardInstance.checkAndInjectScanButton();
            }
        }, 1000);
    });

} // End of initialization guard