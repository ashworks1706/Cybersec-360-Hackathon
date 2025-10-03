// PhishGuard 360 - Model Training JavaScript

class ModelTrainingManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5001/api';
        this.trainingInterval = null;
        this.logInterval = null;
        
        this.initializeElements();
        this.loadTrainingData();
        this.loadDataPreview();
        
        console.log('🧠 Model Training Manager initialized');
    }
    
    initializeElements() {
        // Statistics elements
        this.totalSamples = document.getElementById('totalSamples');
        this.phishingSamples = document.getElementById('phishingSamples');
        this.legitimateSamples = document.getElementById('legitimateSamples');
        this.uniqueUsers = document.getElementById('uniqueUsers');
        
        // Stat cards for status indication
        this.totalSamplesCard = document.getElementById('totalSamplesCard');
        this.phishingSamplesCard = document.getElementById('phishingSamplesCard');
        this.legitimateSamplesCard = document.getElementById('legitimateSamplesCard');
        this.uniqueUsersCard = document.getElementById('uniqueUsersCard');
        
        // Requirements elements
        this.requirementsList = document.getElementById('requirementsList');
        
        // Training control elements
        this.startTrainingBtn = document.getElementById('startTrainingBtn');
        this.statusMessage = document.getElementById('statusMessage');
        
        // Training progress elements
        this.trainingProgressSection = document.getElementById('trainingProgressSection');
        this.trainingStatus = document.getElementById('trainingStatus');
        this.trainingProgress = document.getElementById('trainingProgress');
        this.progressFill = document.getElementById('progressFill');
        this.trainingETA = document.getElementById('trainingETA');
        this.trainingLog = document.getElementById('trainingLog');
        this.stopTrainingBtn = document.getElementById('stopTrainingBtn');
        
        // Data preview
        this.dataPreview = document.getElementById('dataPreview');
    }
    
    async loadTrainingData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/model/training/status`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.updateStatistics(data.statistics);
                this.updateRequirements(data.readiness);
                
                // Check if training is in progress
                if (data.training_in_progress) {
                    this.showTrainingProgress();
                    this.pollTrainingStatus();
                }
            } else {
                this.showMessage(data.message || 'Failed to load training data', 'error');
            }
        } catch (error) {
            console.error('Failed to load training data:', error);
            this.showMessage('Failed to connect to training service', 'error');
        }
    }
    
    updateStatistics(stats) {
        this.totalSamples.textContent = stats.total_samples || 0;
        this.phishingSamples.textContent = stats.phishing_samples || 0;
        this.legitimateSamples.textContent = stats.legitimate_samples || 0;
        this.uniqueUsers.textContent = stats.unique_users || 0;
        
        // Update card status based on requirements
        this.updateCardStatus(this.totalSamplesCard, this.totalSamples, stats.total_samples >= 100);
        this.updateCardStatus(this.phishingSamplesCard, this.phishingSamples, stats.phishing_samples >= 20);
        this.updateCardStatus(this.legitimateSamplesCard, this.legitimateSamples, stats.legitimate_samples >= 20);
        this.updateCardStatus(this.uniqueUsersCard, this.uniqueUsers, stats.unique_users >= 1);
    }
    
    updateCardStatus(card, numberElement, isMet) {
        card.className = 'stat-card';
        numberElement.className = 'stat-number';
        
        if (isMet) {
            card.classList.add('ready');
            numberElement.classList.add('ready');
        } else {
            card.classList.add('error');
            numberElement.classList.add('error');
        }
    }
    
    updateRequirements(readiness) {
        const requirements = [
            { id: 'req-min-samples', met: readiness.min_samples },
            { id: 'req-min-per-class', met: readiness.min_per_class },
            { id: 'req-min-classes', met: readiness.min_classes },
            { id: 'req-data-quality', met: readiness.data_quality }
        ];
        
        let allMet = true;
        
        requirements.forEach(req => {
            const element = document.getElementById(req.id);
            const icon = element.querySelector('.material-icons');
            
            if (req.met) {
                element.className = 'requirement met';
                icon.textContent = 'check_circle';
            } else {
                element.className = 'requirement not-met';
                icon.textContent = 'cancel';
                allMet = false;
            }
        });
        
        // Enable/disable training button
        this.startTrainingBtn.disabled = !allMet;
        
        if (allMet) {
            this.showMessage('✅ All requirements met! Training is ready to start.', 'success');
        } else {
            this.showMessage('⚠️ Training requirements not met. Please add more data.', 'warning');
        }
    }
    
    async loadDataPreview() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/model/training/preview`);
            const data = await response.json();
            
            if (data.status === 'success' && data.samples) {
                this.displayDataPreview(data.samples);
            } else {
                this.dataPreview.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #718096;">
                        <span class="material-icons" style="font-size: 48px; opacity: 0.5;">warning</span>
                        <p style="margin-top: 20px;">No training data available</p>
                        <p style="margin-top: 10px;">Add documents and feedback to build training data</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load data preview:', error);
            this.dataPreview.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #f56565;">
                    <span class="material-icons" style="font-size: 48px;">error</span>
                    <p style="margin-top: 20px;">Failed to load data preview</p>
                </div>
            `;
        }
    }
    
    displayDataPreview(samples) {
        if (samples.length === 0) {
            this.dataPreview.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #718096;">
                    <span class="material-icons" style="font-size: 48px; opacity: 0.5;">dataset</span>
                    <p style="margin-top: 20px;">No sample data to preview</p>
                </div>
            `;
            return;
        }
        
        this.dataPreview.innerHTML = samples.map(sample => `
            <div class="data-sample">
                <div class="sample-text">${this.escapeHtml(this.truncateText(sample.text, 200))}</div>
                <span class="sample-label ${sample.label.toLowerCase()}">${sample.label}</span>
            </div>
        `).join('');
    }
    
    async startTraining() {
        try {
            this.startTrainingBtn.disabled = true;
            this.startTrainingBtn.innerHTML = '<div class="loading"></div> Starting Training...';
            
            const response = await fetch(`${this.apiBaseUrl}/model/training/start`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.showMessage('🚀 Model training started successfully!', 'success');
                this.showTrainingProgress();
                this.pollTrainingStatus();
            } else {
                this.showMessage(data.message || 'Failed to start training', 'error');
                this.startTrainingBtn.disabled = false;
                this.startTrainingBtn.innerHTML = '<span class="material-icons">play_arrow</span> Start Model Training';
            }
        } catch (error) {
            console.error('Failed to start training:', error);
            this.showMessage('Failed to start training', 'error');
            this.startTrainingBtn.disabled = false;
            this.startTrainingBtn.innerHTML = '<span class="material-icons">play_arrow</span> Start Model Training';
        }
    }
    
    showTrainingProgress() {
        this.trainingProgressSection.style.display = 'block';
        this.trainingLog.style.display = 'block';
        this.trainingLog.innerHTML = '';
        
        this.addLogEntry('info', 'Training session started');
        this.addLogEntry('info', 'Initializing model and data...');
    }
    
    pollTrainingStatus() {
        this.trainingInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBaseUrl}/model/training/status`);
                const data = await response.json();
                
                if (data.status === 'success' && data.training_status) {
                    this.updateTrainingProgress(data.training_status);
                    
                    if (data.training_status.status === 'completed' || data.training_status.status === 'failed') {
                        this.stopPolling();
                        this.handleTrainingComplete(data.training_status);
                    }
                }
            } catch (error) {
                console.error('Failed to poll training status:', error);
            }
        }, 2000); // Poll every 2 seconds
    }
    
    updateTrainingProgress(status) {
        this.trainingStatus.textContent = this.formatTrainingStatus(status.status);
        this.trainingProgress.textContent = `${status.progress}%`;
        this.progressFill.style.width = `${status.progress}%`;
        
        if (status.eta) {
            this.trainingETA.textContent = `Estimated time remaining: ${status.eta}`;
        }
        
        // Add log entries for new events
        if (status.logs) {
            status.logs.forEach(log => {
                this.addLogEntry(log.level, log.message);
            });
        }
    }
    
    formatTrainingStatus(status) {
        const statusMap = {
            'initializing': 'Initializing...',
            'loading_data': 'Loading training data...',
            'training': 'Training model...',
            'validating': 'Validating model...',
            'saving': 'Saving model...',
            'completed': 'Training completed!',
            'failed': 'Training failed'
        };
        
        return statusMap[status] || status;
    }
    
    addLogEntry(level, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-${level}">${this.escapeHtml(message)}</span>
        `;
        
        this.trainingLog.appendChild(logEntry);
        this.trainingLog.scrollTop = this.trainingLog.scrollHeight;
    }
    
    async stopTraining() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/model/training/stop`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.showMessage('Training stopped successfully', 'warning');
                this.addLogEntry('warning', 'Training stopped by user');
                this.stopPolling();
            } else {
                this.showMessage(data.message || 'Failed to stop training', 'error');
            }
        } catch (error) {
            console.error('Failed to stop training:', error);
            this.showMessage('Failed to stop training', 'error');
        }
    }
    
    stopPolling() {
        if (this.trainingInterval) {
            clearInterval(this.trainingInterval);
            this.trainingInterval = null;
        }
    }
    
    handleTrainingComplete(status) {
        if (status.status === 'completed') {
            this.showMessage('🎉 Model training completed successfully!', 'success');
            this.addLogEntry('success', 'Training completed successfully');
            this.addLogEntry('info', `Final accuracy: ${status.final_accuracy || 'N/A'}`);
            this.addLogEntry('info', `Model saved to: ${status.model_path || 'default location'}`);
        } else {
            this.showMessage('❌ Model training failed', 'error');
            this.addLogEntry('error', 'Training failed');
            if (status.error) {
                this.addLogEntry('error', status.error);
            }
        }
        
        // Reset training button
        this.startTrainingBtn.disabled = false;
        this.startTrainingBtn.innerHTML = '<span class="material-icons">play_arrow</span> Start Model Training';
        
        // Refresh training data
        setTimeout(() => {
            this.loadTrainingData();
        }, 2000);
    }
    
    async refreshTrainingData() {
        this.showMessage('Refreshing training data...', 'info');
        await this.loadTrainingData();
        await this.loadDataPreview();
    }
    
    showMessage(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message status-${type}`;
        this.statusMessage.style.display = 'block';
        
        setTimeout(() => {
            this.statusMessage.style.display = 'none';
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Navigation functions
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function goToDocuments() {
    window.location.href = 'documents.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

// Training control functions
function startTraining() {
    trainingManager.startTraining();
}

function stopTraining() {
    trainingManager.stopTraining();
}

function refreshTrainingData() {
    trainingManager.refreshTrainingData();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trainingManager = new ModelTrainingManager();
});