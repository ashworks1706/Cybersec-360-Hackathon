# PhishGuard 360 - Flask Backend
# Multi-layer email phishing detection system

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from datetime import datetime
import json

# Import our detection layers
from layers.layer1_database import Layer1DatabaseChecker
from layers.layer2_model import Layer2ModelClassifier  
from layers.layer3_detective import Layer3DetectiveAgent
from database.rag_database import RAGDatabase
from utils.email_processor import EmailProcessor
from utils.security import SecurityValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PhishGuardBackend:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app, origins=['chrome-extension://*', 'http://localhost:*'])
        
        # Initialize detection layers
        self.layer1 = Layer1DatabaseChecker()
        self.layer2 = Layer2ModelClassifier()
        self.layer3 = Layer3DetectiveAgent()
        
        # Initialize database and utilities
        self.rag_db = RAGDatabase()
        self.email_processor = EmailProcessor()
        self.security = SecurityValidator()
        
        # Setup routes
        self.setup_routes()
        
        logger.info("🛡️ PhishGuard 360 Backend initialized")
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.route('/api/health', methods=['GET'])
        def health_check():
            """Health check endpoint"""
            return jsonify({
                'status': 'healthy',
                'service': 'PhishGuard 360',
                'version': '1.0.0',
                'timestamp': datetime.utcnow().isoformat()
            })
        
        @self.app.route('/api/scan', methods=['POST'])
        def scan_email():
            """Main email scanning endpoint"""
            try:
                # Validate request
                if not request.is_json:
                    return jsonify({'error': 'Request must be JSON'}), 400
                
                data = request.get_json()
                email_data = data.get('email_data')
                user_id = data.get('user_id', 'anonymous')
                scan_type = data.get('scan_type', 'full')
                
                if not email_data:
                    return jsonify({'error': 'No email data provided'}), 400
                
                # Process email through security layers
                scan_result = self.process_email_scan(email_data, user_id, scan_type)
                
                return jsonify(scan_result)
                
            except Exception as e:
                logger.error(f"Scan failed: {str(e)}")
                return jsonify({
                    'error': 'Internal scan error',
                    'details': str(e) if self.app.debug else None
                }), 500
        
        @self.app.route('/api/user/<user_id>/experience', methods=['GET'])
        def get_user_experience(user_id):
            """Get user experience data for Layer 3"""
            try:
                experience = self.rag_db.get_user_experience(user_id)
                return jsonify(experience)
            except Exception as e:
                logger.error(f"Failed to get user experience: {str(e)}")
                return jsonify({'error': 'Failed to retrieve user data'}), 500
        
        @self.app.route('/api/suspect', methods=['POST'])
        def post_suspect_info():
            """Post suspect information to RAG database"""
            try:
                data = request.get_json()
                suspect_info = data.get('suspect_info')
                email_metadata = data.get('email_metadata')
                
                result = self.rag_db.store_suspect_info(suspect_info, email_metadata)
                return jsonify(result)
                
            except Exception as e:
                logger.error(f"Failed to store suspect info: {str(e)}")
                return jsonify({'error': 'Failed to store suspect information'}), 500
        
        @self.app.route('/api/feedback', methods=['POST'])
        def submit_feedback():
            """Submit user feedback for model improvement"""
            try:
                data = request.get_json()
                feedback_data = {
                    'email_metadata': data.get('email_metadata'),
                    'user_verdict': data.get('user_verdict'),
                    'scan_results': data.get('scan_results'),
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                # Store for MLOps pipeline
                self.layer2.store_feedback(feedback_data)
                
                return jsonify({'status': 'feedback_received'})
                
            except Exception as e:
                logger.error(f"Failed to process feedback: {str(e)}")
                return jsonify({'error': 'Failed to process feedback'}), 500
    
    def process_email_scan(self, email_data, user_id, scan_type):
        """Process email through all security layers"""
        scan_result = {
            'scan_id': f"scan_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{user_id}",
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'email_data': email_data,
            'layers': {},
            'final_verdict': 'analyzing',
            'threat_level': 'unknown',
            'confidence_score': 0.0,
            'processing_time': 0
        }
        
        start_time = datetime.utcnow()
        
        try:
            # Preprocess email
            processed_email = self.email_processor.process(email_data)
            
            # Layer 1: Public Database Check
            logger.info(f"Running Layer 1 scan for {scan_result['scan_id']}")
            layer1_result = self.layer1.check_email(processed_email)
            scan_result['layers']['layer1'] = layer1_result
            
            # If Layer 1 finds known spam, stop here
            if layer1_result['status'] == 'threat':
                scan_result['final_verdict'] = 'threat'
                scan_result['threat_level'] = 'high'
                scan_result['confidence_score'] = layer1_result['confidence']
                logger.info(f"Layer 1 blocked email {scan_result['scan_id']}")
                return self.finalize_scan_result(scan_result, start_time)
            
            # Layer 2: AI Model Classification
            logger.info(f"Running Layer 2 scan for {scan_result['scan_id']}")
            layer2_result = self.layer2.classify_email(processed_email)
            scan_result['layers']['layer2'] = layer2_result
            
            # If Layer 2 confidence is high for benign, stop here
            if (layer2_result['status'] == 'benign' and 
                layer2_result['confidence'] > 0.8):
                scan_result['final_verdict'] = 'safe'
                scan_result['threat_level'] = 'low'
                scan_result['confidence_score'] = layer2_result['confidence']
                logger.info(f"Layer 2 cleared email {scan_result['scan_id']}")
                return self.finalize_scan_result(scan_result, start_time)
            
            # If Layer 2 detects potential threat, proceed to Layer 3
            if (layer2_result['status'] == 'suspicious' or 
                layer2_result['confidence'] < 0.5):
                
                logger.info(f"Running Layer 3 scan for {scan_result['scan_id']}")
                layer3_result = self.layer3.analyze_email(
                    processed_email, 
                    user_id, 
                    layer2_result
                )
                scan_result['layers']['layer3'] = layer3_result
                
                # Layer 3 provides final verdict
                scan_result['final_verdict'] = layer3_result['verdict']
                scan_result['threat_level'] = layer3_result['threat_level']
                scan_result['confidence_score'] = layer3_result['confidence']
            else:
                # Layer 2 verdict is final
                scan_result['final_verdict'] = 'safe'
                scan_result['threat_level'] = 'low'
                scan_result['confidence_score'] = layer2_result['confidence']
            
            return self.finalize_scan_result(scan_result, start_time)
            
        except Exception as e:
            logger.error(f"Scan processing failed: {str(e)}")
            scan_result['final_verdict'] = 'error'
            scan_result['error'] = str(e)
            return self.finalize_scan_result(scan_result, start_time)
    
    def finalize_scan_result(self, scan_result, start_time):
        """Finalize scan result with processing time and logging"""
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        scan_result['processing_time'] = processing_time
        
        # Log scan result
        logger.info(f"Scan {scan_result['scan_id']} completed: "
                   f"verdict={scan_result['final_verdict']}, "
                   f"confidence={scan_result['confidence_score']:.2f}, "
                   f"time={processing_time:.2f}s")
        
        return scan_result
    
    def run(self, host='localhost', port=5000, debug=True):
        """Run the Flask application"""
        logger.info(f"🚀 Starting PhishGuard 360 Backend on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    # Initialize and run the backend
    backend = PhishGuardBackend()
    backend.run()