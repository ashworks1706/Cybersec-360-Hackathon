// PhishGuard 360 - Scan History Page JavaScript

class ScanHistoryManager {
    constructor() {
        this.allScans = [];
        this.filteredScans = [];
        this.currentFilter = 'all';
        this.currentSort = { field: 'date', order: 'desc' };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.userId = null;

        this.initializeElements();
        this.setupEventListeners();
        this.loadHistory();

        console.log('🛡️ PhishGuard Scan History Manager initialized');
    }

    initializeElements() {
        // Stats
        this.totalScansEl = document.getElementById('totalScans');
        this.safeEmailsEl = document.getElementById('safeEmails');
        this.threatsBlockedEl = document.getElementById('threatsBlocked');
        this.suspiciousEmailsEl = document.getElementById('suspiciousEmails');

        // Search and filters
        this.searchInput = document.getElementById('searchInput');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.refreshBtn = document.getElementById('refreshBtn');

        // Containers
        this.loadingContainer = document.getElementById('loadingContainer');
        this.errorContainer = document.getElementById('errorContainer');
        this.emptyContainer = document.getElementById('emptyContainer');
        this.historyTableContainer = document.getElementById('historyTableContainer');
        this.historyTableBody = document.getElementById('historyTableBody');

        // Pagination
        this.paginationContainer = document.getElementById('paginationContainer');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.currentPageEl = document.getElementById('currentPage');
        this.totalPagesEl = document.getElementById('totalPages');

        // Modal
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalBody = document.getElementById('modalBody');
        this.modalClose = document.getElementById('modalClose');

        // Retry button
        this.retryBtn = document.getElementById('retryBtn');
    }

