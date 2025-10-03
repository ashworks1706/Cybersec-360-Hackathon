// PhishGuard 360 - Sidebar JavaScript
// Handles scan result display and user interactions

class PhishGuardSidebar {
    constructor() {
        this.currentScanData = null;
        this.scanInProgress = false;
        this.scanProgress = 0;
        this.currentStep = null;
        this.scanStartTime = null;
        this.resultsReceived = false; // Track if we've already received and processed scan results

        // Timer IDs for simulation (so we can cancel them when real results arrive)
        this.simulationTimers = [];
        this.progressTimer = null;

        // Step definitions with progress percentages
        this.scanSteps = {
            'preprocessing': { progress: 10, duration: 1000 },
            'layer1': { progress: 30, duration: 2000 },
            'layer2': { progress: 60, duration: 3000 },
            'layer3': { progress: 85, duration: 4000 },
            'finalization': { progress: 100, duration: 1000 }
        };

        this.initializeElements();
        this.setupEventListeners();
        this.setupMessageListener();

        console.log('[PhishGuard] Sidebar initialized');

        // Notify parent window that sidebar is ready to receive messages
        this.notifyReady();
    }

    notifyReady() {
        // Send SIDEBAR_READY message to parent (content script)
        console.log('[PhishGuard Sidebar] Sending SIDEBAR_READY signal to parent');
        window.parent.postMessage({
            type: 'SIDEBAR_READY'
        }, '*');
    }
    
    initializeElements() {
        // Status elements
        this.statusTitle = document.getElementById('statusTitle');
        this.statusMessage = document.getElementById('statusMessage');
        this.statusIndicator = document.getElementById('scanStatus'); // Main scan status container
        
        // Progress elements
        this.progressFill = document.getElementById('progressFill');
        this.progressLabel = document.getElementById('progressLabel');
        
        // Step elements
        this.stepPreprocessing = document.getElementById('step-preprocessing');
        this.stepLayer1 = document.getElementById('step-layer1');
        this.stepLayer2 = document.getElementById('step-layer2');
        this.stepLayer3 = document.getElementById('step-layer3');
        this.stepFinalization = document.getElementById('step-finalization');
        
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
        
        // Detailed results elements
        this.detailedResultsContainer = document.getElementById('detailedResultsContainer');
        this.detailedResultsToggle = document.getElementById('detailedResultsToggle');
        this.detailedResultsContent = document.getElementById('detailedResultsContent');
        
        // Close button
        this.closeBtn = document.getElementById('closeSidebar');
    }
    
