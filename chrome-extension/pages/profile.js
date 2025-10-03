// PhishGuard 360 - Profile Page JavaScript

class ProfileManager {
    constructor() {
        this.userId = 'default_user'; // Should be set from extension storage
        this.apiBaseUrl = 'http://localhost:5000/api';
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadUserData();
        
        console.log('🛡️ Profile Manager initialized');
    }
    
    initializeElements() {
        // Tab buttons
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Forms
        this.personalInfoForm = document.getElementById('personalInfoForm');
        this.securitySettingsForm = document.getElementById('securitySettingsForm');
        
        // Contact management
        this.contactName = document.getElementById('contactName');
        this.contactEmail = document.getElementById('contactEmail');
        this.contactRelation = document.getElementById('contactRelation');
        this.addContactBtn = document.getElementById('addContactBtn');
        this.contactsList = document.getElementById('contactsList');
        
        // Organization management
        this.orgName = document.getElementById('orgName');
        this.orgDomain = document.getElementById('orgDomain');
        this.orgType = document.getElementById('orgType');
        this.addOrgBtn = document.getElementById('addOrgBtn');
        this.organizationsList = document.getElementById('organizationsList');
        
        // Navigation
        this.backBtn = document.getElementById('backBtn');
        this.successMessage = document.getElementById('successMessage');
        
        // Current user data
        this.currentUserData = {};
    }
    
