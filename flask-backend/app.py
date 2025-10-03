# PhishGuard 360 - Flask Backend
# Multi-layer email phishing detection system

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from datetime import datetime, timezone
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
        
        # Track startup time for metrics
        self.start_time = datetime.now(timezone.utc)
        
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
            """Comprehensive health check endpoint for Docker health checks"""
            try:
                # Check database connectivity
                db_status = self.rag_db.health_check()
                
                # Check layer status
                layer1_status = self.layer1.is_healthy()
                layer2_status = self.layer2.is_healthy()
                layer3_status = self.layer3.is_healthy()
                
                # Overall health
                all_healthy = db_status and layer1_status and layer2_status and layer3_status
                
                health_data = {
                    'status': 'healthy' if all_healthy else 'degraded',
                    'service': 'PhishGuard 360',
                    'version': '1.0.0',
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'components': {
                        'database': 'healthy' if db_status else 'unhealthy',
                        'layer1_database': 'healthy' if layer1_status else 'unhealthy',
                        'layer2_model': 'healthy' if layer2_status else 'unhealthy',
                        'layer3_detective': 'healthy' if layer3_status else 'unhealthy'
                    },
                    'environment': os.getenv('FLASK_ENV', 'production')
                }
                
                status_code = 200 if all_healthy else 503
                return jsonify(health_data), status_code
                
            except Exception as e:
                logger.error(f"Health check failed: {e}")
                return jsonify({
                    'status': 'unhealthy',
                    'service': 'PhishGuard 360',
                    'error': str(e),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }), 503
        
        @self.app.route('/api/metrics', methods=['GET'])
        def metrics():
            """Prometheus metrics endpoint"""
            try:
                # Basic metrics for monitoring
                metrics_data = {
                    'phishguard_health_status': 1 if self.rag_db.health_check() else 0,
                    'phishguard_uptime_seconds': (datetime.now(timezone.utc) - self.start_time).total_seconds(),
                    'phishguard_total_scans': self.get_total_scans(),
                    'phishguard_threats_blocked': self.get_threats_blocked(),
                    'phishguard_layer1_response_time': self.layer1.get_avg_response_time(),
                    'phishguard_layer2_response_time': self.layer2.get_avg_response_time(),
                    'phishguard_layer3_response_time': self.layer3.get_avg_response_time()
                }
                
                # Convert to Prometheus format
                prometheus_metrics = []
                for key, value in metrics_data.items():
                    prometheus_metrics.append(f"{key} {value}")
                
                return '\n'.join(prometheus_metrics), 200, {'Content-Type': 'text/plain'}
                
            except Exception as e:
                logger.error(f"Metrics collection failed: {e}")
                return "# Metrics collection failed\n", 500, {'Content-Type': 'text/plain'}
        
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

        @self.app.route('/api/user/<user_id>/profile', methods=['POST', 'PUT'])
        def update_user_profile(user_id):
            """Update user profile information"""
            try:
                if not request.is_json:
                    return jsonify({'error': 'Request must be JSON'}), 400
                
                profile_data = request.get_json()
                
                # Get existing experience data
                existing_experience = self.rag_db.get_user_experience(user_id)
                
                # Update with new profile data
                existing_experience.update(profile_data)
                
                # Save updated profile
                self.rag_db.update_user_experience(user_id, existing_experience)
                
                return jsonify({
                    'status': 'success',
                    'message': 'User profile updated successfully',
                    'user_id': user_id
                })
                
            except Exception as e:
                logger.error(f"Failed to update user profile: {str(e)}")
                return jsonify({'error': 'Failed to update user profile'}), 500

        @self.app.route('/api/user/<user_id>/contacts', methods=['POST'])
        def add_user_contacts(user_id):
            """Add contacts to user profile"""
            try:
                if not request.is_json:
                    return jsonify({'error': 'Request must be JSON'}), 400
                
                contacts_data = request.get_json()
                contacts = contacts_data.get('contacts', [])
                
                # Get existing experience data
                experience = self.rag_db.get_user_experience(user_id)
                
                # Add new contacts (avoiding duplicates)
                existing_contacts = experience.get('contacts', [])
                existing_emails = {contact.get('email', '').lower() for contact in existing_contacts}
                
                new_contacts = []
                for contact in contacts:
                    if contact.get('email', '').lower() not in existing_emails:
                        new_contacts.append(contact)
                        existing_emails.add(contact.get('email', '').lower())
                
                experience['contacts'].extend(new_contacts)
                
                # Save updated profile
                self.rag_db.update_user_experience(user_id, experience)
                
                return jsonify({
                    'status': 'success',
                    'message': f'Added {len(new_contacts)} new contacts',
                    'contacts_added': len(new_contacts),
                    'total_contacts': len(experience['contacts'])
                })
                
            except Exception as e:
                logger.error(f"Failed to add user contacts: {str(e)}")
                return jsonify({'error': 'Failed to add contacts'}), 500

        @self.app.route('/api/user/<user_id>/organizations', methods=['POST'])
        def add_user_organizations(user_id):
            """Add trusted organizations to user profile"""
            try:
                if not request.is_json:
                    return jsonify({'error': 'Request must be JSON'}), 400
                
                org_data = request.get_json()
                organizations = org_data.get('organizations', [])
                
                # Get existing experience data
                experience = self.rag_db.get_user_experience(user_id)
                
                # Add new organizations (avoiding duplicates)
                existing_orgs = experience.get('organizations', [])
                existing_domains = {org.get('domain', '').lower() for org in existing_orgs}
                
                new_orgs = []
                for org in organizations:
                    if org.get('domain', '').lower() not in existing_domains:
                        new_orgs.append(org)
                        existing_domains.add(org.get('domain', '').lower())
                
                experience['organizations'].extend(new_orgs)
                
                # Save updated profile
                self.rag_db.update_user_experience(user_id, experience)
                
                return jsonify({
                    'status': 'success',
                    'message': f'Added {len(new_orgs)} new organizations',
                    'organizations_added': len(new_orgs),
                    'total_organizations': len(experience['organizations'])
                })
                
            except Exception as e:
                logger.error(f"Failed to add user organizations: {str(e)}")
                return jsonify({'error': 'Failed to add organizations'}), 500

        @self.app.route('/api/user/<user_id>/dashboard', methods=['GET'])
        def get_user_dashboard(user_id):
            """Get comprehensive user dashboard data"""
            try:
                # Get user experience
                experience = self.rag_db.get_user_experience(user_id)
                
                # Get scan history summary
                scan_history = self.rag_db.get_scan_history(user_id, limit=100)
                
                # Calculate statistics
                total_scans = len(scan_history)
                threats_blocked = len([scan for scan in scan_history if scan.get('final_verdict') == 'threat'])
                suspicious_detected = len([scan for scan in scan_history if scan.get('final_verdict') == 'suspicious'])
                safe_emails = len([scan for scan in scan_history if scan.get('final_verdict') == 'safe'])
                
                # Calculate risk metrics
                if total_scans > 0:
                    threat_percentage = (threats_blocked / total_scans) * 100
                    risk_level = 'high' if threat_percentage > 20 else 'medium' if threat_percentage > 5 else 'low'
                else:
                    threat_percentage = 0
                    risk_level = 'unknown'
                
                # Recent threats analysis
                recent_threats = [scan for scan in scan_history[-10:] if scan.get('final_verdict') in ['threat', 'suspicious']]
                
                dashboard_data = {
                    'user_profile': {
                        'user_id': user_id,
                        'personal_info': experience.get('personal_info', {}),
                        'contacts_count': len(experience.get('contacts', [])),
                        'organizations_count': len(experience.get('organizations', [])),
                        'risk_profile': experience.get('risk_profile', {})
                    },
                    'scan_statistics': {
                        'total_scans': total_scans,
                        'threats_blocked': threats_blocked,
                        'suspicious_detected': suspicious_detected,
                        'safe_emails': safe_emails,
                        'threat_percentage': round(threat_percentage, 1),
                        'risk_level': risk_level
                    },
                    'recent_activity': scan_history[-5:] if scan_history else [],
                    'recent_threats': recent_threats,
                    'protection_status': 'active' if total_scans > 0 else 'inactive'
                }
                
                return jsonify(dashboard_data)
                
            except Exception as e:
                logger.error(f"Failed to get user dashboard: {str(e)}")
                return jsonify({'error': 'Failed to retrieve dashboard data'}), 500
        
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

        @self.app.route('/api/scan-history/<user_id>', methods=['GET'])
        def get_scan_history(user_id):
            """Get scan history for a specific user"""
            try:
                # Get query parameters for filtering
                limit = request.args.get('limit', 50, type=int)
                offset = request.args.get('offset', 0, type=int)

                # Get scan history from database
                scan_history = self.rag_db.get_scan_history(user_id, limit, offset)

                return jsonify({
                    'user_id': user_id,
                    'total_scans': len(scan_history),
                    'scans': scan_history
                })

            except Exception as e:
                logger.error(f"Failed to get scan history: {str(e)}")
                return jsonify({'error': 'Failed to retrieve scan history'}), 500
    
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
                logger.info(f"Layer 2 cleared email {scan_result['scan_id']} with high confidence")
                return self.finalize_scan_result(scan_result, start_time)

            # Otherwise, run Layer 3 for deeper analysis
            # This includes: suspicious emails, medium/low confidence benign, and fallback mode
            logger.info(f"Running Layer 3 scan for {scan_result['scan_id']} "
                       f"(Layer 2 status: {layer2_result['status']}, "
                       f"confidence: {layer2_result['confidence']:.2f})")

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

        # Store scan result in RAG database for history
        try:
            self.rag_db.store_scan_result(scan_result)
            logger.info(f"Scan result stored in database for user {scan_result['user_id']}")
        except Exception as e:
            logger.error(f"Failed to store scan result in database: {str(e)}")

        return scan_result
    
    def get_total_scans(self):
        """Get total number of scans performed"""
        try:
            return self.rag_db.get_total_scans()
        except:
            return 0
    
    def get_threats_blocked(self):
        """Get total number of threats blocked"""
        try:
            return self.rag_db.get_threats_blocked()
        except:
            return 0
    
    def run(self, host='localhost', port=5000, debug=True):
        """Run the Flask application"""
        logger.info(f"🚀 Starting PhishGuard 360 Backend on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    # Initialize and run the backend
    backend = PhishGuardBackend()
    backend.run()