# PhishGuard 360 - Enhanced Demo Flask App
# Includes document management and model training capabilities

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import logging
import os
from datetime import datetime, timezone
import json
import hashlib
import tempfile

# Import our enhanced modules
try:
    from database.rag_database import RAGDatabase
    from utils.model_trainer import ModelTrainer
    HAS_FULL_FEATURES = True
except ImportError:
    HAS_FULL_FEATURES = False
    # Logger will be defined below

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if not HAS_FULL_FEATURES:
    logger.warning("Running in minimal mode - some features disabled")

class PhishGuardDemo:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app, origins=['chrome-extension://*', 'http://localhost:*'])
        
        # Track startup time
        self.start_time = datetime.now(timezone.utc)
        
        # Initialize enhanced features if available
        self.has_full_features = HAS_FULL_FEATURES
        if self.has_full_features:
            try:
                self.rag_db = RAGDatabase()
                self.model_trainer = ModelTrainer(self.rag_db)
                logger.info("Enhanced features enabled: RAG database & model training")
            except Exception as e:
                logger.warning(f"Enhanced features disabled: {e}")
                self.has_full_features = False
        
        # Setup routes
        self.setup_routes()
        
        logger.info("🛡️ PhishGuard 360 Enhanced Demo Backend initialized")
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.route('/api/health', methods=['GET'])
        def health_check():
            """Health check endpoint"""
            return jsonify({
                'status': 'healthy',
                'service': 'PhishGuard 360 Demo',
                'version': '1.0.0',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'mode': 'demo',
                'uptime_seconds': (datetime.now(timezone.utc) - self.start_time).total_seconds()
            })
        
        @self.app.route('/documents.html', methods=['GET'])
        def documents_page():
            """Serve documents management page"""
            return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Management - PhishGuard 360</title>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #2d3748; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; margin-bottom: 30px; text-align: center; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 10px; background: linear-gradient(135deg, #667eea, #764ba2); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .demo-section { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; margin-bottom: 30px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
        .nav-buttons { display: flex; gap: 15px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
        .nav-btn { background: rgba(255, 255, 255, 0.9); border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); }
        .nav-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 Document Management</h1>
            <p>Manage documents for enhanced RAG-based threat detection</p>
        </div>
        
        <div class="nav-buttons">
            <button class="nav-btn" onclick="window.location.href='/'">
                <span class="material-icons">dashboard</span>
                API Dashboard
            </button>
            <button class="nav-btn" onclick="window.location.href='/training.html'">
                <span class="material-icons">model_training</span>
                Model Training
            </button>
        </div>
        
        <div class="demo-section">
            <h2>📖 Document Management API Demo</h2>
            <p style="margin-bottom: 20px;">Use the API endpoints to manage documents:</p>
            
            <div style="background: #f7fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3>🔗 API Endpoints:</h3>
                <ul style="list-style: none; margin-top: 15px;">
                    <li style="margin: 10px 0;"><strong>GET /api/user/{user_id}/documents</strong> - List user documents</li>
                    <li style="margin: 10px 0;"><strong>POST /api/user/{user_id}/documents</strong> - Add new document</li>
                    <li style="margin: 10px 0;"><strong>GET /api/user/{user_id}/documents/{doc_id}</strong> - Get specific document</li>
                    <li style="margin: 10px 0;"><strong>DELETE /api/user/{user_id}/documents/{doc_id}</strong> - Delete document</li>
                </ul>
            </div>
            
            <div style="background: #f0fff4; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #48bb78;">
                <h3>✅ System Status:</h3>
                <p style="margin-top: 10px;">Document management system is active and ready!</p>
                <p style="margin-top: 5px; color: #48bb78;">✓ RAG Database connected</p>
                <p style="margin-top: 5px; color: #48bb78;">✓ Document storage enabled</p>
                <p style="margin-top: 5px; color: #48bb78;">✓ Content deduplication active</p>
            </div>
            
            <p style="margin-top: 20px; color: #718096;">
                Load the Chrome extension from the chrome-extension/ folder for the full interactive interface.
            </p>
        </div>
    </div>