    setupEventListeners() {
        // Tab navigation
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        // Form submissions
        this.personalInfoForm.addEventListener('submit', (e) => this.savePersonalInfo(e));
        this.securitySettingsForm.addEventListener('submit', (e) => this.saveSecuritySettings(e));
        
        // Contact management
        this.addContactBtn.addEventListener('click', () => this.addContact());
        this.contactEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addContact();
        });
        
        // Organization management
        this.addOrgBtn.addEventListener('click', () => this.addOrganization());
        this.orgDomain.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addOrganization();
        });
        
        // Navigation
        this.backBtn.addEventListener('click', () => this.goBack());
    }
    
    async loadUserData() {
        try {
            // Get user ID from storage
            const storage = await this.getStorageData();
            this.userId = storage.userId || 'default_user';
            
            // Load user experience data from backend
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/experience`);
            
            if (response.ok) {
                this.currentUserData = await response.json();
                this.populateUI();
            } else {
                console.warn('Failed to load user data, using defaults');
                this.currentUserData = this.getDefaultUserData();
                this.populateUI();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.currentUserData = this.getDefaultUserData();
            this.populateUI();
        }
    }
    
    getDefaultUserData() {
        return {
            user_id: this.userId,
            personal_info: {
                age_group: 'unknown',
                occupation: 'unknown',
                tech_savviness: 'intermediate',
                primary_email_usage: 'personal'
            },
            contacts: [],
            organizations: [],
            risk_profile: {
                overall_risk: 'medium',
                susceptible_to: [],
                awareness_level: 'medium'
            },
            preferences: {
                security_level: 'balanced',
                notification_frequency: 'all',
                auto_scan: true,
                learning_mode: true,
                share_threat_intelligence: true
            }
        };
    }
    
    populateUI() {
        // Populate personal info form
        const personalInfo = this.currentUserData.personal_info || {};
        document.getElementById('ageGroup').value = personalInfo.age_group || 'unknown';
        document.getElementById('occupation').value = personalInfo.occupation || 'unknown';
        document.getElementById('techSavviness').value = personalInfo.tech_savviness || 'intermediate';
        document.getElementById('emailUsage').value = personalInfo.primary_email_usage || 'personal';
        
        // Populate security settings
        const preferences = this.currentUserData.preferences || {};
        document.getElementById('securityLevel').value = preferences.security_level || 'balanced';
        document.getElementById('notificationFreq').value = preferences.notification_frequency || 'all';
        document.getElementById('autoScan').checked = preferences.auto_scan !== false;
        document.getElementById('learningMode').checked = preferences.learning_mode !== false;
        document.getElementById('shareThreats').checked = preferences.share_threat_intelligence !== false;
        
        // Populate contacts list
        this.renderContacts();
        
        // Populate organizations list
        this.renderOrganizations();
    }
    
    renderContacts() {
        const contacts = this.currentUserData.contacts || [];
        
        if (contacts.length === 0) {
            this.contactsList.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">person_add</span>
                    <p>No trusted contacts added yet</p>
                    <span>Add contacts to help detect impersonation attempts</span>
                </div>
            `;
            return;
        }
        
        this.contactsList.innerHTML = contacts.map((contact, index) => `
            <div class="contact-item">
                <div class="contact-info">
                    <div class="contact-name">${this.escapeHtml(contact.name || 'Unknown')}</div>
                    <div class="contact-email">${this.escapeHtml(contact.email || '')}</div>
                    <span class="contact-relation">${this.escapeHtml(contact.relation || 'other')}</span>
                </div>
                <button class="remove-btn" onclick="profileManager.removeContact(${index})">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `).join('');
    }
    
    renderOrganizations() {
        const organizations = this.currentUserData.organizations || [];
        
        if (organizations.length === 0) {
            this.organizationsList.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">add_business</span>
                    <p>No trusted organizations added yet</p>
                    <span>Add organizations to reduce false positives from legitimate emails</span>
                </div>
            `;
            return;
        }
        
        this.organizationsList.innerHTML = organizations.map((org, index) => `
            <div class="org-item">
                <div class="org-info">
                    <div class="org-name">${this.escapeHtml(org.name || 'Unknown')}</div>
                    <div class="org-domain">${this.escapeHtml(org.domain || '')}</div>
                    <span class="org-type">${this.escapeHtml(org.type || 'other')}</span>
                </div>
                <button class="remove-btn" onclick="profileManager.removeOrganization(${index})">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `).join('');
    }
    
    switchTab(tabName) {
        // Update tab buttons
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }
    
    async savePersonalInfo(e) {
        e.preventDefault();
        
        const formData = new FormData(this.personalInfoForm);
        const personalInfo = {
            age_group: formData.get('age_group'),
            occupation: formData.get('occupation'),
            tech_savviness: formData.get('tech_savviness'),
            primary_email_usage: formData.get('primary_email_usage')
        };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personal_info: personalInfo
                })
            });
            
            if (response.ok) {
                this.currentUserData.personal_info = personalInfo;
                this.showSuccessMessage('Personal information updated successfully!');
            } else {
                throw new Error('Failed to save personal information');
            }
        } catch (error) {
            console.error('Failed to save personal info:', error);
            alert('Failed to save personal information. Please try again.');
        }
    }
    
    async saveSecuritySettings(e) {
        e.preventDefault();
        
        const formData = new FormData(this.securitySettingsForm);
        const preferences = {
            security_level: formData.get('security_level'),
            notification_frequency: formData.get('notification_frequency'),
            auto_scan: formData.get('auto_scan') === 'on',
            learning_mode: formData.get('learning_mode') === 'on',
            share_threat_intelligence: formData.get('share_threat_intelligence') === 'on'
        };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    preferences: preferences
                })
            });
            
            if (response.ok) {
                this.currentUserData.preferences = preferences;
                this.showSuccessMessage('Security settings updated successfully!');
                
                // Also save to extension storage for immediate use
                chrome.storage.sync.set({
                    securityLevel: preferences.security_level,
                    autoScanMode: preferences.auto_scan,
                    notificationsEnabled: preferences.notification_frequency !== 'none'
                });
            } else {
                throw new Error('Failed to save security settings');
            }
        } catch (error) {
            console.error('Failed to save security settings:', error);
            alert('Failed to save security settings. Please try again.');
        }
    }
    
    async addContact() {
        const name = this.contactName.value.trim();
        const email = this.contactEmail.value.trim();
        const relation = this.contactRelation.value;
        
        if (!name || !email) {
            alert('Please enter both name and email address');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        const newContact = { name, email, relation };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contacts: [newContact]
                })
            });
            
            if (response.ok) {
                this.currentUserData.contacts = this.currentUserData.contacts || [];
                this.currentUserData.contacts.push(newContact);
                this.renderContacts();
                
                // Clear form
                this.contactName.value = '';
                this.contactEmail.value = '';
                this.contactRelation.value = 'colleague';
                
                this.showSuccessMessage('Contact added successfully!');
            } else {
                throw new Error('Failed to add contact');
            }
        } catch (error) {
            console.error('Failed to add contact:', error);
            alert('Failed to add contact. Please try again.');
        }
    }
    
    async addOrganization() {
        const name = this.orgName.value.trim();
        const domain = this.orgDomain.value.trim().toLowerCase();
        const type = this.orgType.value;
        
        if (!name || !domain) {
            alert('Please enter both organization name and domain');
            return;
        }
        
        if (!this.isValidDomain(domain)) {
            alert('Please enter a valid domain (e.g., company.com)');
            return;
        }
        
        const newOrg = { name, domain, type };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/organizations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    organizations: [newOrg]
                })
            });
            
            if (response.ok) {
                this.currentUserData.organizations = this.currentUserData.organizations || [];
                this.currentUserData.organizations.push(newOrg);
                this.renderOrganizations();
                
                // Clear form
                this.orgName.value = '';
                this.orgDomain.value = '';
                this.orgType.value = 'employer';
                
                this.showSuccessMessage('Organization added successfully!');
            } else {
                throw new Error('Failed to add organization');
            }
        } catch (error) {
            console.error('Failed to add organization:', error);
            alert('Failed to add organization. Please try again.');
        }
    }
    
    removeContact(index) {
        if (confirm('Are you sure you want to remove this contact?')) {
            this.currentUserData.contacts.splice(index, 1);
            this.updateUserProfile();
            this.renderContacts();
            this.showSuccessMessage('Contact removed successfully!');
        }
    }
    
    removeOrganization(index) {
        if (confirm('Are you sure you want to remove this organization?')) {
            this.currentUserData.organizations.splice(index, 1);
            this.updateUserProfile();
            this.renderOrganizations();
            this.showSuccessMessage('Organization removed successfully!');
        }
    }
    
    async updateUserProfile() {
        try {
            await fetch(`${this.apiBaseUrl}/user/${this.userId}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.currentUserData)
            });
        } catch (error) {
            console.error('Failed to update user profile:', error);
        }
    }
    
    showSuccessMessage(message) {
        this.successMessage.querySelector('span:last-child').textContent = message;
        this.successMessage.classList.add('show');
        
        setTimeout(() => {
            this.successMessage.classList.remove('show');
        }, 3000);
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
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(domain);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});