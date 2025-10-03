// PhishGuard 360 - Background Service Worker
// Handles extension lifecycle and communication

class PhishGuardBackground {
    constructor() {
        this.setupEventListeners();
        this.initializeExtension();
    }
    
    setupEventListeners() {
        // Extension installation/startup
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });
        
        // Tab updates - detect Gmail navigation
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
        
        // Message passing between content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
        
        // Handle external messages (from web pages)
        chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
            this.handleExternalMessage(request, sender, sendResponse);
        });
    }
    
    async initializeExtension() {
        console.log('🛡️ PhishGuard 360 Background Service Started');

        // Migrate old scan history from sync to local storage (one-time migration)
        await this.migrateScanHistoryToLocal();

        // Initialize storage with default values
        await this.initializeStorage();

        // Set up periodic tasks
        this.setupPeriodicTasks();
    }

    async migrateScanHistoryToLocal() {
        try {
            // Check if we have scan history in sync storage
            const syncData = await new Promise((resolve) => {
                chrome.storage.sync.get(['scanHistory', 'migrationComplete'], resolve);
            });

            if (syncData.migrationComplete) {
                console.log('PhishGuard: Storage migration already completed');
                return;
            }

            if (syncData.scanHistory && syncData.scanHistory.length > 0) {
                console.log(`PhishGuard: Migrating ${syncData.scanHistory.length} scans to local storage...`);

                // Get existing local storage data
                const localData = await new Promise((resolve) => {
                    chrome.storage.local.get(['scanHistory'], resolve);
                });

                // Merge old and new scan history
                const mergedHistory = [...syncData.scanHistory, ...(localData.scanHistory || [])];

                // Store in local storage
                await new Promise((resolve) => {
                    chrome.storage.local.set({ scanHistory: mergedHistory }, resolve);
                });

                console.log('PhishGuard: Migration complete');
            }

            // Clear scan history from sync storage and mark migration as complete
            await new Promise((resolve) => {
                chrome.storage.sync.set({
                    scanHistory: [], // Clear the array
                    migrationComplete: true
                }, resolve);
            });

            // Actually remove scanHistory key from sync to free up space
            await new Promise((resolve) => {
                chrome.storage.sync.remove(['scanHistory'], resolve);
            });

            console.log('PhishGuard: Old sync storage cleaned up');

        } catch (error) {
            console.error('PhishGuard: Storage migration failed:', error);
            // Continue anyway - extension should still work
        }
    }
    
    async initializeStorage() {
        const defaultSettings = {
            scanEnabled: true,
            autoScanMode: false,
            notificationsEnabled: true,
            securityLevel: 'medium', // low, medium, high
            userId: 'user_' + Date.now(),
            scanHistory: [],
            blockedSenders: [],
            trustedSenders: []
        };
        
        chrome.storage.sync.get(Object.keys(defaultSettings), (result) => {
            const updates = {};
            
            Object.keys(defaultSettings).forEach(key => {
                if (result[key] === undefined) {
                    updates[key] = defaultSettings[key];
                }
            });
            
            if (Object.keys(updates).length > 0) {
                chrome.storage.sync.set(updates);
            }
        });
    }
    
    handleInstall(details) {
        if (details.reason === 'install') {
            // First-time installation
            this.showWelcomeNotification();
            
            // Optional: Open welcome page if it exists
            try {
                chrome.tabs.create({
                    url: chrome.runtime.getURL('popup/welcome.html')
                }).catch(error => {
                    console.log('Welcome page not available:', error.message);
                });
            } catch (error) {
                console.log('Could not open welcome page:', error.message);
            }
        } else if (details.reason === 'update') {
            // Extension update
            console.log('PhishGuard updated to version:', chrome.runtime.getManifest().version);
        }
    }
    
    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            const isGmailTab = tab.url.includes('mail.google.com') || 
                              tab.url.includes('gmail.com');
            
            if (isGmailTab) {
                // Inject content script if not already injected
                this.ensureContentScriptInjected(tabId);
                
                // Update extension badge
                chrome.action.setBadgeText({
                    tabId: tabId,
                    text: '🛡️'
                });
                
                chrome.action.setBadgeBackgroundColor({
                    color: '#667eea'
                });
            }
        }
    }
    
    async ensureContentScriptInjected(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['scripts/content.js']
            });
        } catch (error) {
            // Content script might already be injected
            console.log('Content script injection skipped:', error.message);
        }
    }
    
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.type) {
                case 'GET_SETTINGS':
                    const settings = await this.getSettings();
                    sendResponse({ success: true, data: settings });
                    break;

                case 'UPDATE_SETTINGS':
                    await this.updateSettings(request.settings);
                    sendResponse({ success: true });
                    break;

                case 'PERFORM_SCAN':
                    // NEW: Proxy API call to Flask backend
                    const scanResult = await this.performBackendScan(request.emailData, request.userId);
                    sendResponse({ success: true, data: scanResult });
                    break;

                case 'SCAN_EMAIL':
                    const localScanResult = await this.handleEmailScan(request.emailData);
                    sendResponse({ success: true, data: localScanResult });
                    break;

                case 'GET_SCAN_HISTORY':
                    const history = await this.getScanHistory();
                    sendResponse({ success: true, data: history });
                    break;

                case 'FETCH_BACKEND_SCAN_HISTORY':
                    // NEW: Proxy API call to get scan history from backend
                    const backendHistory = await this.fetchBackendScanHistory(request.userId, request.limit, request.offset);
                    sendResponse({ success: true, data: backendHistory });
                    break;

                case 'ADD_TRUSTED_SENDER':
                    await this.addTrustedSender(request.sender);
                    sendResponse({ success: true });
                    break;

                case 'BLOCK_SENDER':
                    await this.blockSender(request.sender);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Message handling error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    handleExternalMessage(request, sender, sendResponse) {
        // Handle messages from web pages (if needed)
        console.log('External message received:', request);
        sendResponse({ status: 'received' });
    }
    
    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(null, resolve);
        });
    }
    
    async updateSettings(newSettings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(newSettings, resolve);
        });
    }
    
    async handleEmailScan(emailData) {
        // This method coordinates with the Flask backend
        // For now, we'll simulate the scan process
        
        const scanResult = {
            timestamp: Date.now(),
            emailData: emailData,
            layers: {
                layer1: { status: 'clean', confidence: 0.95 },
                layer2: { status: 'analyzing', confidence: 0.0 },
                layer3: { status: 'pending', confidence: 0.0 }
            },
            finalVerdict: 'analyzing',
            threatLevel: 'unknown'
        };
        
        // Store scan in history
        await this.addToScanHistory(scanResult);
        
        return scanResult;
    }
    
    async getScanHistory() {
        return new Promise((resolve) => {
            // Use LOCAL storage for scan history (larger limit: 5MB vs sync's 100KB)
            chrome.storage.local.get(['scanHistory'], (result) => {
                resolve(result.scanHistory || []);
            });
        });
    }

    async addToScanHistory(scanResult) {
        const history = await this.getScanHistory();
        history.unshift(scanResult);

        // Keep only last 100 scans to prevent storage bloat
        if (history.length > 100) {
            history.splice(100);
        }

        await new Promise((resolve) => {
            // Use LOCAL storage for scan history (avoids quota exceeded errors)
            chrome.storage.local.set({ scanHistory: history }, resolve);
        });

        // Update scan statistics
        await this.updateScanStatistics(scanResult);
    }
    
    async updateScanStatistics(scanResult) {
        // Update total scans and threats blocked counters
        const settings = await this.getSettings();

        const totalScans = (settings.totalScans || 0) + 1;
        let threatsBlocked = settings.threatsBlocked || 0;

        // Check if scan detected a threat (handle both camelCase and snake_case)
        const verdict = scanResult.finalVerdict || scanResult.final_verdict;
        if (verdict === 'threat') {
            threatsBlocked++;
        }

        await new Promise((resolve) => {
            chrome.storage.sync.set({ totalScans, threatsBlocked }, resolve);
        });

        console.log(`📊 Statistics updated: ${totalScans} total scans, ${threatsBlocked} threats blocked`);
    }

    async addTrustedSender(sender) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['trustedSenders'], (result) => {
                const trusted = result.trustedSenders || [];
                if (!trusted.includes(sender)) {
                    trusted.push(sender);
                    chrome.storage.sync.set({ trustedSenders: trusted }, resolve);
                } else {
                    resolve();
                }
            });
        });
    }
    
    async blockSender(sender) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['blockedSenders'], (result) => {
                const blocked = result.blockedSenders || [];
                if (!blocked.includes(sender)) {
                    blocked.push(sender);
                    chrome.storage.sync.set({ blockedSenders: blocked }, resolve);
                } else {
                    resolve();
                }
            });
        });
    }
    
    setupPeriodicTasks() {
        // Update threat intelligence every hour
        setInterval(() => {
            this.updateThreatIntelligence();
        }, 60 * 60 * 1000);
        
        // Clean old scan history daily
        setInterval(() => {
            this.cleanOldScanHistory();
        }, 24 * 60 * 60 * 1000);
    }
    
    async updateThreatIntelligence() {
        console.log('🔄 Updating threat intelligence...');
        // This would sync with backend for latest threat data
    }
    
    async cleanOldScanHistory() {
        const history = await this.getScanHistory();
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        const recentHistory = history.filter(scan => scan.timestamp > oneWeekAgo);
        
        chrome.storage.sync.set({ scanHistory: recentHistory });
    }
    
    async performBackendScan(emailData, userId) {
        /**
         * Proxy method to call Flask backend /api/scan endpoint
         * Background scripts CAN make external API calls (unlike content scripts)
         */
        const backendUrl = 'http://localhost:5000/api/scan';

        try {
            console.log('Background: Calling Flask backend for scan...');

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email_data: emailData,
                    user_id: userId,
                    scan_type: 'full'
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status} ${response.statusText}`);
            }

            const scanResult = await response.json();
            console.log('Background: Scan result received from backend');

            // Also store in local storage for backup
            await this.addToScanHistory(scanResult);

            return scanResult;

        } catch (error) {
            console.error('Background: Flask backend scan failed:', error);
            throw new Error(`Failed to connect to backend: ${error.message}`);
        }
    }

    async fetchBackendScanHistory(userId, limit = 50, offset = 0) {
        /**
         * Proxy method to call Flask backend /api/scan-history endpoint
         */
        const backendUrl = `http://localhost:5000/api/scan-history/${userId}?limit=${limit}&offset=${offset}`;

        try {
            console.log('Background: Fetching scan history from backend...');

            const response = await fetch(backendUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Background: Received ${data.scans?.length || 0} scans from backend`);

            return data;

        } catch (error) {
            console.error('Background: Failed to fetch scan history from backend:', error);
            throw new Error(`Failed to fetch history: ${error.message}`);
        }
    }

    showWelcomeNotification() {
        // Check if notifications API is available
        if (chrome.notifications && chrome.notifications.create) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'assets/icon48.png',
                title: 'PhishGuard 360 Installed!',
                message: 'Your email security is now enhanced. Navigate to Gmail to start scanning.'
            }).catch(error => {
                console.warn('Failed to show welcome notification:', error);
            });
        } else {
            console.log('PhishGuard 360 installed successfully! Notifications not available.');
        }
    }
}

// Initialize background service
new PhishGuardBackground();