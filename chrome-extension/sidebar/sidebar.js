// PhishGuard 360 - Sidebar JavaScript
// Handles scan result display and user interactions

class PhishGuardSidebar {
    constructor() {
        this.currentScanData = null;
        this.scanInProgress = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupMessageListener();
        
        console.log('🛡️ PhishGuard Sidebar initialized');
    }
    
    initializeElements() {
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusTitle = document.getElementById('statusTitle');
        this.statusMessage = document.getElementById('statusMessage');
        
        // Layer elements
        this.layer1Status = document.getElementById('layer1Status');
        this.layer1Details = document.getElementById('layer1Details');
        this.layer2Status = document.getElementById('layer2Status');
        this.layer2Details = document.getElementById('layer2Details');
        this.layer3Status = document.getElementById('layer3Status');
        this.layer3Details = document.getElementById('layer3Details');
        
        // Verdict elements
        this.finalVerdict = document.getElementById('finalVerdict');
        this.verdictIcon = document.getElementById('verdictIcon');
        this.verdictTitle = document.getElementById('verdictTitle');
        this.verdictMessage = document.getElementById('verdictMessage');
        this.scoreValue = document.getElementById('scoreValue');
        this.scoreCircle = document.getElementById('scoreCircle');
        
        // Action buttons
        this.actionButtons = document.getElementById('actionButtons');
        this.markSafeBtn = document.getElementById('markSafeBtn');
        this.reportPhishBtn = document.getElementById('reportPhishBtn');
        this.blockSenderBtn = document.getElementById('blockSenderBtn');
        
        // Email details
        this.emailSender = document.getElementById('emailSender');
        this.emailSubject = document.getElementById('emailSubject');
        this.emailDate = document.getElementById('emailDate');
        this.scanTime = document.getElementById('scanTime');
        
        // Close button
        this.closeBtn = document.getElementById('closeSidebar');
    }
    
    setupEventListeners() {
        // Close sidebar
        this.closeBtn.addEventListener('click', () => {
            this.closeSidebar();
        });
        
        // Layer card clicks for expanding details
        document.getElementById('layer1').addEventListener('click', () => {
            this.toggleLayerDetails('layer1');
        });
        
        document.getElementById('layer2').addEventListener('click', () => {
            this.toggleLayerDetails('layer2');
        });
        
        document.getElementById('layer3').addEventListener('click', () => {
            this.toggleLayerDetails('layer3');
        });
        
        // Action button clicks
        this.markSafeBtn.addEventListener('click', () => {
            this.markEmailAsSafe();
        });
        
        this.reportPhishBtn.addEventListener('click', () => {
            this.reportPhishing();
        });
        
        this.blockSenderBtn.addEventListener('click', () => {
            this.blockSender();
        });
    }
    
    setupMessageListener() {
        // Listen for messages from content script
        window.addEventListener('message', (event) => {
            if (event.data.type === 'SCAN_RESULTS') {
                this.handleScanResults(event.data.data);
            } else if (event.data.type === 'START_SCAN') {
                this.startScan(event.data.emailData);
            }
        });
    }
    
    startScan(emailData) {
        this.currentScanData = emailData;
        this.scanInProgress = true;
        
        // Update email details
        this.displayEmailDetails(emailData);
        
        // Reset UI to scanning state
        this.resetScanUI();
        
        // Start the scanning animation
        this.animateScanning();
        
        // Simulate scan progression
        this.simulateScanProgress();
    }
    
    displayEmailDetails(emailData) {
        if (emailData.sender) {
            this.emailSender.textContent = emailData.sender;
        }
        if (emailData.subject) {
            this.emailSubject.textContent = emailData.subject;
        }
        if (emailData.date) {
            this.emailDate.textContent = new Date(emailData.date).toLocaleString();
        }
    }
    
    resetScanUI() {
        // Reset status
        this.statusIndicator.className = 'status-indicator scanning';
        this.statusTitle.textContent = 'Analyzing Email Security';
        this.statusMessage.textContent = 'Running multi-layer threat detection...';
        
        // Reset layers
        this.resetLayerStatus('layer1', 'pending');
        this.resetLayerStatus('layer2', 'pending');
        this.resetLayerStatus('layer3', 'pending');
        
        // Hide verdict and actions
        this.finalVerdict.style.display = 'none';
        this.actionButtons.style.display = 'none';
    }
    
