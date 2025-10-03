# PhishGuard 360 - Minimal Demo Flask App
# Quick start version without heavy ML dependencies

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from datetime import datetime, timezone
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PhishGuardDemo:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app, origins=['chrome-extension://*', 'http://localhost:*'])
        
        # Track startup time
        self.start_time = datetime.now(timezone.utc)
        
        # Setup routes
        self.setup_routes()
        
        logger.info("🛡️ PhishGuard 360 Demo Backend initialized")
    
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
        
        @self.app.route('/', methods=['GET'])
        def home():
            """Home page"""
            return jsonify({
                'service': 'PhishGuard 360 Demo',
                'version': '1.0.0',
                'status': 'running',
                'endpoints': [
                    '/api/health',
                    '/api/scan',
                    '/api/user/<user_id>/profile',
                    '/api/user/<user_id>/dashboard'
                ]
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