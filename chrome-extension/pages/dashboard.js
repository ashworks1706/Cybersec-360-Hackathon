// PhishGuard 360 - Dashboard JavaScript

class SecurityDashboard {
    constructor() {
        this.userId = 'default_user';
        this.apiBaseUrl = 'http://localhost:5000/api';
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadDashboardData();
        
        console.log('🛡️ Security Dashboard initialized');
    }
    
    initializeElements() {
        // Metrics
        this.totalScans = document.getElementById('totalScans');
        this.threatsBlocked = document.getElementById('threatsBlocked');
        this.suspiciousEmails = document.getElementById('suspiciousEmails');
        this.protectionScore = document.getElementById('protectionScore');
        
        // Status elements
        this.statusBanner = document.getElementById('statusBanner');
        this.statusIndicator = document.getElementById('statusIndicator');
        
        // Activity and threats
        this.recentActivity = document.getElementById('recentActivity');
        this.recentThreats = document.getElementById('recentThreats');
        this.threatCount = document.getElementById('threatCount');
        
        // Profile summary
        this.techLevel = document.getElementById('techLevel');
        this.contactsCount = document.getElementById('contactsCount');
        this.organizationsCount = document.getElementById('organizationsCount');
        this.securityLevel = document.getElementById('securityLevel');
        
        // Layer status
        this.layer1Status = document.getElementById('layer1Status');
        this.layer2Status = document.getElementById('layer2Status');
        this.layer3Status = document.getElementById('layer3Status');
        this.performanceIndicator = document.getElementById('performanceIndicator');
        
        // Navigation
        this.refreshBtn = document.getElementById('refreshBtn');
        this.backBtn = document.getElementById('backBtn');
        
        // Change indicators
        this.threatChange = document.getElementById('threatChange');
        this.suspiciousChange = document.getElementById('suspiciousChange');
        this.scoreChange = document.getElementById('scoreChange');
    }
    
