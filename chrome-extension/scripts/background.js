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
        
        // Initialize storage with default values
        await this.initializeStorage();
        
        // Set up periodic tasks
        this.setupPeriodicTasks();
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
            chrome.tabs.create({
                url: chrome.runtime.getURL('popup/welcome.html')
            });
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
                    
                case 'SCAN_EMAIL':
                    const scanResult = await this.handleEmailScan(request.emailData);
                    sendResponse({ success: true, data: scanResult });
                    break;
                    
                case 'GET_SCAN_HISTORY':
                    const history = await this.getScanHistory();
                    sendResponse({ success: true, data: history });
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
            chrome.storage.sync.get(['scanHistory'], (result) => {
                resolve(result.scanHistory || []);
            });
        });
    }
    
    async addToScanHistory(scanResult) {
        const history = await this.getScanHistory();
        history.unshift(scanResult);
        
        // Keep only last 100 scans
        if (history.length > 100) {
            history.splice(100);
        }
        
        return new Promise((resolve) => {
            chrome.storage.sync.set({ scanHistory: history }, resolve);
        });
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
    
    showWelcomeNotification() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icon48.png',
            title: 'PhishGuard 360 Installed!',
            message: 'Your email security is now enhanced. Navigate to Gmail to start scanning.'
        });
    }
}

// Initialize background service
new PhishGuardBackground();