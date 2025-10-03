// PhishGuard 360 - Content Script for Gmail Integration
// Detects Gmail interface and injects security scanning functionality

class PhishGuardScanner {
    constructor() {
        this.isGmailPage = this.detectGmailInterface();
        this.sidebarInjected = false;
        this.currentEmailData = null;
        this.scanInProgress = false;
        
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
        
        // Wait for Gmail to fully load
        this.waitForGmailLoad().then(() => {
            this.setupEmailObserver();
            this.setupKeyboardShortcuts();
            this.checkAndInjectScanButton(); // Only inject when viewing an email
        });
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
        
        // Gmail email view URL patterns
        const emailViewPatterns = [
            /\/mail\/u\/\d+\/#inbox\/[a-zA-Z0-9]+/, // #inbox/threadid
            /\/mail\/u\/\d+\/#sent\/[a-zA-Z0-9]+/,  // #sent/threadid
            /\/mail\/u\/\d+\/#starred\/[a-zA-Z0-9]+/, // #starred/threadid
            /\/mail\/u\/\d+\/#label\/[^\/]+\/[a-zA-Z0-9]+/, // #label/name/threadid
            /\/mail\/.*#.*\/[a-zA-Z0-9]{16}/ // General pattern for thread IDs
        ];
        
        // Check URL patterns
        const isEmailURL = emailViewPatterns.some(pattern => pattern.test(url));
        
        // Check DOM indicators for email view
        const hasEmailContent = document.querySelector('.ii.gt') || // Email body content
                               document.querySelector('[data-thread-perm-id]') || // Thread container
                               document.querySelector('.adn.ads'); // Email header area
        
        // Make sure we're not in compose mode
        const isComposing = document.querySelector('.M9') || // Compose window
                           document.querySelector('[role="dialog"]') || // Compose dialog
                           url.includes('#compose');
        
        // Make sure we're not in inbox list view
        const isInboxList = document.querySelector('.ae4.UI') && // Inbox list container
                           !document.querySelector('.ii.gt'); // No email body content
        
        return (isEmailURL || hasEmailContent) && !isComposing && !isInboxList;
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
        // Monitor for email content changes and navigation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if we've navigated to/from an email view
                    setTimeout(() => {
                        this.checkAndInjectScanButton();
                        this.updateScanButtonState();
                    }, 100);
                }
            });
        });
        
        // Monitor URL changes for Gmail navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(() => {
                    this.checkAndInjectScanButton();
                }, 300); // Give Gmail time to load new content
            }
        }).observe(document, { subtree: true, childList: true });
        
        const emailContainer = document.querySelector('[role="main"]');
        if (emailContainer) {
            observer.observe(emailContainer, {
                childList: true,
                subtree: true
            });
        }
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
        
        this.scanInProgress = true;
        this.updateScanButtonState();
        this.injectSidebar();
        
        try {
            await this.performSecurityScan(emailData);
        } catch (error) {
            console.error('Scan failed:', error);
            this.showNotification('Scan failed. Please try again.', 'error');
        } finally {
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
        const backendUrl = 'http://localhost:5000/api/scan';
        
        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email_data: emailData,
                    user_id: await this.getUserId(),
                    scan_type: 'full'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }
            
            const scanResult = await response.json();
            this.displayScanResults(scanResult);
            
        } catch (error) {
            console.error('Backend communication failed:', error);
            this.showNotification('Could not connect to security backend', 'error');
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
    }
    
    showSidebar() {
        const sidebar = document.querySelector('#phishguard-sidebar');
        if (sidebar) {
            sidebar.style.display = 'block';
            sidebar.classList.add('phishguard-sidebar-visible');
        }
    }
    
    displayScanResults(scanResult) {
        // Send results to sidebar iframe
        const sidebar = document.querySelector('#phishguard-sidebar iframe');
        if (sidebar) {
            sidebar.contentWindow.postMessage({
                type: 'SCAN_RESULTS',
                data: scanResult
            }, '*');
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PhishGuardScanner();
    });
} else {
    new PhishGuardScanner();
}

// Handle dynamic Gmail navigation
window.addEventListener('popstate', () => {
    setTimeout(() => {
        new PhishGuardScanner();
    }, 1000);
});