    setupEventListeners() {
        this.refreshBtn.addEventListener('click', () => this.refreshDashboard());
        this.backBtn.addEventListener('click', () => this.goBack());
        
        // Navigation buttons
        const openGmailBtn = document.getElementById('openGmailBtn');
        const documentsBtn = document.getElementById('documentsBtn');
        const trainingBtn = document.getElementById('trainingBtn');
        const profileBtn = document.getElementById('profileBtn');
        const historyBtn = document.getElementById('historyBtn');
        const viewAllActivityBtn = document.getElementById('viewAllActivityBtn');
        const editProfileBtn = document.getElementById('editProfileBtn');
        
        if (openGmailBtn) {
            openGmailBtn.addEventListener('click', () => {
                chrome.tabs.create({url: 'https://mail.google.com'});
            });
        }
        
        if (documentsBtn) {
            documentsBtn.addEventListener('click', () => {
                window.open('documents.html', '_blank');
            });
        }
        
        if (trainingBtn) {
            trainingBtn.addEventListener('click', () => {
                window.open('training.html', '_blank');
            });
        }
        
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                window.open('profile.html', '_blank');
            });
        }
        
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                window.open('history.html', '_blank');
            });
        }
        
        if (viewAllActivityBtn) {
            viewAllActivityBtn.addEventListener('click', () => {
                window.open('history.html', '_blank');
            });
        }
        
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                window.open('profile.html', '_blank');
            });
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => this.loadDashboardData(), 30000);
    }
    
    async loadDashboardData() {
        try {
            // Get user ID from storage
            const storage = await this.getStorageData();
            this.userId = storage.userId || 'default_user';
            
            // Load dashboard data from backend
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/dashboard`);
            
            if (response.ok) {
                const dashboardData = await response.json();
                this.updateDashboard(dashboardData);
            } else {
                console.warn('Failed to load dashboard data, using local storage');
                this.loadLocalData();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.loadLocalData();
        }
    }
    
    async loadLocalData() {
        // Fallback to extension local storage
        const storage = await this.getStorageData();
        const localData = {
            scan_statistics: {
                total_scans: storage.totalScans || 0,
                threats_blocked: storage.threatsBlocked || 0,
                suspicious_detected: storage.suspiciousDetected || 0,
                safe_emails: storage.safeEmails || 0,
                threat_percentage: 0,
                risk_level: 'low'
            },
            user_profile: {
                personal_info: {
                    tech_savviness: storage.techLevel || 'intermediate'
                },
                contacts_count: 0,
                organizations_count: 0,
                risk_profile: {}
            },
            recent_activity: [],
            recent_threats: [],
            protection_status: 'active'
        };
        
        this.updateDashboard(localData);
    }
    
    updateDashboard(data) {
        // Update metrics
        const stats = data.scan_statistics || {};
        this.totalScans.textContent = (stats.total_scans || 0).toLocaleString();
        this.threatsBlocked.textContent = (stats.threats_blocked || 0).toLocaleString();
        this.suspiciousEmails.textContent = (stats.suspicious_detected || 0).toLocaleString();
        
        // Calculate and display protection score
        const protectionScore = this.calculateProtectionScore(stats);
        this.protectionScore.textContent = protectionScore + '%';
        
        // Update change indicators
        this.updateChangeIndicators(stats);
        
        // Update status banner
        this.updateProtectionStatus(data.protection_status);
        
        // Update recent activity
        this.updateRecentActivity(data.recent_activity || []);
        
        // Update recent threats
        this.updateRecentThreats(data.recent_threats || []);
        
        // Update profile summary
        this.updateProfileSummary(data.user_profile || {});
        
        // Update layer status (assume all active for now)
        this.updateLayerStatus();
    }
    
    calculateProtectionScore(stats) {
        const totalScans = stats.total_scans || 0;
        
        if (totalScans === 0) return 95; // Default high score for new users
        
        const threatPercentage = stats.threat_percentage || 0;
        const hasProfile = stats.profile_completeness || 50; // Assume 50% if not available
        
        // Score based on threat detection rate and profile completeness
        let score = 100 - (threatPercentage * 2); // Reduce score based on threat percentage
        score = Math.max(score, 60); // Minimum score of 60
        score = Math.min(score * (hasProfile / 100), 100); // Adjust for profile completeness
        
        return Math.round(score);
    }
    
    updateChangeIndicators(stats) {
        const threatsBlocked = stats.threats_blocked || 0;
        const suspiciousDetected = stats.suspicious_detected || 0;
        
        // Simple weekly change simulation (would be calculated from historical data)
        const threatChange = Math.max(0, threatsBlocked - 5);
        const suspiciousChange = Math.max(0, suspiciousDetected - 2);
        
        this.threatChange.textContent = `+${threatChange} this week`;
        this.suspiciousChange.textContent = `+${suspiciousChange} this week`;
        
        // Update colors based on changes
        if (threatChange > 0) {
            this.threatChange.style.color = '#f56565';
        } else {
            this.threatChange.style.color = '#48bb78';
            this.threatChange.textContent = 'No new threats';
        }
        
        // Protection score change
        const score = parseInt(this.protectionScore.textContent);
        if (score >= 90) {
            this.scoreChange.textContent = 'Excellent';
            this.scoreChange.style.color = '#48bb78';
        } else if (score >= 75) {
            this.scoreChange.textContent = 'Good';
            this.scoreChange.style.color = '#f6ad55';
        } else {
            this.scoreChange.textContent = 'Needs Improvement';
            this.scoreChange.style.color = '#f56565';
        }
    }
    
    updateProtectionStatus(status) {
        if (status === 'active') {
            this.statusBanner.querySelector('h2').textContent = 'Protection Active';
            this.statusBanner.querySelector('p').textContent = 'Your emails are being monitored by all three security layers';
            this.statusBanner.style.background = 'rgba(72, 187, 120, 0.1)';
            this.statusBanner.style.borderColor = '#48bb78';
            this.statusIndicator.classList.add('active');
        } else {
            this.statusBanner.querySelector('h2').textContent = 'Protection Inactive';
            this.statusBanner.querySelector('p').textContent = 'Email scanning is currently disabled';
            this.statusBanner.style.background = 'rgba(245, 101, 101, 0.1)';
            this.statusBanner.style.borderColor = '#f56565';
            this.statusIndicator.classList.remove('active');
        }
    }
    
    updateRecentActivity(activities) {
        if (activities.length === 0) {
            this.recentActivity.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">email</span>
                    <p>No recent activity</p>
                    <span>Email scans will appear here</span>
                </div>
            `;
            return;
        }
        
        this.recentActivity.innerHTML = activities.slice(0, 5).map(activity => {
            const iconClass = this.getVerdictClass(activity.final_verdict);
            const iconName = this.getVerdictIcon(activity.final_verdict);
            const timeAgo = this.getTimeAgo(new Date(activity.scan_timestamp));
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconClass}">
                        <span class="material-icons">${iconName}</span>
                    </div>
                    <div class="activity-details">
                        <div class="activity-subject">${this.truncateText(activity.email_subject || 'No Subject', 40)}</div>
                        <div class="activity-sender">${this.truncateText(activity.email_sender || 'Unknown', 30)}</div>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        }).join('');
    }
    
    updateRecentThreats(threats) {
        this.threatCount.textContent = `${threats.length} detected`;
        
        if (threats.length === 0) {
            this.recentThreats.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">verified_user</span>
                    <p>No threats detected</p>
                    <span>Great! Your inbox is secure</span>
                </div>
            `;
            this.threatCount.style.background = '#c6f6d5';
            this.threatCount.style.color = '#22543d';
            this.threatCount.textContent = '0 threats';
            return;
        }
        
        this.recentThreats.innerHTML = threats.slice(0, 3).map(threat => {
            const layers = threat.layers || {};
            const layer3 = layers.layer3 || {};
            const tactics = layer3.tactics_identified || [];
            
            return `
                <div class="threat-item">
                    <div class="threat-header">
                        <span class="threat-type">${threat.final_verdict.toUpperCase()}</span>
                        <span style="font-size: 0.75rem; color: #742a2a;">${this.getTimeAgo(new Date(threat.scan_timestamp))}</span>
                    </div>
                    <div class="threat-details">
                        <strong>From:</strong> ${this.truncateText(threat.email_sender, 30)}<br>
                        <strong>Subject:</strong> ${this.truncateText(threat.email_subject, 40)}<br>
                        <strong>Tactics:</strong> ${tactics.slice(0, 2).join(', ') || 'Unknown'}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateProfileSummary(profile) {
        const personalInfo = profile.personal_info || {};
        
        this.techLevel.textContent = this.formatTechLevel(personalInfo.tech_savviness || 'intermediate');
        this.contactsCount.textContent = (profile.contacts_count || 0).toString();
        this.organizationsCount.textContent = (profile.organizations_count || 0).toString();
        
        // Get security level from extension storage
        this.getStorageData().then(storage => {
            this.securityLevel.textContent = this.formatSecurityLevel(storage.securityLevel || 'balanced');
        });
    }
    
    updateLayerStatus() {
        // For now, assume all layers are active
        // In a real implementation, you'd check layer health
        const layers = [this.layer1Status, this.layer2Status, this.layer3Status];
        
        layers.forEach(layer => {
            layer.classList.add('active');
            layer.classList.remove('inactive');
            layer.querySelector('.material-icons').textContent = 'check_circle';
        });
        
        this.performanceIndicator.innerHTML = `
            <span class="indicator-dot active"></span>
            <span>All Systems Active</span>
        `;
        this.performanceIndicator.style.color = '#48bb78';
    }
    
    async refreshDashboard() {
        this.refreshBtn.disabled = true;
        this.refreshBtn.querySelector('.material-icons').style.animation = 'spin 1s linear infinite';
        
        await this.loadDashboardData();
        
        setTimeout(() => {
            this.refreshBtn.disabled = false;
            this.refreshBtn.querySelector('.material-icons').style.animation = '';
        }, 1000);
    }
    
    goBack() {
        if (chrome.tabs) {
            chrome.tabs.getCurrent((tab) => {
                chrome.tabs.remove(tab.id);
            });
        } else {
            window.close();
        }
    }
    
    // Utility functions
    getStorageData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(null, resolve);
        });
    }
    
    getVerdictClass(verdict) {
        switch (verdict) {
            case 'threat': return 'threat';
            case 'suspicious': return 'suspicious';
            case 'safe': return 'safe';
            default: return 'safe';
        }
    }
    
    getVerdictIcon(verdict) {
        switch (verdict) {
            case 'threat': return 'dangerous';
            case 'suspicious': return 'warning';
            case 'safe': return 'check_circle';
            default: return 'help';
        }
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return `${Math.floor(diffInDays / 7)}w ago`;
    }
    
    truncateText(text, maxLength) {
        if (!text) return 'Unknown';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    formatTechLevel(level) {
        const levels = {
            'beginner': 'Beginner',
            'basic': 'Basic',
            'intermediate': 'Intermediate',
            'advanced': 'Advanced',
            'expert': 'Expert'
        };
        return levels[level] || 'Intermediate';
    }
    
    formatSecurityLevel(level) {
        const levels = {
            'relaxed': 'Relaxed',
            'balanced': 'Balanced',
            'strict': 'Strict',
            'paranoid': 'Paranoid'
        };
        return levels[level] || 'Balanced';
    }
}

// Add CSS animation for refresh button
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.securityDashboard = new SecurityDashboard();
});