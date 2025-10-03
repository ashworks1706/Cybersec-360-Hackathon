// PhishGuard 360 - Sidebar JavaScript
// Handles scan result display and user interactions

class PhishGuardSidebar {
    constructor() {
        this.currentScanData = null;
        this.scanInProgress = false;

        // Timer IDs for simulation (so we can cancel them when real results arrive)
        this.simulationTimers = [];

        this.initializeElements();
        this.setupEventListeners();
        this.setupMessageListener();

        console.log('[PhishGuard] Sidebar initialized');
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
        console.log('PhishGuard Sidebar: Cleared all simulation timers');
    }

    animateScanning() {
        // Add scanning animation to layers sequentially
        const timer1 = setTimeout(() => {
            if (this.scanInProgress) {
                this.updateLayerStatus('layer1', 'scanning', 'Checking public databases...');
            }
        }, 500);
        this.simulationTimers.push(timer1);

        const timer2 = setTimeout(() => {
            if (this.scanInProgress) {
                this.updateLayerStatus('layer2', 'scanning', 'Running AI classification...');
            }
        }, 2000);
        this.simulationTimers.push(timer2);

        const timer3 = setTimeout(() => {
            if (this.scanInProgress) {
                this.updateLayerStatus('layer3', 'scanning', 'Detective agent analyzing...');
            }
        }, 4000);
        this.simulationTimers.push(timer3);
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
        console.log('[DEBUG] Received scan results:', scanData);
        console.log('[DEBUG] Scan data type:', typeof scanData);
        console.log('[DEBUG] Has layers?', !!scanData.layers);

        this.currentScanData = scanData;

        // CRITICAL: Clear all simulation timers to prevent conflicts
        this.clearSimulationTimers();

        // Mark scan as complete
        this.scanInProgress = false;

        // Process and display real scan results from backend
        if (scanData.layers) {
            console.log('🔍 [DEBUG] Layer 1 data:', scanData.layers.layer1);
            console.log('🔍 [DEBUG] Layer 2 data:', scanData.layers.layer2);
            console.log('🔍 [DEBUG] Layer 3 data:', scanData.layers.layer3);
            console.log('🔍 [DEBUG] Layer 3 exists?', !!scanData.layers.layer3);

            this.displayLayerResults(scanData.layers);
        } else {
            console.warn('⚠️ [DEBUG] No layers found in scan data!');
        }

        if (scanData.finalVerdict || scanData.final_verdict) {
            console.log('🔍 [DEBUG] Displaying final verdict:', scanData.finalVerdict || scanData.final_verdict);
            this.displayFinalVerdict(scanData);
        } else {
            console.warn('⚠️ [DEBUG] No final verdict in scan data!');
        }
    }
    
    displayLayerResults(layers) {
        // STOP THE LOADING ANIMATION - scan is complete
        console.log('🔍 [DEBUG] Stopping loading animation...');
        this.scanInProgress = false;

        // Remove scanning class from status indicator
        if (this.statusIndicator) {
            this.statusIndicator.classList.remove('scanning');
            console.log('✅ [DEBUG] Removed scanning class from status indicator');
        }

        if (layers.layer1) {
            const layer1 = layers.layer1;
            const status = layer1.status === 'clean' ? 'safe' :
                          layer1.status === 'threat' ? 'danger' : 'warning';
            this.updateLayerStatus('layer1', status);
            document.getElementById('layer1Confidence').textContent =
                Math.round(layer1.confidence * 100) + '%';

            // Clear loading message - reset to default description
            const layer1Card = document.getElementById('layer1');
            const layer1Message = layer1Card?.querySelector('.layer-info p');
            if (layer1Message) {
                layer1Message.textContent = 'Checking against known spam databases';
                console.log('✅ [DEBUG] Layer 1 message reset to default');
            }
        }
        
        if (layers.layer2) {
            const layer2 = layers.layer2;
            const status = layer2.status === 'clean' ? 'safe' :
                          layer2.status === 'threat' ? 'danger' : 'warning';
            this.updateLayerStatus('layer2', status);
            document.getElementById('layer2Confidence').textContent =
                Math.round(layer2.confidence * 100) + '%';

            // Clear loading message - reset to default description
            const layer2Card = document.getElementById('layer2');
            const layer2Message = layer2Card?.querySelector('.layer-info p');
            if (layer2Message) {
                layer2Message.textContent = 'DistilBERT model analysis';
                console.log('✅ [DEBUG] Layer 2 message reset to default');
            }
        }
        
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
                    formattedHTML += `<div style="margin-bottom: 12px; padding: 8px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <strong>⚠️ ${layer3.tactics_identified.length} Social Engineering Tactics Detected</strong>
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
            console.log('ℹ️ [DEBUG] Layer 3 not executed (high confidence from Layer 2)');
            // Layer 3 was not executed (high confidence from Layer 2)
            this.updateLayerStatus('layer3', 'safe');
            document.getElementById('layer3Status').innerHTML =
                '<div class="status-icon">ℹ️</div>';
            const layer3Card = document.getElementById('layer3');
            const messageElement = layer3Card.querySelector('.layer-info p');
            if (messageElement) {
                messageElement.textContent = 'Not needed (high confidence from Layer 2)';
            }
        }
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

        // Calculate and display comprehensive risk score from all layers
        console.log('[DEBUG] Calculating comprehensive risk score...');
        let riskScore = 0;

        // Priority 1: Use Layer 3's comprehensive risk_score if available
        if (scanData.layers?.layer3?.risk_score !== undefined) {
            riskScore = scanData.layers.layer3.risk_score;
            console.log('[DEBUG] Using Layer 3 risk_score:', riskScore);
        }
        // Priority 2: Calculate from confidence and Layer 3 SE score
        else if (scanData.layers?.layer3?.social_engineering_score !== undefined) {
            const seScore = scanData.layers.layer3.social_engineering_score;
            const confidenceScore = (scanData.confidence_score || 0) * 100;
            riskScore = Math.min(Math.round((confidenceScore + seScore) / 2), 100);
            console.log('[DEBUG] Calculated risk_score from SE + confidence:', riskScore);
        }
        // Priority 3: Use confidence score alone
        else {
            riskScore = Math.round((scanData.confidence_score || 0) * 100);
            console.log('[DEBUG] Using confidence_score as risk:', riskScore);
        }

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