    resetLayerStatus(layerId, status) {
        const statusElement = document.getElementById(`${layerId}Status`);
        const detailsElement = document.getElementById(`${layerId}Details`);
        
        statusElement.className = `layer-status ${status}`;
        statusElement.innerHTML = this.getStatusIcon(status);
        detailsElement.style.display = 'none';
    }
    
    getStatusIcon(status) {
        const icons = {
            pending: '<div class="status-icon">⏳</div>',
            scanning: '<div class="spinner"></div>',
            safe: '<div class="status-icon">✅</div>',
            warning: '<div class="status-icon">⚠️</div>',
            danger: '<div class="status-icon">❌</div>'
        };
        return icons[status] || icons.pending;
    }
    
    animateScanning() {
        // Add scanning animation to layers sequentially
        setTimeout(() => {
            this.updateLayerStatus('layer1', 'scanning', 'Checking public databases...');
        }, 500);
        
        setTimeout(() => {
            this.updateLayerStatus('layer2', 'scanning', 'Running AI classification...');
        }, 2000);
        
        setTimeout(() => {
            this.updateLayerStatus('layer3', 'scanning', 'Detective agent analyzing...');
        }, 4000);
    }
    
    updateLayerStatus(layerId, status, message = '') {
        const statusElement = document.getElementById(`${layerId}Status`);
        statusElement.className = `layer-status ${status}`;
        statusElement.innerHTML = this.getStatusIcon(status);
        
        if (message) {
            const layerCard = document.getElementById(layerId);
            const messageElement = layerCard.querySelector('.layer-info p');
            messageElement.textContent = message;
        }
    }
    
    simulateScanProgress() {
        // Simulate Layer 1 completion
        setTimeout(() => {
            this.completeLayer1();
        }, 1500);
        
        // Simulate Layer 2 completion
        setTimeout(() => {
            this.completeLayer2();
        }, 3500);
        
        // Simulate Layer 3 completion
        setTimeout(() => {
            this.completeLayer3();
        }, 6000);
    }
    
    completeLayer1() {
        this.updateLayerStatus('layer1', 'safe');
        
        // Update layer 1 details
        document.getElementById('layer1DbCount').textContent = '5';
        document.getElementById('layer1Confidence').textContent = '95%';
        
        // Update status message
        this.statusMessage.textContent = 'Layer 1 complete - No known threats found';
    }
    
    completeLayer2() {
        const isPhishing = Math.random() > 0.7; // 30% chance of phishing detection
        
        if (isPhishing) {
            this.updateLayerStatus('layer2', 'warning');
            document.getElementById('layer2Confidence').textContent = '78%';
            
            // Add risk indicators
            const indicators = document.getElementById('layer2Indicators');
            indicators.innerHTML = `
                <span class="risk-indicator">Urgent Language</span>
                <span class="risk-indicator">Suspicious Links</span>
                <span class="risk-indicator">External Domain</span>
            `;
            
            this.statusMessage.textContent = 'Layer 2 detected suspicious patterns - Proceeding to Layer 3';
        } else {
            this.updateLayerStatus('layer2', 'safe');
            document.getElementById('layer2Confidence').textContent = '92%';
            this.statusMessage.textContent = 'Layer 2 complete - Email appears legitimate';
        }
    }
    
    completeLayer3() {
        this.updateLayerStatus('layer3', 'warning');
        
        // Update layer 3 details
        document.getElementById('layer3SocialScore').textContent = '65%';
        document.getElementById('layer3Context').textContent = 'Potential impersonation detected';
        document.getElementById('layer3Assessment').textContent = 
            'The email attempts to create urgency around financial matters and uses language patterns consistent with social engineering attacks. Cross-referencing with user profile suggests this is not from a known contact.';
        
        // Complete the scan
        this.completeScan();
    }
    
    completeScan() {
        this.scanInProgress = false;
        
        // Calculate final risk score
        const riskScore = Math.floor(Math.random() * 30) + 60; // 60-90 for demo
        
        // Update status
        this.statusIndicator.className = 'status-indicator warning';
        this.statusTitle.textContent = 'Scan Complete';
        this.statusMessage.textContent = 'Potential phishing attempt detected';
        
        // Show verdict
        this.finalVerdict.style.display = 'block';
        this.verdictIcon.textContent = '⚠️';
        this.verdictTitle.textContent = 'Potential Threat Detected';
        this.verdictMessage.textContent = 'This email shows signs of phishing activity';
        this.scoreValue.textContent = riskScore;
        
        // Update score circle color based on risk
        if (riskScore >= 80) {
            this.scoreCircle.style.background = 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
        } else if (riskScore >= 60) {
            this.scoreCircle.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        } else {
            this.scoreCircle.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        }
        
        // Show action buttons
        this.actionButtons.style.display = 'flex';
        
        // Update scan time
        this.scanTime.textContent = new Date().toLocaleTimeString();
    }
    
