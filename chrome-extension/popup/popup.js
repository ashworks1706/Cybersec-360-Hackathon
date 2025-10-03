// PhishGuard 360 - Popup JavaScript
// Main popup interface for extension management

class PhishGuardPopup {
    constructor() {
        this.settings = {};
        this.scanHistory = [];
        
        this.initializeElements();
        this.loadData();
        this.setupEventListeners();
        
        console.log('🛡️ PhishGuard Popup initialized');
    }
    
    initializeElements() {
        // Status elements
        this.protectionStatus = document.getElementById('protectionStatus');
        this.emailsScanned = document.getElementById('emailsScanned');
        this.threatsBlocked = document.getElementById('threatsBlocked');
        
        // Action buttons
        this.scanCurrentEmail = document.getElementById('scanCurrentEmail');
        this.viewHistory = document.getElementById('viewHistory');
        
        // Recent scans
        this.recentScansList = document.getElementById('recentScansList');
        
        // Settings toggles
        this.autoScanToggle = document.getElementById('autoScanToggle');
        this.notificationsToggle = document.getElementById('notificationsToggle');
        
        // Footer links
        this.settingsLink = document.getElementById('settingsLink');
        this.helpLink = document.getElementById('helpLink');
        this.aboutLink = document.getElementById('aboutLink');
    }
    
    async loadData() {
        try {
            // Load settings from storage
            this.settings = await this.getStorageData();
            this.updateUI();
            
            // Load scan history
            this.scanHistory = await this.getScanHistory();
            this.updateRecentScans();
            
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }
    
    getStorageData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(null, resolve);
        });
    }
    
    getScanHistory() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['scanHistory'], (result) => {
                resolve(result.scanHistory || []);
            });
        });
    }
    
    updateUI() {
        // Update protection status
        if (this.settings.scanEnabled !== false) {
            this.protectionStatus.textContent = 'Active';
            this.protectionStatus.className = 'status-value active';
        } else {
            this.protectionStatus.textContent = 'Disabled';
            this.protectionStatus.className = 'status-value';
        }
        
        // Update statistics
        const totalScans = this.settings.totalScans || 0;
        const threatsBlocked = this.settings.threatsBlocked || 0;
        
        this.emailsScanned.textContent = totalScans.toLocaleString();
        this.threatsBlocked.textContent = threatsBlocked.toLocaleString();
        
        // Update toggles
        this.autoScanToggle.checked = this.settings.autoScanMode || false;
        this.notificationsToggle.checked = this.settings.notificationsEnabled !== false;
    }
    
    updateRecentScans() {
        if (this.scanHistory.length === 0) {
            this.recentScansList.innerHTML = `
                <div class="empty-state">
                    <p>No recent scans</p>
                    <span>Start scanning emails to see results here</span>
                </div>
            `;
            return;
        }
        
        // Show last 5 scans
        const recentScans = this.scanHistory.slice(0, 5);
        
        this.recentScansList.innerHTML = recentScans.map(scan => {
            const statusClass = this.getScanStatusClass(scan);
            const statusIcon = this.getScanStatusIcon(scan);
            const timeAgo = this.getTimeAgo(scan.timestamp);
            
            return `
                <div class="scan-item ${statusClass}">
                    <div class="scan-info">
                        <div class="scan-sender">${this.truncateText(scan.emailData?.sender || 'Unknown', 25)}</div>
                        <div class="scan-time">${timeAgo}</div>
                    </div>
                    <div class="scan-status">${statusIcon}</div>
                </div>
            `;
        }).join('');
    }
    
    getScanStatusClass(scan) {
        if (scan.finalVerdict === 'safe') return 'safe';
        if (scan.finalVerdict === 'threat') return 'danger';
        return 'warning';
    }
    
    getScanStatusIcon(scan) {
        if (scan.finalVerdict === 'safe') return '✅';
        if (scan.finalVerdict === 'threat') return '❌';
        return '⚠️';
    }
    
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    setupEventListeners() {
        // Scan current email button
        this.scanCurrentEmail.addEventListener('click', () => {
            this.triggerEmailScan();
        });
        
        // View history button
        this.viewHistory.addEventListener('click', () => {
            this.openHistoryPage();
        });
        
        // Settings toggles
        this.autoScanToggle.addEventListener('change', () => {
            this.updateSetting('autoScanMode', this.autoScanToggle.checked);
        });
        
        this.notificationsToggle.addEventListener('change', () => {
            this.updateSetting('notificationsEnabled', this.notificationsToggle.checked);
        });
        
        // Footer links
        this.settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openSettingsPage();
        });
        
        this.helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openHelpPage();
        });
        
        this.aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAboutPage();
        });
    }
    
    async triggerEmailScan() {
        try {
            // Get current active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentTab = tabs[0];
            
            if (!currentTab.url.includes('mail.google.com') && !currentTab.url.includes('gmail.com')) {
                this.showNotification('Please navigate to Gmail to scan emails', 'warning');
                return;
            }
            
            // Send message to content script to start scan
            await chrome.tabs.sendMessage(currentTab.id, {
                type: 'TRIGGER_SCAN',
                source: 'popup'
            });
            
            // Close popup to show sidebar
            window.close();
            
        } catch (error) {
            console.error('Failed to trigger scan:', error);
            this.showNotification('Failed to start scan. Please refresh Gmail and try again.', 'error');
        }
    }
    
    async updateSetting(key, value) {
        try {
            await chrome.storage.sync.set({ [key]: value });
            this.settings[key] = value;
            
            // Send setting update to background script
            await chrome.runtime.sendMessage({
                type: 'UPDATE_SETTINGS',
                settings: { [key]: value }
            });
            
            this.showNotification('Setting updated', 'success');
            
        } catch (error) {
            console.error('Failed to update setting:', error);
            this.showNotification('Failed to update setting', 'error');
        }
    }
    
    openHistoryPage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('pages/history.html')
        });
    }
    
    openSettingsPage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('pages/settings.html')
        });
    }
    
    openHelpPage() {
        chrome.tabs.create({
            url: 'https://github.com/ashworks1706/Cybersec-360-hackathon#help'
        });
    }
    
    openAboutPage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('pages/about.html')
        });
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `popup-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#ff9800'};
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PhishGuardPopup();
});