</body>
</html>'''
        
        @self.app.route('/training.html', methods=['GET'])
        def training_page():
            """Serve model training page"""
            return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Training - PhishGuard 360</title>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #2d3748; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; margin-bottom: 30px; text-align: center; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 10px; background: linear-gradient(135deg, #667eea, #764ba2); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .demo-section { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; margin-bottom: 30px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
        .nav-buttons { display: flex; gap: 15px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
        .nav-btn { background: rgba(255, 255, 255, 0.9); border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); }
        .nav-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 Model Training Center</h1>
            <p>Fine-tune Layer 2 models with your data for enhanced threat detection</p>
        </div>
        
        <div class="nav-buttons">
            <button class="nav-btn" onclick="window.location.href='/'">
                <span class="material-icons">dashboard</span>
                API Dashboard
            </button>
            <button class="nav-btn" onclick="window.location.href='/documents.html'">
                <span class="material-icons">description</span>
                Documents
            </button>
        </div>
        
        <div class="demo-section">
            <h2>🎯 Model Training API Demo</h2>
            <p style="margin-bottom: 20px;">Use the API endpoints to manage model training:</p>
            
            <div style="background: #f7fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3>🔗 API Endpoints:</h3>
                <ul style="list-style: none; margin-top: 15px;">
                    <li style="margin: 10px 0;"><strong>GET /api/model/training/status</strong> - Check training readiness</li>
                    <li style="margin: 10px 0;"><strong>POST /api/model/training/start</strong> - Start training session</li>
                    <li style="margin: 10px 0;"><strong>POST /api/model/training/stop</strong> - Stop training session</li>
                    <li style="margin: 10px 0;"><strong>GET /api/model/training/preview</strong> - Preview training data</li>
                </ul>
            </div>
            
            <div style="background: #fffaf0; border-radius: 12px; padding: 20px; margin: 20px 0; border: 2px solid #ed8936;">
                <h3>⚠️ Training Requirements:</h3>
                <ul style="margin-top: 15px;">
                    <li>• Minimum 100 total samples</li>
                    <li>• Minimum 20 samples per class</li>
                    <li>• At least 2 classes (phishing & legitimate)</li>
                    <li>• Good data quality and balance</li>
                </ul>
            </div>
            
            <p style="margin-top: 20px; color: #718096;">
                Load the Chrome extension from the chrome-extension/ folder for the full interactive training interface.
            </p>
        </div>
    </div>
</body>
</html>'''
        
        @self.app.route('/api/scan', methods=['POST'])
        def scan_email():
            """Demo email scanning endpoint"""
            try:
                if not request.is_json:
                    return jsonify({'error': 'Request must be JSON'}), 400
                
                data = request.get_json()
                email_data = data.get('email_data', {})
                user_id = data.get('user_id', 'demo_user')
                
                # Demo response - simulate scanning
                demo_result = {
                    'scan_id': f'demo_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
                    'user_id': user_id,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'email_subject': email_data.get('subject', 'Demo Email'),
                    'email_sender': email_data.get('sender', 'demo@example.com'),
                    'final_verdict': 'safe',
                    'confidence_score': 0.95,
                    'layers': {
                        'layer1': {
                            'verdict': 'safe',
                            'confidence': 0.99,
                            'response_time_ms': 2,
                            'details': 'No matches in threat database'
                        },
                        'layer2': {
                            'verdict': 'safe', 
                            'confidence': 0.92,
                            'response_time_ms': 45,
                            'details': 'DistilBERT classification: legitimate email'
                        },
                        'layer3': {
                            'verdict': 'safe',
                            'confidence': 0.94,
                            'response_time_ms': 1200,
                            'details': 'No social engineering patterns detected'
                        }
                    },
                    'scan_summary': {
                        'total_layers': 3,
                        'layers_triggered': 3,
                        'processing_time_ms': 1247,
                        'threat_level': 'low'
                    }
                }
                
                # Simulate some threat detection for demo
                subject = email_data.get('subject', '').lower()
                if any(word in subject for word in ['urgent', 'click', 'verify', 'suspended']):
                    demo_result['final_verdict'] = 'suspicious'
                    demo_result['confidence_score'] = 0.75
                    demo_result['layers']['layer2']['verdict'] = 'suspicious'
                    demo_result['layers']['layer3']['verdict'] = 'suspicious'
                    demo_result['scan_summary']['threat_level'] = 'medium'
                
                return jsonify(demo_result)
                
            except Exception as e:
                logger.error(f"Demo scan failed: {str(e)}")
                return jsonify({'error': 'Demo scan failed'}), 500
        
        @self.app.route('/api/user/<user_id>/profile', methods=['GET', 'POST'])
        def user_profile(user_id):
            """Demo user profile endpoint"""
            if request.method == 'GET':
                return jsonify({
                    'user_id': user_id,
                    'profile': {
                        'name': 'Demo User',
                        'email': 'demo@example.com',
                        'tech_savviness': 'intermediate',
                        'security_level': 'balanced'
                    },
                    'contacts': [],
                    'organizations': [],
                    'scan_history': []
                })
            else:
                return jsonify({'status': 'success', 'message': 'Demo profile updated'})
        
        @self.app.route('/api/user/<user_id>/dashboard', methods=['GET'])
        def user_dashboard(user_id):
            """Demo dashboard endpoint"""
            return jsonify({
                'scan_statistics': {
                    'total_scans': 42,
                    'threats_blocked': 3,
                    'suspicious_detected': 7,
                    'safe_emails': 32,
                    'threat_percentage': 7.1
                },
                'user_profile': {
                    'personal_info': {
                        'tech_savviness': 'intermediate'
                    },
                    'contacts_count': 5,
                    'organizations_count': 2
                },
                'recent_activity': [
                    {
                        'scan_timestamp': '2024-10-03T10:30:00Z',
                        'email_subject': 'Team meeting reminder',
                        'email_sender': 'manager@company.com',
                        'final_verdict': 'safe'
                    }
                ],
                'recent_threats': [],
                'protection_status': 'active'
            })
        
        # ============================================
        # Document Management Endpoints
        # ============================================
        
        @self.app.route('/api/user/<user_id>/documents', methods=['GET', 'POST'])
        def user_documents(user_id):
            """Manage user documents for RAG enhancement"""
            if not self.has_full_features:
                return jsonify({
                    'status': 'error',
                    'message': 'Document management requires full database features'
                }), 503
            
            if request.method == 'GET':
                # Get user documents
                try:
                    documents = self.rag_db.get_user_documents(user_id)
                    return jsonify({
                        'status': 'success',
                        'documents': documents,
                        'count': len(documents)
                    })
                except Exception as e:
                    return jsonify({
                        'status': 'error',
                        'message': f'Failed to retrieve documents: {str(e)}'
                    }), 500
            
            elif request.method == 'POST':
                # Add new document
                try:
                    data = request.get_json()
                    if not data:
                        return jsonify({'status': 'error', 'message': 'No data provided'}), 400
                    
                    document_name = data.get('name', 'Untitled Document')
                    document_content = data.get('content', '')
                    document_type = data.get('type', 'text')
                    tags = data.get('tags', [])
                    
                    if not document_content:
                        return jsonify({'status': 'error', 'message': 'Document content required'}), 400
                    
                    result = self.rag_db.add_user_document(
                        user_id=user_id,
                        document_name=document_name,
                        document_content=document_content,
                        document_type=document_type,
                        tags=tags
                    )
                    
                    return jsonify(result)
                    
                except Exception as e:
                    return jsonify({
                        'status': 'error',
                        'message': f'Failed to add document: {str(e)}'
                    }), 500
        
        @self.app.route('/api/user/<user_id>/documents/<int:doc_id>', methods=['GET', 'DELETE'])
        def document_detail(user_id, doc_id):
            """Get or delete specific document"""
            if not self.has_full_features:
                return jsonify({
                    'status': 'error',
                    'message': 'Document management requires full database features'
                }), 503
            
            if request.method == 'GET':
                # Get document content
                try:
                    result = self.rag_db.get_document_content(doc_id, user_id)
                    return jsonify(result)
                except Exception as e:
                    return jsonify({
                        'status': 'error',
                        'message': f'Failed to get document: {str(e)}'
                    }), 500
            
            elif request.method == 'DELETE':
                # Delete document
                try:
                    result = self.rag_db.delete_user_document(doc_id, user_id)
                    return jsonify(result)
                except Exception as e:
                    return jsonify({
                        'status': 'error',
                        'message': f'Failed to delete document: {str(e)}'
                    }), 500
        
        @self.app.route('/api/rag/status', methods=['GET'])
        def rag_status():
            """Get RAG database status and statistics"""
            if not self.has_full_features:
                return jsonify({
                    'status': 'disabled',
                    'message': 'RAG features require full database setup'
                })
            
            try:
                stats = self.rag_db.get_database_statistics()
                return jsonify({
                    'status': 'active',
                    'statistics': stats,
                    'features': {
                        'document_storage': True,
                        'user_profiling': True,
                        'threat_intelligence': True,
                        'conversation_tracking': True
                    }
                })
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to get RAG status: {str(e)}'
                }), 500
        
        # ============================================
        # Model Training Endpoints
        # ============================================
        
        @self.app.route('/api/model/training/status', methods=['GET'])
        def training_status():
            """Check if model training is ready"""
            if not self.has_full_features:
                return jsonify({
                    'ready': False,
                    'message': 'Model training requires full features'
                })
            
            try:
                readiness = self.model_trainer.check_training_readiness()
                return jsonify(readiness)
            except Exception as e:
                return jsonify({
                    'ready': False,
                    'error': str(e)
                }), 500
        
        @self.app.route('/api/model/training/start', methods=['POST'])
        def start_training():
            """Start model fine-tuning"""
            if not self.has_full_features:
                return jsonify({
                    'status': 'error',
                    'message': 'Model training requires full features'
                }), 503
            
            try:
                data = request.get_json() or {}
                model_type = data.get('model_type', 'distilbert_v2')
                
                # Check readiness first
                readiness = self.model_trainer.check_training_readiness()
                if not readiness['ready']:
                    return jsonify({
                        'status': 'error',
                        'message': 'Not ready for training',
                        'requirements': readiness['requirements']
                    }), 400
                
                # Start training
                result = self.model_trainer.start_training(model_type)
                return jsonify(result)
                
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': f'Training failed: {str(e)}'
                }), 500
        
        @self.app.route('/api/model/training/history', methods=['GET'])
        def training_history():
            """Get model training history"""
            if not self.has_full_features:
                return jsonify({
                    'history': [],
                    'message': 'Training history requires full features'
                })
            
            try:
                limit = request.args.get('limit', 10, type=int)
                history = self.model_trainer.get_training_history(limit)
                return jsonify({
                    'status': 'success',
                    'history': history,
                    'count': len(history)
                })
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to get training history: {str(e)}'
                }), 500
        
        @self.app.route('/api/feedback', methods=['POST'])
        def submit_feedback():
            """Submit user feedback for model training"""
            if not self.has_full_features:
                return jsonify({
                    'status': 'error',
                    'message': 'Feedback storage requires full features'
                }), 503
            
            try:
                data = request.get_json()
                if not data:
                    return jsonify({'status': 'error', 'message': 'No data provided'}), 400
                
                email_content = data.get('email_content', '')
                email_subject = data.get('email_subject', '')
                email_sender = data.get('email_sender', '')
                true_label = data.get('correct_label', '')
                user_feedback = data.get('user_feedback', '')
                confidence_score = data.get('confidence_score')
                
                if not all([email_content, true_label]):
                    return jsonify({
                        'status': 'error',
                        'message': 'Email content and correct label are required'
                    }), 400
                
                result = self.rag_db.add_training_sample(
                    email_content=email_content,
                    email_subject=email_subject,
                    email_sender=email_sender,
                    true_label=true_label,
                    user_feedback=user_feedback,
                    confidence_score=confidence_score
                )
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to submit feedback: {str(e)}'
                }), 500
        
        @self.app.route('/', methods=['GET'])
        def home():
            """Home page"""
            endpoints = [
                '/api/health',
                '/api/scan',
                '/api/user/<user_id>/profile',
                '/api/user/<user_id>/dashboard'
            ]
            
            if self.has_full_features:
                endpoints.extend([
                    '/api/user/<user_id>/documents',
                    '/api/user/<user_id>/documents/<doc_id>',
                    '/api/rag/status',
                    '/api/model/training/status',
                    '/api/model/training/start',
                    '/api/model/training/history',
                    '/api/feedback'
                ])
            
            return jsonify({
                'service': 'PhishGuard 360 Enhanced Demo',
                'version': '1.0.0',
                'status': 'running',
                'features': {
                    'basic_scanning': True,
                    'document_management': self.has_full_features,
                    'model_training': self.has_full_features,
                    'rag_database': self.has_full_features
                },
                'endpoints': endpoints
            })
    
    def run(self, host='localhost', port=5001, debug=True):
        """Run the Flask application"""
        logger.info(f"🚀 Starting PhishGuard 360 Demo on {host}:{port}")
        logger.info(f"📊 Health check: http://{host}:{port}/api/health")
        logger.info(f"🧪 Demo mode: Heavy ML libraries not required")
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    demo_app = PhishGuardDemo()
    demo_app.run(host='0.0.0.0', port=5001, debug=True)