    handleScanResults(scanData) {
        console.log('Received scan results:', scanData);
        this.currentScanData = scanData;
        
        // Process and display real scan results from backend
        if (scanData.layers) {
            this.displayLayerResults(scanData.layers);
        }
        
        if (scanData.finalVerdict) {
            this.displayFinalVerdict(scanData);
        }
    }
    
    displayLayerResults(layers) {
        if (layers.layer1) {
            const layer1 = layers.layer1;
            const status = layer1.status === 'clean' ? 'safe' : 
                          layer1.status === 'threat' ? 'danger' : 'warning';
            this.updateLayerStatus('layer1', status);
            document.getElementById('layer1Confidence').textContent = 
                Math.round(layer1.confidence * 100) + '%';
        }
        
        if (layers.layer2) {
            const layer2 = layers.layer2;
            const status = layer2.status === 'clean' ? 'safe' : 
                          layer2.status === 'threat' ? 'danger' : 'warning';
            this.updateLayerStatus('layer2', status);
            document.getElementById('layer2Confidence').textContent = 
                Math.round(layer2.confidence * 100) + '%';
        }
        
        if (layers.layer3) {
            const layer3 = layers.layer3;
            const status = layer3.status === 'clean' ? 'safe' : 
                          layer3.status === 'threat' ? 'danger' : 'warning';
            this.updateLayerStatus('layer3', status);
            
            if (layer3.assessment) {
                document.getElementById('layer3Assessment').textContent = layer3.assessment;
            }
        }
    }
    
    displayFinalVerdict(scanData) {
        this.finalVerdict.style.display = 'block';
        
        const verdict = scanData.finalVerdict;
        const threatLevel = scanData.threatLevel || 'medium';
        
        if (verdict === 'safe') {
            this.verdictIcon.textContent = '✅';
            this.verdictTitle.textContent = 'Email is Safe';
            this.verdictMessage.textContent = 'No threats detected';
            this.statusIndicator.className = 'status-indicator safe';
        } else if (verdict === 'threat') {
            this.verdictIcon.textContent = '❌';
            this.verdictTitle.textContent = 'Threat Detected';
            this.verdictMessage.textContent = 'This email is malicious';
            this.statusIndicator.className = 'status-indicator danger';
        } else {
            this.verdictIcon.textContent = '⚠️';
            this.verdictTitle.textContent = 'Potential Threat';
            this.verdictMessage.textContent = 'Exercise caution with this email';
            this.statusIndicator.className = 'status-indicator warning';
        }
        
        this.actionButtons.style.display = 'flex';
        this.scanTime.textContent = new Date().toLocaleTimeString();
    }
    
    toggleLayerDetails(layerId) {
        const details = document.getElementById(`${layerId}Details`);
        const isVisible = details.style.display === 'block';
        details.style.display = isVisible ? 'none' : 'block';
    }
    
    markEmailAsSafe() {
        this.sendActionToBackground('MARK_SAFE', {
            emailData: this.currentScanData,
            timestamp: Date.now()
        });
        
        this.showActionFeedback('Email marked as safe', 'success');
    }
    
    reportPhishing() {
        this.sendActionToBackground('REPORT_PHISHING', {
            emailData: this.currentScanData,
            timestamp: Date.now()
        });
        
        this.showActionFeedback('Phishing reported', 'success');
    }
    
    blockSender() {
        if (this.currentScanData && this.currentScanData.sender) {
            this.sendActionToBackground('BLOCK_SENDER', {
                sender: this.currentScanData.sender,
                timestamp: Date.now()
            });
            
            this.showActionFeedback('Sender blocked', 'success');
        }
    }
    
    sendActionToBackground(action, data) {
        // Send message to background script
        if (window.chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: action,
                data: data
            });
        }
    }
    
    showActionFeedback(message, type) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = `action-feedback ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4caf50' : '#f44336'};
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }
    
    closeSidebar() {
        // Send message to parent window to hide sidebar
        window.parent.postMessage({
            type: 'CLOSE_SIDEBAR'
        }, '*');
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PhishGuardSidebar();
});