    setupEventListeners() {
        // Search
        this.searchInput.addEventListener('input', () => {
            this.applyFilters();
        });

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.applyFilters();
            });
        });

        // Refresh button
        this.refreshBtn.addEventListener('click', () => {
            this.loadHistory();
        });

        // Retry button
        this.retryBtn.addEventListener('click', () => {
            this.loadHistory();
        });

        // Pagination
        this.prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });

        this.nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredScans.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        });

        // Sortable columns
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.dataset.sort;
                this.sortScans(sortField);
            });
        });

        // Modal close
        this.modalClose.addEventListener('click', () => {
            this.closeModal();
        });

        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.closeModal();
            }
        });
    }

    async loadHistory() {
        this.showLoading();

        try {
            // Get user ID from storage
            const userId = await this.getUserId();
            this.userId = userId;

            // Load scans from Chrome storage
            const localScans = await this.getLocalScans();

            // Load scans from Flask backend
            let backendScans = [];
            try {
                backendScans = await this.getBackendScans(userId);
            } catch (error) {
                console.warn('Failed to load backend scans:', error);
                // Continue with local scans only
            }

            // Merge and deduplicate scans
            this.allScans = this.mergeScans(localScans, backendScans);

            if (this.allScans.length === 0) {
                this.showEmpty();
            } else {
                this.updateStatistics();
                this.applyFilters();
                this.showTable();
            }

        } catch (error) {
            console.error('Failed to load scan history:', error);
            this.showError(error.message);
        }
    }

    async getUserId() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['userId'], (result) => {
                resolve(result.userId || 'anonymous_' + Date.now());
            });
        });
    }

    async getLocalScans() {
        return new Promise((resolve) => {
            // Use LOCAL storage for scan history (larger limit, avoids quota errors)
            chrome.storage.local.get(['scanHistory'], (result) => {
                const scans = result.scanHistory || [];
                console.log(`Loaded ${scans.length} scans from local storage`);
                resolve(scans);
            });
        });
    }

    async getBackendScans(userId) {
        // Use background script as proxy to call Flask backend
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'FETCH_BACKEND_SCAN_HISTORY',
                userId: userId,
                limit: 100,
                offset: 0
            });

            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to fetch backend scans');
            }

            const scans = response.data?.scans || [];
            console.log(`Loaded ${scans.length} scans from backend via background script`);
            return scans;

        } catch (error) {
            console.error('Failed to get backend scans:', error);
            throw error;
        }
    }

    mergeScans(localScans, backendScans) {
        // Combine both sources
        const allScans = [...localScans, ...backendScans];

        // Deduplicate by scan_id
        const uniqueScans = [];
        const seenIds = new Set();

        for (const scan of allScans) {
            const scanId = scan.scan_id || scan.scanId;
            if (scanId && !seenIds.has(scanId)) {
                seenIds.add(scanId);
                uniqueScans.push(this.normalizeScan(scan));
            }
        }

        // Sort by timestamp (newest first)
        uniqueScans.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.created_at).getTime();
            const timeB = new Date(b.timestamp || b.created_at).getTime();
            return timeB - timeA;
        });

        console.log(`Total unique scans: ${uniqueScans.length}`);
        return uniqueScans;
    }

    normalizeScan(scan) {
        // Normalize scan data from different sources
        return {
            scanId: scan.scan_id || scan.scanId,
            timestamp: scan.scan_timestamp || scan.timestamp || scan.created_at,
            emailData: scan.emailData || scan.email_data || {
                sender: scan.email_sender || 'Unknown',
                subject: scan.email_subject || 'No subject',
                date: scan.email_date || scan.timestamp
            },
            finalVerdict: scan.finalVerdict || scan.final_verdict || 'unknown',
            threatLevel: scan.threatLevel || scan.threat_level || 'unknown',
            confidenceScore: scan.confidenceScore || scan.confidence_score || 0,
            layers: scan.layers || {},
            processingTime: scan.processingTime || scan.processing_time || 0
        };
    }

    updateStatistics() {
        const stats = {
            total: this.allScans.length,
            safe: 0,
            threats: 0,
            suspicious: 0
        };

        this.allScans.forEach(scan => {
            if (scan.finalVerdict === 'safe') stats.safe++;
            else if (scan.finalVerdict === 'threat') stats.threats++;
            else stats.suspicious++;
        });

        this.totalScansEl.textContent = stats.total;
        this.safeEmailsEl.textContent = stats.safe;
        this.threatsBlockedEl.textContent = stats.threats;
        this.suspiciousEmailsEl.textContent = stats.suspicious;
    }

    applyFilters() {
        const searchTerm = this.searchInput.value.toLowerCase();

        this.filteredScans = this.allScans.filter(scan => {
            // Filter by verdict
            if (this.currentFilter !== 'all') {
                if (this.currentFilter === 'suspicious') {
                    if (scan.finalVerdict === 'safe' || scan.finalVerdict === 'threat') {
                        return false;
                    }
                } else if (scan.finalVerdict !== this.currentFilter) {
                    return false;
                }
            }

            // Filter by search term
            if (searchTerm) {
                const sender = (scan.emailData?.sender || '').toLowerCase();
                const subject = (scan.emailData?.subject || '').toLowerCase();
                if (!sender.includes(searchTerm) && !subject.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        this.currentPage = 1;
        this.renderTable();
    }

    sortScans(field) {
        if (this.currentSort.field === field) {
            this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.order = 'desc';
        }

        this.filteredScans.sort((a, b) => {
            let valueA, valueB;

            switch (field) {
                case 'date':
                    valueA = new Date(a.timestamp).getTime();
                    valueB = new Date(b.timestamp).getTime();
                    break;
                case 'sender':
                    valueA = (a.emailData?.sender || '').toLowerCase();
                    valueB = (b.emailData?.sender || '').toLowerCase();
                    break;
                case 'subject':
                    valueA = (a.emailData?.subject || '').toLowerCase();
                    valueB = (b.emailData?.subject || '').toLowerCase();
                    break;
                case 'verdict':
                    valueA = a.finalVerdict;
                    valueB = b.finalVerdict;
                    break;
                case 'confidence':
                    valueA = a.confidenceScore;
                    valueB = b.confidenceScore;
                    break;
                default:
                    return 0;
            }

            if (this.currentSort.order === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });

        this.renderTable();
    }

    renderTable() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageScans = this.filteredScans.slice(startIndex, endIndex);

        this.historyTableBody.innerHTML = '';

        pageScans.forEach(scan => {
            const row = this.createTableRow(scan);
            this.historyTableBody.appendChild(row);
        });

        this.updatePagination();
    }

    createTableRow(scan) {
        const tr = document.createElement('tr');

        // Date & Time
        const dateTd = document.createElement('td');
        const date = new Date(scan.timestamp);
        dateTd.textContent = date.toLocaleString();
        tr.appendChild(dateTd);

        // Sender
        const senderTd = document.createElement('td');
        senderTd.textContent = this.truncateText(scan.emailData?.sender || 'Unknown', 30);
        senderTd.title = scan.emailData?.sender || 'Unknown';
        tr.appendChild(senderTd);

        // Subject
        const subjectTd = document.createElement('td');
        subjectTd.textContent = this.truncateText(scan.emailData?.subject || 'No subject', 40);
        subjectTd.title = scan.emailData?.subject || 'No subject';
        tr.appendChild(subjectTd);

        // Verdict
        const verdictTd = document.createElement('td');
        const verdictBadge = document.createElement('span');
        verdictBadge.className = `verdict-badge ${scan.finalVerdict}`;
        verdictBadge.textContent = scan.finalVerdict;
        verdictTd.appendChild(verdictBadge);
        tr.appendChild(verdictTd);

        // Confidence
        const confidenceTd = document.createElement('td');
        const confidenceBar = this.createConfidenceBar(scan.confidenceScore);
        confidenceTd.appendChild(confidenceBar);
        tr.appendChild(confidenceTd);

        // Layers
        const layersTd = document.createElement('td');
        const layersStatus = this.createLayersStatus(scan.layers);
        layersTd.appendChild(layersStatus);
        tr.appendChild(layersTd);

        // Actions
        const actionsTd = document.createElement('td');
        const viewBtn = document.createElement('button');
        viewBtn.className = 'view-details-btn';
        viewBtn.textContent = 'View Details';
        viewBtn.addEventListener('click', () => {
            this.showDetails(scan);
        });
        actionsTd.appendChild(viewBtn);
        tr.appendChild(actionsTd);

        return tr;
    }

    createConfidenceBar(confidence) {
        const container = document.createElement('div');
        container.className = 'confidence-bar';

        const progress = document.createElement('div');
        progress.className = 'confidence-progress';

        const fill = document.createElement('div');
        fill.className = 'confidence-fill';
        fill.style.width = (confidence * 100) + '%';

        progress.appendChild(fill);

        const value = document.createElement('span');
        value.className = 'confidence-value';
        value.textContent = Math.round(confidence * 100) + '%';

        container.appendChild(progress);
        container.appendChild(value);

        return container;
    }

    createLayersStatus(layers) {
        const container = document.createElement('div');
        container.className = 'layers-status';

        ['layer1', 'layer2', 'layer3'].forEach((layerKey, index) => {
            const layer = layers[layerKey];
            const icon = document.createElement('div');
            icon.className = 'layer-icon';
            icon.textContent = (index + 1);

            if (layer) {
                // Layer 3 uses 'verdict' instead of 'status'
                const status = layerKey === 'layer3' ? layer.verdict : layer.status;

                if (status === 'clean' || status === 'safe' || status === 'benign') {
                    icon.classList.add('safe');
                } else if (status === 'threat' || status === 'danger') {
                    icon.classList.add('danger');
                } else {
                    icon.classList.add('warning');
                }

                // Display proper status in tooltip
                const displayStatus = status || 'N/A';
                icon.title = `Layer ${index + 1}: ${displayStatus}`;
            } else {
                icon.style.background = '#e2e8f0';
                icon.style.color = '#cbd5e0';
                icon.title = `Layer ${index + 1}: Not executed`;
            }

            container.appendChild(icon);
        });

        return container;
    }

    showDetails(scan) {
        const detailsHTML = `
            <div style="margin-bottom: 24px;">
                <h4 style="font-size: 18px; color: #2d3748; margin-bottom: 12px;">Email Information</h4>
                <div style="background: #f7fafc; padding: 16px; border-radius: 8px;">
                    <p style="margin-bottom: 8px;"><strong>From:</strong> ${scan.emailData?.sender || 'Unknown'}</p>
                    <p style="margin-bottom: 8px;"><strong>Subject:</strong> ${scan.emailData?.subject || 'No subject'}</p>
                    <p style="margin-bottom: 8px;"><strong>Date:</strong> ${new Date(scan.emailData?.date || scan.timestamp).toLocaleString()}</p>
                    <p style="margin-bottom: 0;"><strong>Scan ID:</strong> ${scan.scanId}</p>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h4 style="font-size: 18px; color: #2d3748; margin-bottom: 12px;">Scan Results</h4>
                <div style="background: #f7fafc; padding: 16px; border-radius: 8px;">
                    <p style="margin-bottom: 8px;"><strong>Final Verdict:</strong> <span class="verdict-badge ${scan.finalVerdict}">${scan.finalVerdict}</span></p>
                    <p style="margin-bottom: 8px;"><strong>Threat Level:</strong> ${scan.threatLevel}</p>
                    <p style="margin-bottom: 8px;"><strong>Confidence Score:</strong> ${Math.round(scan.confidenceScore * 100)}%</p>
                    <p style="margin-bottom: 0;"><strong>Processing Time:</strong> ${scan.processingTime?.toFixed(2) || 'N/A'} seconds</p>
                </div>
            </div>

            <div>
                <h4 style="font-size: 18px; color: #2d3748; margin-bottom: 12px;">Layer Analysis</h4>
                ${this.createLayerDetailsHTML(scan.layers)}
            </div>
        `;

        this.modalBody.innerHTML = detailsHTML;
        this.modalOverlay.style.display = 'flex';
    }

    createLayerDetailsHTML(layers) {
        let html = '';

        ['layer1', 'layer2', 'layer3'].forEach((layerKey, index) => {
            const layer = layers[layerKey];
            const layerNames = ['Public Database Check', 'AI Classification', 'Detective Agent'];

            if (layerKey === 'layer3' && layer) {
                // Special rendering for Layer 3 with all its unique fields
                html += `
                    <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                        <h5 style="font-size: 16px; color: #2d3748; margin-bottom: 8px;">Layer 3: ${layerNames[index]}</h5>
                        <p style="margin-bottom: 4px;"><strong>Verdict:</strong> <span class="verdict-badge ${layer.verdict || 'unknown'}">${layer.verdict || 'N/A'}</span></p>
                        <p style="margin-bottom: 4px;"><strong>Threat Level:</strong> ${layer.threat_level || 'N/A'}</p>
                        <p style="margin-bottom: 4px;"><strong>Confidence:</strong> ${layer.confidence ? Math.round(layer.confidence * 100) + '%' : 'N/A'}</p>
                        <p style="margin-bottom: 4px;"><strong>Social Engineering Score:</strong> ${layer.social_engineering_score || 0}%</p>
                        <p style="margin-bottom: 4px;"><strong>Impersonation Risk:</strong> ${layer.impersonation_risk || 'N/A'}</p>
                        <p style="margin-bottom: 4px;"><strong>Personal Context:</strong> ${layer.personal_context || 'N/A'}</p>
                        ${layer.detailed_analysis ? `
                            <div style="margin-top: 12px;">
                                <strong>Detailed Analysis:</strong>
                                <p style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; white-space: pre-wrap; color: #4a5568; font-size: 14px;">${layer.detailed_analysis}</p>
                            </div>
                        ` : ''}
                        ${layer.recommended_action ? `
                            <div style="margin-top: 12px;">
                                <strong>Recommended Action:</strong>
                                <p style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; color: #4a5568; font-size: 14px;">${layer.recommended_action}</p>
                            </div>
                        ` : ''}
                        ${layer.tactics_identified && layer.tactics_identified.length > 0 ? `
                            <div style="margin-top: 12px;">
                                <strong>Tactics Identified:</strong>
                                <ul style="margin-top: 8px; padding-left: 20px; color: #4a5568; font-size: 14px;">
                                    ${layer.tactics_identified.map(tactic => `<li style="margin-bottom: 4px;">${tactic}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                // Standard rendering for Layer 1 and Layer 2
                html += `
                    <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                        <h5 style="font-size: 16px; color: #2d3748; margin-bottom: 8px;">Layer ${index + 1}: ${layerNames[index]}</h5>
                        ${layer ? `
                            <p style="margin-bottom: 4px;"><strong>Status:</strong> ${layer.status || layer.verdict || 'N/A'}</p>
                            <p style="margin-bottom: 4px;"><strong>Confidence:</strong> ${layer.confidence ? Math.round(layer.confidence * 100) + '%' : 'N/A'}</p>
                            ${layer.verdict && layerKey !== 'layer3' ? `<p style="margin-bottom: 0;"><strong>Verdict:</strong> ${layer.verdict}</p>` : ''}
                        ` : '<p style="margin: 0; color: #718096;">Not executed</p>'}
                    </div>
                `;
            }
        });

        return html;
    }

    closeModal() {
        this.modalOverlay.style.display = 'none';
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredScans.length / this.itemsPerPage);

        this.currentPageEl.textContent = this.currentPage;
        this.totalPagesEl.textContent = totalPages;

        this.prevBtn.disabled = this.currentPage === 1;
        this.nextBtn.disabled = this.currentPage >= totalPages;

        this.paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    showLoading() {
        this.loadingContainer.style.display = 'block';
        this.errorContainer.style.display = 'none';
        this.emptyContainer.style.display = 'none';
        this.historyTableContainer.style.display = 'none';
    }

    showError(message) {
        this.loadingContainer.style.display = 'none';
        this.errorContainer.style.display = 'block';
        this.emptyContainer.style.display = 'none';
        this.historyTableContainer.style.display = 'none';

        document.getElementById('errorMessage').textContent = message;
    }

    showEmpty() {
        this.loadingContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
        this.emptyContainer.style.display = 'block';
        this.historyTableContainer.style.display = 'none';
    }

    showTable() {
        this.loadingContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
        this.emptyContainer.style.display = 'none';
        this.historyTableContainer.style.display = 'block';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScanHistoryManager();
});
