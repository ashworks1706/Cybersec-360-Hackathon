// PhishGuard 360 - Document Management JavaScript

class DocumentManager {
    constructor() {
        this.userId = 'default_user';
        this.apiBaseUrl = 'http://localhost:5001/api';
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadRAGStatus();
        this.loadUserDocuments();
        
        console.log('📚 Document Manager initialized');
    }
    
    initializeElements() {
        // Forms and inputs
        this.documentForm = document.getElementById('documentForm');
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.documentName = document.getElementById('documentName');
        this.documentType = document.getElementById('documentType');
        this.documentContent = document.getElementById('documentContent');
        this.documentTags = document.getElementById('documentTags');
        
        // Display elements
        this.statusMessage = document.getElementById('statusMessage');
        this.documentsGrid = document.getElementById('documentsGrid');
        this.documentsLoading = document.getElementById('documentsLoading');
        
        // Stats elements
        this.totalDocuments = document.getElementById('totalDocuments');
        this.totalUsers = document.getElementById('totalUsers');
        this.totalScans = document.getElementById('totalScans');
        this.threatsDetected = document.getElementById('threatsDetected');
    }
    
    setupEventListeners() {
        // Form submission
        this.documentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addDocument();
        });
        
        // File input
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFileDrop(e);
        });
    }
    
    async loadRAGStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/rag/status`);
            const data = await response.json();
            
            if (data.status === 'active' && data.statistics) {
                const stats = data.statistics;
                this.totalDocuments.textContent = stats.total_documents || 0;
                this.totalUsers.textContent = stats.total_users || 0;
                this.totalScans.textContent = stats.total_scans || 0;
                this.threatsDetected.textContent = stats.threats_detected || 0;
            } else {
                this.showMessage('RAG database features are not available', 'error');
            }
        } catch (error) {
            console.error('Failed to load RAG status:', error);
            this.showMessage('Failed to connect to RAG database', 'error');
        }
    }
    
    async loadUserDocuments() {
        try {
            this.documentsLoading.style.display = 'block';
            this.documentsGrid.innerHTML = '';
            
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/documents`);
            const data = await response.json();
            
            this.documentsLoading.style.display = 'none';
            
            if (data.status === 'success') {
                this.displayDocuments(data.documents);
            } else {
                this.showMessage(data.message || 'Failed to load documents', 'error');
            }
        } catch (error) {
            this.documentsLoading.style.display = 'none';
            console.error('Failed to load documents:', error);
            this.showMessage('Failed to load documents', 'error');
        }
    }
    
    displayDocuments(documents) {
        if (documents.length === 0) {
            this.documentsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #718096;">
                    <span class="material-icons" style="font-size: 48px; opacity: 0.5;">description</span>
                    <p style="margin-top: 20px; font-size: 1.1rem;">No documents added yet</p>
                    <p style="margin-top: 10px;">Add your first document to enhance threat detection</p>
                </div>
            `;
            return;
        }
        
        this.documentsGrid.innerHTML = documents.map(doc => `
            <div class="document-card" data-id="${doc.id}">
                <div class="document-header">
                    <div>
                        <div class="document-title">${this.escapeHtml(doc.name)}</div>
                        <div class="document-meta">
                            ${doc.type} • ${this.formatFileSize(doc.size)} • ${this.formatDate(doc.uploaded)}
                        </div>
                    </div>
                </div>
                
                <div class="document-summary">
                    ${this.escapeHtml(doc.summary)}
                </div>
                
                <div class="document-tags">
                    ${doc.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                </div>
                
                <div class="document-actions">
                    <button class="btn btn-secondary" onclick="documentManager.viewDocument(${doc.id})">
                        <span class="material-icons">visibility</span>
                        View
                    </button>
                    <button class="btn btn-danger" onclick="documentManager.deleteDocument(${doc.id})">
                        <span class="material-icons">delete</span>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    async addDocument() {
        try {
            const name = this.documentName.value.trim();
            const content = this.documentContent.value.trim();
            const type = this.documentType.value;
            const tagsText = this.documentTags.value.trim();
            const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            
            if (!name || !content) {
                this.showMessage('Document name and content are required', 'error');
                return;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    content: content,
                    type: type,
                    tags: tags
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.showMessage('Document added successfully!', 'success');
                this.documentForm.reset();
                this.loadUserDocuments();
                this.loadRAGStatus(); // Refresh stats
            } else if (data.status === 'duplicate') {
                this.showMessage('This document already exists in your library', 'error');
            } else {
                this.showMessage(data.message || 'Failed to add document', 'error');
            }
        } catch (error) {
            console.error('Failed to add document:', error);
            this.showMessage('Failed to add document', 'error');
        }
    }
    
    async viewDocument(docId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/documents/${docId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                // Create modal to show document content
                this.showDocumentModal(data);
            } else {
                this.showMessage(data.message || 'Failed to load document', 'error');
            }
        } catch (error) {
            console.error('Failed to view document:', error);
            this.showMessage('Failed to view document', 'error');
        }
    }
    
    showDocumentModal(document) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 12px;
                max-width: 80%;
                max-height: 80%;
                overflow: auto;
                padding: 30px;
                position: relative;
            ">
                <button onclick="this.closest('.modal').remove()" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #718096;
                ">×</button>
                
                <h2 style="margin-bottom: 10px; color: #2d3748;">${this.escapeHtml(document.name)}</h2>
                <p style="color: #718096; margin-bottom: 20px;">
                    Type: ${document.type} • Tags: ${document.tags.join(', ') || 'None'}
                </p>
                
                <div style="
                    white-space: pre-wrap;
                    background: #f7fafc;
                    padding: 20px;
                    border-radius: 8px;
                    max-height: 400px;
                    overflow-y: auto;
                    color: #2d3748;
                    line-height: 1.6;
                ">${this.escapeHtml(document.content)}</div>
            </div>
        `;
        
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    async deleteDocument(docId) {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/${this.userId}/documents/${docId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.showMessage('Document deleted successfully', 'success');
                this.loadUserDocuments();
                this.loadRAGStatus(); // Refresh stats
            } else {
                this.showMessage(data.message || 'Failed to delete document', 'error');
            }
        } catch (error) {
            console.error('Failed to delete document:', error);
            this.showMessage('Failed to delete document', 'error');
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }
    
    handleFileDrop(event) {
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    processFile(file) {
        // Set document name from filename
        this.documentName.value = file.name.replace(/\.[^/.]+$/, "");
        
        // Determine document type from file extension
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension === 'pdf') {
            this.documentType.value = 'text';
        } else if (['eml', 'msg'].includes(extension)) {
            this.documentType.value = 'email';
        }
        
        // Read file content
        const reader = new FileReader();
        reader.onload = (e) => {
            this.documentContent.value = e.target.result;
        };
        reader.readAsText(file);
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
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

// Navigation functions
function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function goToTraining() {
    window.location.href = 'training.html';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.documentManager = new DocumentManager();
});