    setupEventListeners() {
        // Close sidebar
        this.closeBtn.addEventListener('click', () => {
            this.closeSidebar();
        });

        // View history button
        const viewHistoryBtn = document.getElementById('viewHistoryBtn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                this.openHistory();
            });
        }

        // Layer header clicks for expanding details (using data attributes)
        document.querySelectorAll('.layer-header[data-layer]').forEach(header => {
            header.addEventListener('click', () => {
                const layerId = header.getAttribute('data-layer');
                this.toggleLayerDetails(layerId);
            });
        });

        // Set up collapse button event listener with multiple approaches
        const collapseBtn = document.getElementById('verdictCollapseBtn');
        if (collapseBtn) {
            console.log('Setting up collapse button event listener');
            
            // Primary click handler
            collapseBtn.addEventListener('click', (e) => {
                console.log('Collapse button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.toggleVerdictDetails();
            });

            // Fallback: mousedown event
            collapseBtn.addEventListener('mousedown', (e) => {
                console.log('Collapse button mousedown!');
                e.preventDefault();
                e.stopPropagation();
                this.toggleVerdictDetails();
            });

            // Fallback: touchstart for mobile
            collapseBtn.addEventListener('touchstart', (e) => {
                console.log('Collapse button touchstart!');
                e.preventDefault();
                e.stopPropagation();
                this.toggleVerdictDetails();
            });

            // Test if the button is properly set up
            console.log('Collapse button setup complete:', {
                element: collapseBtn,
                hasClickListener: collapseBtn.onclick !== null,
                classes: collapseBtn.className,
                style: collapseBtn.style.cssText
            });
        } else {
            console.error('Collapse button not found!');
        }

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

        // Detailed results toggle
        if (this.detailedResultsToggle) {
            this.detailedResultsToggle.addEventListener('click', () => {
                this.toggleDetailedResults();
            });
        }

        // Detailed results header click
        const detailedResultsHeader = document.getElementById('detailedResultsHeader');
        if (detailedResultsHeader) {
            detailedResultsHeader.addEventListener('click', () => {
                this.toggleDetailedResults();
            });
        }
    }
    
    setupMessageListener() {
        // Listen for messages from content script
        window.addEventListener('message', (event) => {
            console.log('[PhishGuard Sidebar] Received message:', event.data.type);

            if (event.data.type === 'SCAN_RESULTS') {
                console.log('[PhishGuard Sidebar] Processing scan results:', {
                    has_data: !!event.data.data,
                    has_layers: !!event.data.data?.layers,
                    final_verdict: event.data.data?.final_verdict || event.data.data?.finalVerdict
                });

                // Acknowledge receipt
                window.parent.postMessage({
                    type: 'SCAN_RESULTS_ACK'
                }, '*');

                this.handleScanResults(event.data.data);
            } else if (event.data.type === 'START_SCAN') {
                console.log('[PhishGuard Sidebar] Starting scan with email data:', {
                    has_sender: !!event.data.emailData?.sender,
                    has_subject: !!event.data.emailData?.subject
                });
                this.startScan(event.data.emailData);
            } else {
                console.log('[PhishGuard Sidebar] Ignored message type:', event.data.type);
            }
        });

        console.log('[PhishGuard Sidebar] Message listener setup complete');
    }
    
    startScan(emailData) {
        console.log('[PhishGuard Sidebar] startScan() called with:', {
            sender: emailData?.sender,
            subject: emailData?.subject,
            resultsReceived: this.resultsReceived
        });

        // CRITICAL: If we've already received and processed results, ignore this START_SCAN message
        // This prevents late-arriving START_SCAN from resetting the UI after results are displayed
        if (this.resultsReceived) {
            console.warn('[PhishGuard Sidebar] Ignoring START_SCAN - results already received and displayed');
            return;
        }

        this.currentScanData = emailData;
        this.scanInProgress = true;
        this.scanProgress = 0;
        this.scanStartTime = Date.now();

        // Update email details
        this.displayEmailDetails(emailData);

        // Reset UI to scanning state
        this.resetScanUI();

        // Start the modern scanning animation
        console.log('[PhishGuard Sidebar] Starting modern scanning animation...');
        this.startModernScanning();

        console.log('[PhishGuard Sidebar] Scan UI initialized, waiting for results from backend...');
    }
    
    displayEmailDetails(emailData) {
        if (emailData.sender) {
            this.emailSender.textContent = emailData.sender;
        }
        if (emailData.subject) {
            const fullSubject = emailData.subject;
            const truncatedSubject = this.truncateSubject(fullSubject, 50);
            this.emailSubject.textContent = truncatedSubject;
            this.emailSubject.title = fullSubject; // Tooltip with full subject
        }
        if (emailData.date) {
            this.emailDate.textContent = new Date(emailData.date).toLocaleString();
        }
    }

    truncateSubject(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    resetScanUI() {
        // Reset results received flag for new scan
        this.resultsReceived = false;

        // Reset status
        this.statusTitle.textContent = 'Analyzing Email Security';
        this.statusMessage.textContent = 'Initializing multi-layer threat detection...';

        // Reset progress
        this.updateProgress(0, 'Initializing...');
        
        // Reset all steps
        this.resetAllSteps();
        
        // Hide old layer cards during scanning
        const layerResults = document.getElementById('layerResults');
        if (layerResults) {
            layerResults.style.display = 'none';
        }
        
        // Hide risk score display
        const riskScoreDisplay = document.getElementById('riskScoreDisplay');
        if (riskScoreDisplay) {
            riskScoreDisplay.style.display = 'none';
        }
        
        // Hide detailed results
        if (this.detailedResultsContainer) {
            this.detailedResultsContainer.style.display = 'none';
        }
        
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
            pending: '<i data-lucide="loader-2" class="status-icon pending"></i>',
            scanning: '<div class="spinner"></div>',
            safe: '<i data-lucide="check-circle" class="status-icon safe"></i>',
            warning: '<i data-lucide="alert-triangle" class="status-icon warning"></i>',
            danger: '<i data-lucide="x-circle" class="status-icon danger"></i>'
        };
        return icons[status] || icons.pending;
    }
    
    clearSimulationTimers() {
        // Cancel all pending simulation timers
        this.simulationTimers.forEach(timerId => clearTimeout(timerId));
        this.simulationTimers = [];
        
        // Clear progress timer
        if (this.progressTimer) {
            clearTimeout(this.progressTimer);
            this.progressTimer = null;
        }
        
        console.log('PhishGuard Sidebar: Cleared all simulation timers');
    }

    startModernScanning() {
        // Start with preprocessing step
        this.activateStep('preprocessing');
        
        // Simulate preprocessing
        const timer1 = setTimeout(() => {
            if (this.scanInProgress) {
                this.completeStep('preprocessing', 'Email content extracted successfully');
                this.activateStep('layer1');
            }
        }, this.scanSteps.preprocessing.duration);
        this.simulationTimers.push(timer1);
        
        // Simulate Layer 1
        const timer2 = setTimeout(() => {
            if (this.scanInProgress) {
                this.completeStep('layer1', 'Database check completed - No known threats');
                this.activateStep('layer2');
            }
        }, this.scanSteps.preprocessing.duration + this.scanSteps.layer1.duration);
        this.simulationTimers.push(timer2);
        
        // Simulate Layer 2
        const timer3 = setTimeout(() => {
            if (this.scanInProgress) {
                this.completeStep('layer2', 'AI classification completed - Proceeding to advanced analysis');
                this.activateStep('layer3');
            }
        }, this.scanSteps.preprocessing.duration + this.scanSteps.layer1.duration + this.scanSteps.layer2.duration);
        this.simulationTimers.push(timer3);
        
        // Simulate Layer 3
        const timer4 = setTimeout(() => {
            if (this.scanInProgress) {
                this.completeStep('layer3', 'Advanced analysis completed');
                this.activateStep('finalization');
            }
        }, this.scanSteps.preprocessing.duration + this.scanSteps.layer1.duration + this.scanSteps.layer2.duration + this.scanSteps.layer3.duration);
        this.simulationTimers.push(timer4);
        
        // Finalization
        const timer5 = setTimeout(() => {
            if (this.scanInProgress) {
                this.completeStep('finalization', 'Security assessment complete');
            }
        }, this.scanSteps.preprocessing.duration + this.scanSteps.layer1.duration + this.scanSteps.layer2.duration + this.scanSteps.layer3.duration + this.scanSteps.finalization.duration);
        this.simulationTimers.push(timer5);
    }

    updateLayerStatus(layerId, status, message = '') {
        const statusElement = document.getElementById(`${layerId}Status`);
        statusElement.className = `layer-status ${status}`;
        statusElement.innerHTML = this.getStatusIcon(status);

        // Reinitialize Lucide icons for the new icon
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        if (message) {
            const layerCard = document.getElementById(layerId);
            const messageElement = layerCard.querySelector('.layer-info p');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }
    
    // New modern scanning methods
    activateStep(stepId) {
        const stepElement = document.getElementById(`step-${stepId}`);
        if (!stepElement) return;
        
        this.currentStep = stepId;
        stepElement.classList.add('active');
        
        // Update step status icon
        const statusIcon = stepElement.querySelector('.step-status .material-icons');
        if (statusIcon) {
            statusIcon.className = 'material-icons step-icon-active';
            statusIcon.textContent = 'sync';
        }
        
        // Update progress
        this.updateProgress(this.scanSteps[stepId].progress, this.getStepDescription(stepId));
        
        console.log(`[PhishGuard] Activated step: ${stepId}`);
    }
    
    completeStep(stepId, message = '') {
        const stepElement = document.getElementById(`step-${stepId}`);
        if (!stepElement) return;
        
        stepElement.classList.remove('active');
        stepElement.classList.add('completed');
        
        // Update step status icon
        const statusIcon = stepElement.querySelector('.step-status .material-icons');
        if (statusIcon) {
            statusIcon.className = 'material-icons step-icon-completed';
            statusIcon.textContent = 'check_circle';
        }
        
        // Update step description if message provided
        if (message) {
            const descriptionElement = stepElement.querySelector('.step-description');
            if (descriptionElement) {
                descriptionElement.textContent = message;
            }
        }
        
        // Show risk score after final assessment is complete
        if (stepId === 'finalization') {
            setTimeout(() => {
                this.showRiskScore();
            }, 500); // Small delay for better UX
        }
        
        console.log(`[PhishGuard] Completed step: ${stepId}`);
    }
    
    threatDetectedStep(stepId, message = '') {
        const stepElement = document.getElementById(`step-${stepId}`);
        if (!stepElement) return;
        
        stepElement.classList.remove('active');
        stepElement.classList.add('threat-detected');
        
        // Update step status icon
        const statusIcon = stepElement.querySelector('.step-status .material-icons');
        if (statusIcon) {
            statusIcon.className = 'material-icons step-icon-threat';
            statusIcon.textContent = 'warning';
        }
        
        // Update step description if message provided
        if (message) {
            const descriptionElement = stepElement.querySelector('.step-description');
            if (descriptionElement) {
                descriptionElement.textContent = message;
            }
        }
        
        console.log(`[PhishGuard] Threat detected at step: ${stepId}`);
    }
    
    skipStep(stepId, reason = '') {
        const stepElement = document.getElementById(`step-${stepId}`);
        if (!stepElement) return;
        
        stepElement.classList.remove('active');
        
        // Update step status icon
        const statusIcon = stepElement.querySelector('.step-status .material-icons');
        if (statusIcon) {
            statusIcon.className = 'material-icons step-icon-skipped';
            statusIcon.textContent = 'skip_next';
        }
        
        // Update step description
        const descriptionElement = stepElement.querySelector('.step-description');
        if (descriptionElement && reason) {
            descriptionElement.textContent = reason;
        }
        
        console.log(`[PhishGuard] Skipped step: ${stepId} - ${reason}`);
    }
    
    updateProgress(percentage, message = '') {
        this.scanProgress = percentage;
        
        if (this.progressFill) {
            this.progressFill.style.width = `${percentage}%`;
        }
        
        if (this.progressLabel) {
            this.progressLabel.textContent = `${Math.round(percentage)}%`;
        }
        
        if (message && this.statusMessage) {
            this.statusMessage.textContent = message;
        }
        
        console.log(`[PhishGuard] Progress updated: ${percentage}% - ${message}`);
    }
    
    getStepDescription(stepId) {
        const descriptions = {
            'preprocessing': 'Extracting and analyzing email content...',
            'layer1': 'Checking against known spam databases...',
            'layer2': 'Running AI classification model...',
            'layer3': 'Advanced social engineering analysis...',
            'finalization': 'Generating comprehensive security report...'
        };
        return descriptions[stepId] || 'Processing...';
    }
    
    resetAllSteps() {
        const stepIds = ['preprocessing', 'layer1', 'layer2', 'layer3', 'finalization'];
        
        stepIds.forEach(stepId => {
            const stepElement = document.getElementById(`step-${stepId}`);
            if (stepElement) {
                stepElement.classList.remove('active', 'completed', 'threat-detected');
                
                const statusIcon = stepElement.querySelector('.step-status .material-icons');
                if (statusIcon) {
                    statusIcon.className = 'material-icons step-icon-pending';
                    statusIcon.textContent = 'pending';
                }
                
                const descriptionElement = stepElement.querySelector('.step-description');
                if (descriptionElement) {
                    descriptionElement.textContent = this.getStepDescription(stepId);
                }
            }
        });
    }
    
    showRiskScore() {
        const riskScoreDisplay = document.getElementById('riskScoreDisplay');
        const overallRiskScore = document.getElementById('overallRiskScore');
        const riskScoreDescription = document.getElementById('riskScoreDescription');

        if (!riskScoreDisplay || !overallRiskScore || !riskScoreDescription) return;

        // Use ONLY backend's confidence_score - NO fallbacks, NO hardcoded values
        let riskScore = 0;
        let riskLevel = 'low';
        let riskDescription = 'Low Risk';

        if (this.currentScanData) {
            console.log('[PhishGuard] ===== RISK SCORE CALCULATION =====');
            console.log('[PhishGuard] Backend data:', {
                confidenceScore: this.currentScanData.confidenceScore,
                finalVerdict: this.currentScanData.finalVerdict,
                threatLevel: this.currentScanData.threatLevel,
                raw_confidence: this.currentScanData.confidence_score
            });

            // Use ONLY backend's confidence_score - this is set by whichever layer made the decision
            let backendConfidence = this.currentScanData.confidenceScore;

            if (backendConfidence !== undefined && backendConfidence !== null) {
                // If < 1, it's a decimal (0.9), convert to percentage (90)
                // If >= 1, it's already a percentage
                riskScore = backendConfidence <= 1 ? Math.round(backendConfidence * 100) : Math.round(backendConfidence);
                console.log('[PhishGuard] ✅ Using backend confidence_score:', backendConfidence, '-> display as:', riskScore + '%');
            } else {
                // ERROR: Backend should ALWAYS provide confidence_score
                console.error('[PhishGuard] ❌ ERROR: Backend did not provide confidence_score!');
                console.error('[PhishGuard] Full scan data:', this.currentScanData);
                riskScore = 0;
                riskDescription = 'Error: No confidence data';
            }

            console.log('[PhishGuard] ===== FINAL RISK SCORE: ' + riskScore + '% =====');
        } else {
            console.warn('[PhishGuard] No scan data available for risk score calculation');
        }
        
        // Determine risk level and description
        if (riskScore >= 80) {
            riskLevel = 'high';
            riskDescription = 'High Risk';
        } else if (riskScore >= 40) {
            riskLevel = 'medium';
            riskDescription = 'Medium Risk';
        } else {
            riskLevel = 'low';
            riskDescription = 'Low Risk';
        }
        
        // Update display
        overallRiskScore.textContent = riskScore;
        riskScoreDescription.textContent = riskDescription;
        
        // Set risk level class
        riskScoreDisplay.className = `risk-score-display ${riskLevel}-risk`;
        
        // Show with animation
        riskScoreDisplay.style.display = 'block';
        
        // Show detailed results
        if (this.detailedResultsContainer) {
            this.detailedResultsContainer.style.display = 'block';
            this.populateDetailedResults();
        }
        
        console.log(`[PhishGuard] Risk score displayed: ${riskScore} (${riskDescription})`);
    }
    
    toggleDetailedResults() {
        if (!this.detailedResultsContent || !this.detailedResultsToggle) return;
        
        const isVisible = this.detailedResultsContent.style.display === 'block';
        
        if (isVisible) {
            this.detailedResultsContent.style.display = 'none';
            this.detailedResultsToggle.classList.remove('expanded');
            this.detailedResultsToggle.querySelector('.material-icons').textContent = 'expand_more';
        } else {
            this.detailedResultsContent.style.display = 'block';
            this.detailedResultsToggle.classList.add('expanded');
            this.detailedResultsToggle.querySelector('.material-icons').textContent = 'expand_less';
        }
        
        console.log(`[PhishGuard] Detailed results ${isVisible ? 'collapsed' : 'expanded'}`);
    }
    
    populateDetailedResults() {
        if (!this.currentScanData || !this.currentScanData.layers) {
            console.warn('[PhishGuard] No scan data available for detailed results');
            return;
        }

        console.log('[PhishGuard] Populating detailed results with data:', this.currentScanData.layers);

        // Layer 1 Details
        if (this.currentScanData.layers.layer1) {
            const layer1 = this.currentScanData.layers.layer1;
            
            // Update status
            const status1 = document.getElementById('detailed-layer1Status');
            if (status1) {
                const icon = status1.querySelector('.material-icons');
                if (layer1.status === 'clean') {
                    icon.textContent = 'check_circle';
                    icon.className = 'material-icons status-icon safe';
                } else if (layer1.status === 'threat') {
                    icon.textContent = 'warning';
                    icon.className = 'material-icons status-icon danger';
                }
            }
            
            // Update details
            document.getElementById('detailed-layer1DbCount').textContent = layer1.databases_checked || 0;
            document.getElementById('detailed-layer1Confidence').textContent = Math.round((layer1.confidence || 0) * 100) + '%';
            
            // Show threats if any
            if (layer1.threat_indicators && layer1.threat_indicators.length > 0) {
                const threatsDiv = document.getElementById('detailed-layer1Threats');
                const indicatorsDiv = document.getElementById('detailed-layer1ThreatIndicators');
                if (threatsDiv && indicatorsDiv) {
                    threatsDiv.style.display = 'block';
                    indicatorsDiv.innerHTML = layer1.threat_indicators.map(threat => 
                        `<span class="threat-indicator">${threat}</span>`
                    ).join('');
                }
            }
        } else {
            // Layer 1 not executed (shouldn't happen, but handle it)
            const status1 = document.getElementById('detailed-layer1Status');
            if (status1) {
                const icon = status1.querySelector('.material-icons');
                icon.textContent = 'info';
                icon.className = 'material-icons status-icon';
            }
            const detailedLayer1DbCount = document.getElementById('detailed-layer1DbCount');
            const detailedLayer1Confidence = document.getElementById('detailed-layer1Confidence');
            if (detailedLayer1DbCount) detailedLayer1DbCount.textContent = 'N/A';
            if (detailedLayer1Confidence) detailedLayer1Confidence.textContent = 'N/A';
        }

        // Layer 2 Details
        if (this.currentScanData.layers.layer2) {
            const layer2 = this.currentScanData.layers.layer2;
            
            // Update status
            const status2 = document.getElementById('detailed-layer2Status');
            if (status2) {
                const icon = status2.querySelector('.material-icons');
                if (layer2.status === 'clean' || layer2.status === 'benign') {
                    icon.textContent = 'check_circle';
                    icon.className = 'material-icons status-icon safe';
                } else if (layer2.status === 'threat' || layer2.status === 'malicious') {
                    icon.textContent = 'warning';
                    icon.className = 'material-icons status-icon danger';
                } else {
                    icon.textContent = 'warning';
                    icon.className = 'material-icons status-icon warning';
                }
            }
            
            // Update details
            document.getElementById('detailed-layer2Confidence').textContent = Math.round((layer2.confidence || 0) * 100) + '%';
            document.getElementById('detailed-layer2Classification').textContent = layer2.status || 'Unknown';
            
            // Show risk indicators if any
            if (layer2.risk_indicators && layer2.risk_indicators.length > 0) {
                const indicatorsDiv = document.getElementById('detailed-layer2Indicators');
                const riskIndicatorsDiv = document.getElementById('detailed-layer2RiskIndicators');
                if (indicatorsDiv && riskIndicatorsDiv) {
                    indicatorsDiv.style.display = 'block';
                    riskIndicatorsDiv.innerHTML = layer2.risk_indicators.map(indicator => 
                        `<span class="threat-indicator">${indicator}</span>`
                    ).join('');
                }
            }
        } else {
            // Layer 2 not executed
            const status2 = document.getElementById('detailed-layer2Status');
            if (status2) {
                const icon = status2.querySelector('.material-icons');
                icon.textContent = 'info';
                icon.className = 'material-icons status-icon';
            }
            const detailedLayer2Confidence = document.getElementById('detailed-layer2Confidence');
            const detailedLayer2Classification = document.getElementById('detailed-layer2Classification');
            if (detailedLayer2Confidence) detailedLayer2Confidence.textContent = 'N/A';
            if (detailedLayer2Classification) detailedLayer2Classification.textContent = 'Not executed';
        }

        // Layer 3 Details
        if (this.currentScanData.layers.layer3) {
            const layer3 = this.currentScanData.layers.layer3;
            
            // Update status
            const status3 = document.getElementById('detailed-layer3Status');
            if (status3) {
                const icon = status3.querySelector('.material-icons');
                if (layer3.verdict === 'safe') {
                    icon.textContent = 'check_circle';
                    icon.className = 'material-icons status-icon safe';
                } else if (layer3.verdict === 'threat') {
                    icon.textContent = 'warning';
                    icon.className = 'material-icons status-icon danger';
                } else {
                    icon.textContent = 'warning';
                    icon.className = 'material-icons status-icon warning';
                }
            }
            
            // Update details
            document.getElementById('detailed-layer3SocialScore').textContent = Math.round(layer3.social_engineering_score || 0) + '%';
            document.getElementById('detailed-layer3Context').textContent = layer3.personal_context || 'None detected';
            document.getElementById('detailed-layer3TacticsCount').textContent = layer3.tactics_identified ? layer3.tactics_identified.length : 0;
            
            // Show detailed analysis if available
            if (layer3.detailed_analysis || layer3.tactics_identified) {
                const assessmentDiv = document.getElementById('detailed-layer3Assessment');
                const assessmentContentDiv = document.getElementById('detailed-layer3AssessmentContent');
                if (assessmentDiv && assessmentContentDiv) {
                    assessmentDiv.style.display = 'block';
                    
                    let analysisHTML = '';
                    if (layer3.tactics_identified && layer3.tactics_identified.length > 0) {
                        analysisHTML += `<div style="margin-bottom: 12px; padding: 8px; background: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px;">
                            <strong>${layer3.tactics_identified.length} Social Engineering Tactics Detected</strong>
                        </div>`;
                        
                        analysisHTML += '<div style="max-height: 200px; overflow-y: auto;">';
                        layer3.tactics_identified.forEach(tactic => {
                            if (!tactic.trim().endsWith(':**') && tactic.trim() !== '4. Threat Assessment:**') {
                                analysisHTML += `<div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                                    ${tactic.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                                </div>`;
                            }
                        });
                        analysisHTML += '</div>';
                    } else if (layer3.detailed_analysis) {
                        analysisHTML = `<div style="padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                            ${layer3.detailed_analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                        </div>`;
                    }
                    
                    assessmentContentDiv.innerHTML = analysisHTML;
                }
            }
        } else {
            // Layer 3 not executed
            const status3 = document.getElementById('detailed-layer3Status');
            if (status3) {
                const icon = status3.querySelector('.material-icons');
                icon.textContent = 'info';
                icon.className = 'material-icons status-icon';
            }
            const detailedLayer3SocialScore = document.getElementById('detailed-layer3SocialScore');
            const detailedLayer3Context = document.getElementById('detailed-layer3Context');
            const detailedLayer3TacticsCount = document.getElementById('detailed-layer3TacticsCount');
            if (detailedLayer3SocialScore) detailedLayer3SocialScore.textContent = 'N/A';
            if (detailedLayer3Context) detailedLayer3Context.textContent = 'Not executed';
            if (detailedLayer3TacticsCount) detailedLayer3TacticsCount.textContent = '0';
        }

        console.log('[PhishGuard] Detailed results populated successfully');
    }

    simulateScanProgress() {
        // DON'T simulate - wait for real results from backend
        // This prevents conflicts between simulation and real data
        console.log('PhishGuard Sidebar: Waiting for real scan results from backend...');
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
        this.verdictIcon.textContent = 'warning';
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
        console.log('[PhishGuard Sidebar] ========== SCAN RESULTS RECEIVED ==========');
        console.log('[PhishGuard Sidebar] Raw scan data:', {
            scan_id: scanData.scan_id,
            has_layers: !!scanData.layers,
            final_verdict: scanData.final_verdict || scanData.finalVerdict,
            confidence_score: scanData.confidence_score,
            threat_level: scanData.threat_level,
            layer_count: scanData.layers ? Object.keys(scanData.layers).length : 0
        });

        // CRITICAL: Mark that we've received results - this prevents START_SCAN from resetting UI
        this.resultsReceived = true;

        // CRITICAL: Clear all simulation timers IMMEDIATELY to prevent conflicts
        console.log('[PhishGuard Sidebar] Clearing simulation timers...');
        this.clearSimulationTimers();

        // Mark scan as complete
        this.scanInProgress = false;

        // Normalize backend data (convert snake_case to camelCase where needed)
        const normalizedData = this.normalizeScanData(scanData);
        console.log('[PhishGuard Sidebar] Normalized scan data:', {
            finalVerdict: normalizedData.finalVerdict,
            threatLevel: normalizedData.threatLevel,
            confidenceScore: normalizedData.confidenceScore
        });

        // Store normalized data for risk score calculation
        this.currentScanData = normalizedData;

        // Update progress to 100% (scan is complete)
        this.updateProgress(100, 'Scan completed');

        // Process real scan results from backend and update step UI
        this.updateStepsFromBackendData(normalizedData);

        // Display layer results with real data
        if (normalizedData.layers) {
            console.log('[PhishGuard Sidebar] Displaying real layer results from backend...');
            this.displayLayerResultsWithModernUI(normalizedData.layers);
        } else {
            console.warn('[PhishGuard Sidebar] WARNING: No layers found in scan data!');
        }

        // Display final verdict with real data
        if (normalizedData.finalVerdict) {
            console.log('[PhishGuard Sidebar] Displaying final verdict:', normalizedData.finalVerdict);
            this.displayFinalVerdict(normalizedData);
        } else {
            console.warn('[PhishGuard Sidebar] WARNING: No final verdict in scan data!');
        }

        console.log('[PhishGuard Sidebar] ========== SCAN RESULTS DISPLAYED ==========');
    }

    updateStepsFromBackendData(scanData) {
        // Update the step UI based on which layers actually ran
        console.log('[PhishGuard Sidebar] Updating steps from backend data...');

        const layers = scanData.layers || {};

        // Preprocessing always completes
        this.completeStep('preprocessing', 'Email content extracted successfully');

        // Layer 1
        if (layers.layer1) {
            const layer1 = layers.layer1;
            if (layer1.status === 'threat') {
                this.threatDetectedStep('layer1', `Threat detected: Known malicious patterns`);
                // Skip remaining layers
                this.skipStep('layer2', 'Not executed - Threat found in Layer 1');
                this.skipStep('layer3', 'Not executed - Threat found in Layer 1');
                this.threatDetectedStep('finalization', 'Analysis terminated - Threat confirmed');
                return;
            } else {
                this.completeStep('layer1', 'No known threats found in databases');
            }
        }

        // Layer 2
        if (layers.layer2) {
            const layer2 = layers.layer2;
            if (layer2.status === 'clean' && layer2.confidence > 0.8) {
                this.completeStep('layer2', 'High confidence: Email appears legitimate');
                this.skipStep('layer3', 'Not needed - High confidence from Layer 2');
                this.completeStep('finalization', 'Analysis complete - Email verified as safe');
                return;
            } else if (layer2.status === 'threat' || layer2.status === 'malicious') {
                this.threatDetectedStep('layer2', `AI detected malicious patterns`);
                this.skipStep('layer3', 'Not executed - Threat found in Layer 2');
                this.threatDetectedStep('finalization', 'Analysis terminated - Threat confirmed');
                return;
            } else {
                this.completeStep('layer2', 'Proceeding to advanced analysis');
            }
        } else {
            // Layer 2 not executed
            this.skipStep('layer2', 'Not executed - Threat found in Layer 1');
        }

        // Layer 3
        if (layers.layer3) {
            const layer3 = layers.layer3;
            if (layer3.verdict === 'threat' || layer3.threat_level === 'high') {
                this.threatDetectedStep('layer3', `Advanced threat detected`);
                this.threatDetectedStep('finalization', 'Analysis complete - Threat confirmed');
            } else if (layer3.verdict === 'suspicious') {
                this.completeStep('layer3', 'Suspicious patterns detected');
                this.completeStep('finalization', 'Analysis complete - Exercise caution');
            } else {
                this.completeStep('layer3', 'Advanced analysis complete - No threats detected');
                this.completeStep('finalization', 'Security assessment complete');
            }
        } else {
            // Layer 3 not executed
            this.skipStep('layer3', 'Not executed - Previous layers determined verdict');
            this.completeStep('finalization', 'Security assessment complete');
        }

        console.log('[PhishGuard Sidebar] Steps updated from backend data');
    }

    normalizeScanData(scanData) {
        // Normalize backend data to ensure consistent camelCase format
        console.log('[PhishGuard Sidebar] ===== NORMALIZING BACKEND DATA =====');
        console.log('[PhishGuard Sidebar] Raw backend confidence_score:', scanData.confidence_score);
        console.log('[PhishGuard Sidebar] Raw backend final_verdict:', scanData.final_verdict);
        console.log('[PhishGuard Sidebar] Raw backend threat_level:', scanData.threat_level);

        const normalized = {
            scanId: scanData.scan_id || scanData.scanId,
            timestamp: scanData.timestamp || scanData.scan_timestamp,
            userId: scanData.user_id || scanData.userId,
            emailData: scanData.email_data || scanData.emailData,
            layers: scanData.layers || {},
            finalVerdict: scanData.final_verdict || scanData.finalVerdict || 'unknown',
            threatLevel: scanData.threat_level || scanData.threatLevel || 'unknown',
            confidenceScore: scanData.confidence_score !== undefined ? scanData.confidence_score : (scanData.confidenceScore !== undefined ? scanData.confidenceScore : null),
            processingTime: scanData.processing_time || scanData.processingTime || 0
        };

        console.log('[PhishGuard Sidebar] Normalized confidenceScore:', normalized.confidenceScore);
        console.log('[PhishGuard Sidebar] ===== NORMALIZATION COMPLETE =====');

        return normalized;
    }
    
    displayLayerResultsWithModernUI(layers) {
        // STOP THE LOADING ANIMATION - scan is complete
        console.log('🔍 [DEBUG] Stopping loading animation...');
        this.scanInProgress = false;

        // Hide the old layer cards during scanning - they're not needed with modern UI
        const layerResults = document.getElementById('layerResults');
        if (layerResults) {
            layerResults.style.display = 'none';
            console.log('✅ [DEBUG] Hidden old layer cards');
        }

        // Process Layer 1
        if (layers.layer1) {
            const layer1 = layers.layer1;
            console.log('🔍 [DEBUG] Processing Layer 1:', layer1);
            
            const status = layer1.status === 'clean' ? 'safe' :
                          layer1.status === 'threat' ? 'danger' : 'warning';
            this.updateLayerStatus('layer1', status);
            
            // Update confidence display if element exists
            const layer1Confidence = document.getElementById('layer1Confidence');
            if (layer1Confidence) {
                layer1Confidence.textContent = Math.round((layer1.confidence || 0) * 100) + '%';
            }

            // Update modern step UI based on REAL results
            if (layer1.status === 'threat') {
                this.threatDetectedStep('layer1', `Threat detected: ${layer1.threat_indicators?.join(', ') || 'Known malicious patterns'}`);
                // Skip remaining steps since threat was detected in Layer 1
                this.skipStep('layer2', 'Skipped - Threat detected in Layer 1');
                this.skipStep('layer3', 'Skipped - Threat detected in Layer 1');
                this.threatDetectedStep('finalization', 'Analysis terminated - Threat confirmed');
                return; // Early exit - don't process further layers
            } else {
                this.completeStep('layer1', 'No known threats found in databases');
            }

            // Clear loading message - reset to default description
            const layer1Card = document.getElementById('layer1');
            const layer1Message = layer1Card?.querySelector('.layer-info p');
            if (layer1Message) {
                layer1Message.textContent = 'Checking against known spam databases';
                console.log('✅ [DEBUG] Layer 1 message reset to default');
            }
        }
        
        // Process Layer 2 (only if it exists and Layer 1 didn't find threats)
        if (layers.layer2) {
            const layer2 = layers.layer2;
            console.log('🔍 [DEBUG] Processing Layer 2:', layer2);
            
            const status = layer2.status === 'clean' || layer2.status === 'benign' ? 'safe' :
                          layer2.status === 'threat' || layer2.status === 'malicious' ? 'danger' : 'warning';
            this.updateLayerStatus('layer2', status);
            
            // Update confidence display if element exists
            const layer2Confidence = document.getElementById('layer2Confidence');
            if (layer2Confidence) {
                layer2Confidence.textContent = Math.round((layer2.confidence || 0) * 100) + '%';
            }

            // Update modern step UI based on REAL results
            if (layer2.status === 'clean' && layer2.confidence > 0.8) {
                this.completeStep('layer2', 'High confidence: Email appears legitimate');
                // Skip Layer 3 if high confidence
                this.skipStep('layer3', 'Skipped - High confidence from Layer 2');
                this.completeStep('finalization', 'Analysis complete - Email verified as safe');
                return;
            } else if (layer2.status === 'threat' || layer2.status === 'malicious') {
                this.threatDetectedStep('layer2', `AI detected malicious patterns: ${Math.round((layer2.confidence || 0) * 100)}% confidence`);
                // Skip Layer 3 if threat detected
                this.skipStep('layer3', 'Skipped - Threat detected in Layer 2');
                this.threatDetectedStep('finalization', 'Analysis terminated - Threat confirmed');
                return;
            } else {
                this.completeStep('layer2', 'Proceeding to advanced analysis - Suspicious patterns detected');
                // Only proceed if Layer 3 exists
                if (layers.layer3) {
                    this.activateStep('layer3', 'Detective agent analyzing...');
                } else {
                    this.completeStep('finalization', 'Security assessment complete');
                    return;
                }
            }

            // Clear loading message - reset to default description
            const layer2Card = document.getElementById('layer2');
            const layer2Message = layer2Card?.querySelector('.layer-info p');
            if (layer2Message) {
                layer2Message.textContent = 'DistilBERT model analysis';
                console.log('✅ [DEBUG] Layer 2 message reset to default');
            }
        } else {
            console.log('ℹ️ [DEBUG] Layer 2 not executed (threat detected in Layer 1)');
            // Layer 2 was not executed (threat detected in Layer 1)
            this.updateLayerStatus('layer2', 'safe'); // Update old layer card status
            this.skipStep('layer2', 'Not executed - Threat detected in Layer 1');
        }
        
        // Process Layer 3 (only if it exists and previous layers didn't find threats)
        if (layers.layer3) {
            console.log('🔍 [DEBUG] Processing Layer 3 results...');
            const layer3 = layers.layer3;
            console.log('🔍 [DEBUG] Layer 3 full object:', JSON.stringify(layer3, null, 2));

            // Log all Layer 3 fields
            console.log('🔍 [DEBUG] Layer 3 fields:');
            console.log('  - verdict:', layer3.verdict);
            console.log('  - threat_level:', layer3.threat_level);
            console.log('  - confidence:', layer3.confidence);
            console.log('  - social_engineering_score:', layer3.social_engineering_score);
            console.log('  - personal_context:', layer3.personal_context);
            console.log('  - impersonation_risk:', layer3.impersonation_risk);
            console.log('  - detailed_analysis:', layer3.detailed_analysis);
            console.log('  - recommended_action:', layer3.recommended_action);
            console.log('  - tactics_identified:', layer3.tactics_identified);

            // Determine status from verdict
            let status = 'safe';
            if (layer3.verdict === 'threat' || layer3.threat_level === 'high') {
                status = 'danger';
            } else if (layer3.verdict === 'suspicious' || layer3.threat_level === 'medium') {
                status = 'warning';
            }
            console.log('🔍 [DEBUG] Layer 3 status determined:', status);

            this.updateLayerStatus('layer3', status);

            // Update modern step UI
            if (layer3.verdict === 'threat' || layer3.threat_level === 'high') {
                this.threatDetectedStep('layer3', `Advanced threat detected: ${layer3.tactics_identified?.length || 0} social engineering tactics identified`);
            } else if (layer3.verdict === 'suspicious' || layer3.threat_level === 'medium') {
                this.completeStep('layer3', `Suspicious patterns detected: ${layer3.tactics_identified?.length || 0} tactics identified`);
            } else {
                this.completeStep('layer3', 'Advanced analysis complete - No threats detected');
            }

            // Calculate and display accurate social engineering score
            console.log('🔍 [DEBUG] Calculating social engineering score...');
            const scoreElement = document.getElementById('layer3SocialScore');
            console.log('🔍 [DEBUG] Score element exists?', !!scoreElement);

            // Calculate score based on tactics count (more accurate than backend's score)
            let calculatedScore = layer3.social_engineering_score || 0;
            const tacticsCount = layer3.tactics_identified ? layer3.tactics_identified.length : 0;

            // If we detected tactics, calculate a more realistic score
            if (tacticsCount > 0) {
                // Each valid tactic adds ~8-10 points to the risk score
                // Filter out section headers that aren't real tactics
                const validTactics = layer3.tactics_identified.filter(t =>
                    !t.trim().endsWith(':**') &&
                    t.trim() !== '4. Threat Assessment:**' &&
                    t.trim() !== '3. Personal Context Relevance:**'
                ).length;

                calculatedScore = Math.min(validTactics * 9, 100);
                console.log(`🔍 [DEBUG] Calculated score: ${calculatedScore}% (${validTactics} valid tactics, backend returned ${layer3.social_engineering_score}%)`);

                // Use the higher score (calculated vs backend)
                if (calculatedScore < layer3.social_engineering_score) {
                    calculatedScore = layer3.social_engineering_score;
                }
            }

            if (scoreElement) {
                const scoreText = calculatedScore + '%';
                console.log('🔍 [DEBUG] Setting score to:', scoreText);
                scoreElement.textContent = scoreText;

                // Update color based on score
                if (calculatedScore >= 70) {
                    scoreElement.style.color = '#dc2626'; // Red
                    scoreElement.style.fontWeight = 'bold';
                } else if (calculatedScore >= 40) {
                    scoreElement.style.color = '#f59e0b'; // Orange
                    scoreElement.style.fontWeight = 'bold';
                } else {
                    scoreElement.style.color = '#10b981'; // Green
                }

                console.log('✅ [DEBUG] Score set successfully');
            }

            // Display personal context
            console.log('🔍 [DEBUG] Checking personal_context...');
            const contextElement = document.getElementById('layer3Context');
            console.log('🔍 [DEBUG] Context element exists?', !!contextElement);
            if (layer3.personal_context) {
                console.log('🔍 [DEBUG] Setting context to:', layer3.personal_context);
                if (contextElement) {
                    contextElement.textContent = layer3.personal_context;
                    console.log('✅ [DEBUG] Context set successfully');
                }
            } else if (layer3.impersonation_risk) {
                const riskText = `Impersonation risk: ${layer3.impersonation_risk}`;
                console.log('🔍 [DEBUG] Setting impersonation risk to:', riskText);
                if (contextElement) {
                    contextElement.textContent = riskText;
                    console.log('✅ [DEBUG] Impersonation risk set successfully');
                }
            } else {
                console.warn('⚠️ [DEBUG] No personal_context or impersonation_risk');
            }

            // Display detailed analysis with proper formatting
            console.log('🔍 [DEBUG] Checking detailed_analysis...');
            const assessmentElement = document.getElementById('layer3Assessment');
            console.log('🔍 [DEBUG] Assessment element exists?', !!assessmentElement);

            if (assessmentElement) {
                // Format the detailed analysis with proper HTML
                let formattedHTML = '';

                if (layer3.tactics_identified && layer3.tactics_identified.length > 0) {
                    console.log('🔍 [DEBUG] Formatting', layer3.tactics_identified.length, 'tactics');

                    // Show tactics count prominently
                    formattedHTML += `<div style="margin-bottom: 12px; padding: 8px; background: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px;">
                        <strong>${layer3.tactics_identified.length} Social Engineering Tactics Detected</strong>
                    </div>`;

                    // Format each tactic with proper HTML
                    formattedHTML += '<div style="max-height: 300px; overflow-y: auto; padding-right: 8px;">';
                    layer3.tactics_identified.forEach((tactic, index) => {
                        // Convert markdown **bold** to HTML
                        let formattedTactic = tactic.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                        // Skip section headers that are just formatting artifacts
                        if (formattedTactic.trim().endsWith(':**') || formattedTactic.trim() === '4. Threat Assessment:**') {
                            return;
                        }

                        formattedHTML += `<div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #6366f1;">
                            ${formattedTactic}
                        </div>`;
                    });
                    formattedHTML += '</div>';

                } else if (layer3.detailed_analysis) {
                    console.log('🔍 [DEBUG] Using detailed_analysis text');
                    // Convert markdown and format
                    let formatted = layer3.detailed_analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    formattedHTML = `<div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">${formatted}</div>`;
                } else if (layer3.recommended_action) {
                    console.log('🔍 [DEBUG] Using recommended_action');
                    formattedHTML = `<div style="padding: 10px; background: #e7f3ff; border-radius: 6px; border-left: 3px solid #2196f3;">
                        <strong>Recommendation:</strong> ${layer3.recommended_action}
                    </div>`;
                } else {
                    formattedHTML = '<p style="color: #718096;">No additional analysis available.</p>';
                }

                assessmentElement.innerHTML = formattedHTML;
                console.log('✅ [DEBUG] Analysis formatted and displayed');
            }

            // Clear loading message - reset to default description
            console.log('🔍 [DEBUG] Clearing Layer 3 loading message...');
            const layer3Card = document.getElementById('layer3');
            const layer3Message = layer3Card?.querySelector('.layer-info p');
            if (layer3Message) {
                layer3Message.textContent = 'Gemini LLM with RAG analysis';
                console.log('✅ [DEBUG] Layer 3 message reset to default');
            }

            // AUTO-EXPAND Layer 3 details so user can see the results
            console.log('🔍 [DEBUG] Auto-expanding Layer 3 details...');
            const layer3Details = document.getElementById('layer3Details');
            if (layer3Details) {
                layer3Details.style.display = 'block';
                console.log('✅ [DEBUG] Layer 3 details expanded');
            } else {
                console.warn('⚠️ [DEBUG] layer3Details element not found!');
            }

        } else {
            console.log('ℹ️ [DEBUG] Layer 3 not executed (high confidence from Layer 2 or threat detected in earlier layers)');
            // Layer 3 was not executed (high confidence from Layer 2 or threat detected in earlier layers)
            this.updateLayerStatus('layer3', 'safe');
            this.skipStep('layer3', 'Not needed - High confidence from Layer 2 or threat detected');
            document.getElementById('layer3Status').innerHTML =
                '<span class="material-icons status-icon">info</span>';

            const layer3Card = document.getElementById('layer3');
            const messageElement = layer3Card.querySelector('.layer-info p');
            if (messageElement) {
                messageElement.textContent = 'Not needed (high confidence from Layer 2 or threat detected)';
            }
        }
        
        // Complete finalization step
        this.completeStep('finalization', 'Security assessment complete');
    }
    
    displayFinalVerdict(scanData) {
        this.finalVerdict.style.display = 'block';

        const verdict = scanData.finalVerdict || scanData.final_verdict || 'unknown';
        const threatLevel = scanData.threatLevel || scanData.threat_level || 'medium';

        // CRITICAL: Stop all loading animations
        console.log('🔍 [DEBUG] Stopping all animations in displayFinalVerdict');
        this.scanInProgress = false;

        // Remove any spinner elements inside status indicator
        const existingSpinner = this.statusIndicator?.querySelector('.spinner');
        if (existingSpinner) {
            existingSpinner.remove();
            console.log('✅ [DEBUG] Removed spinner from status indicator');
        }

        // Update progress to 100%
        this.updateProgress(100, 'Scan completed');

        // Update the main status title and message
        this.statusTitle.textContent = 'Scan Complete';

        // Get verdict icon wrapper for styling
        const verdictIconWrapper = document.getElementById('verdictIconWrapper');

        if (verdict === 'safe') {
            this.verdictIcon.setAttribute('data-lucide', 'shield-check');
            this.verdictTitle.textContent = 'Email is Safe';
            this.verdictMessage.textContent = 'No threats detected';
            this.statusIndicator.className = 'status-indicator safe';
            this.statusMessage.textContent = 'All security layers passed - email is safe';
            if (verdictIconWrapper) verdictIconWrapper.className = 'verdict-icon-wrapper safe';
        } else if (verdict === 'threat') {
            this.verdictIcon.setAttribute('data-lucide', 'shield-alert');
            this.verdictTitle.textContent = 'Threat Detected';
            this.verdictMessage.textContent = 'This email is malicious';
            this.statusIndicator.className = 'status-indicator danger';
            this.statusMessage.textContent = 'Security threat detected - do not interact with this email';
            if (verdictIconWrapper) verdictIconWrapper.className = 'verdict-icon-wrapper danger';
        } else {
            this.verdictIcon.setAttribute('data-lucide', 'shield-alert');
            this.verdictTitle.textContent = 'Potential Threat';
            this.verdictMessage.textContent = 'Exercise caution with this email';
            this.statusIndicator.className = 'status-indicator warning';
            this.statusMessage.textContent = 'Potential phishing attempt detected';
            if (verdictIconWrapper) verdictIconWrapper.className = 'verdict-icon-wrapper warning';
        }

        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Use ONLY backend's confidence_score - NO fallbacks, NO hardcoded values
        console.log('[DEBUG] ===== VERDICT RISK SCORE CALCULATION =====');
        let riskScore = 0;

        // Use ONLY backend's confidence_score
        let backendConfidence = scanData.confidenceScore;

        if (backendConfidence !== undefined && backendConfidence !== null) {
            // If < 1, it's a decimal (0.9), convert to percentage
            riskScore = backendConfidence <= 1 ? Math.round(backendConfidence * 100) : Math.round(backendConfidence);
            console.log('[DEBUG] ✅ Using backend confidence_score:', backendConfidence, '-> display as:', riskScore + '%');
        } else {
            // ERROR: Backend should ALWAYS provide confidence_score
            console.error('[DEBUG] ❌ ERROR: Backend did not provide confidence_score!');
            console.error('[DEBUG] Full scan data:', scanData);
            riskScore = 0;
        }

        console.log('[DEBUG] ===== VERDICT FINAL RISK SCORE: ' + riskScore + '% =====');

        // Update risk score display
        this.scoreValue.textContent = riskScore;

        // Animate the SVG ring based on risk score
        const scoreRingFill = document.getElementById('scoreRingFill');
        if (scoreRingFill) {
            const circumference = 2 * Math.PI * 54; // r=54
            const offset = circumference - (riskScore / 100) * circumference;
            scoreRingFill.style.strokeDashoffset = offset;

            // Color code the ring based on threat level
            if (riskScore >= 80) {
                scoreRingFill.style.stroke = '#dc2626'; // Red
                console.log('[DEBUG] Risk level: CRITICAL (80-100)');
            } else if (riskScore >= 60) {
                scoreRingFill.style.stroke = '#d97706'; // Amber
                console.log('[DEBUG] Risk level: HIGH (60-79)');
            } else if (riskScore >= 40) {
                scoreRingFill.style.stroke = '#6b7280'; // Gray
                console.log('[DEBUG] Risk level: MEDIUM (40-59)');
            } else {
                scoreRingFill.style.stroke = '#059669'; // Green
                console.log('[DEBUG] Risk level: LOW (0-39)');
            }
        }

        this.actionButtons.style.display = 'flex';
        this.scanTime.textContent = new Date().toLocaleTimeString();

        console.log('[DEBUG] Final verdict displayed with risk score:', riskScore);
    }
    
    toggleLayerDetails(layerId) {
        const details = document.getElementById(`${layerId}Details`);
        const isVisible = details.style.display === 'block';
        details.style.display = isVisible ? 'none' : 'block';
    }

    toggleVerdictDetails() {
        console.log('toggleVerdictDetails called');
        
        const verdictScore = document.getElementById('verdictScoreSection');
        const collapseBtn = document.getElementById('verdictCollapseBtn');

        console.log('verdictScore element:', verdictScore);
        console.log('collapseBtn element:', collapseBtn);

        if (!verdictScore) {
            console.error('verdictScoreSection element not found!');
            return;
        }
        
        if (!collapseBtn) {
            console.error('verdictCollapseBtn element not found!');
            return;
        }

        const icon = collapseBtn.querySelector('.material-icons');
        if (!icon) {
            console.error('Material icon inside collapse button not found!');
            return;
        }

        // Check current state more reliably
        const isVisible = verdictScore.style.display !== 'none' && 
                         verdictScore.style.display !== '' && 
                         verdictScore.offsetHeight > 0;

        console.log('Current visibility state:', isVisible);
        console.log('Current display style:', verdictScore.style.display);

        if (isVisible) {
            // Collapse
            verdictScore.style.display = 'none';
            icon.textContent = 'expand_more';
            console.log('✅ Verdict details collapsed');
        } else {
            // Expand
            verdictScore.style.display = 'flex';
            icon.textContent = 'expand_less';
            console.log('✅ Verdict details expanded');
        }
        
        // Verify the change
        setTimeout(() => {
            console.log('After toggle - display style:', verdictScore.style.display);
            console.log('After toggle - icon text:', icon.textContent);
        }, 100);
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

    openHistory() {
        // Open history page in a new tab
        if (window.chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: 'OPEN_HISTORY_PAGE'
            });
        }
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.phishGuardSidebar = new PhishGuardSidebar();
    
    // Add global test function for debugging
    window.testToggle = () => {
        console.log('Testing toggle function...');
        if (window.phishGuardSidebar) {
            window.phishGuardSidebar.toggleVerdictDetails();
        } else {
            console.error('PhishGuard sidebar not found');
        }
    };
});