# PhishGuard 360 - Model Training & Fine-tuning Module
# Handles Layer 2 DistilBERT model fine-tuning with user feedback data

import logging
import json
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import time

logger = logging.getLogger(__name__)

class ModelTrainer:
    """Handles fine-tuning of Layer 2 DistilBERT model"""
    
    def __init__(self, rag_database):
        self.rag_db = rag_database
        self.model_cache_dir = 'models/fine_tuned'
        os.makedirs(self.model_cache_dir, exist_ok=True)
        
        # Minimum requirements for training
        self.MIN_SAMPLES = 100
        self.MIN_SAMPLES_PER_CLASS = 20
        self.MIN_CLASSES = 2
        
        logger.info("Model trainer initialized")
    
    def check_training_readiness(self) -> Dict:
        """
        Check if enough training data is available for fine-tuning
        
        Returns:
            Dict with readiness status and requirements
        """
        try:
            stats = self.rag_db.get_training_data_stats()
            
            requirements = {
                'total_samples': {
                    'current': stats.get('total_samples', 0),
                    'required': self.MIN_SAMPLES,
                    'met': stats.get('total_samples', 0) >= self.MIN_SAMPLES
                },
                'classes': {
                    'current': len(stats.get('samples_by_label', {})),
                    'required': self.MIN_CLASSES,
                    'met': len(stats.get('samples_by_label', {})) >= self.MIN_CLASSES
                },
                'samples_per_class': {
                    'current': stats.get('samples_by_label', {}),
                    'required': self.MIN_SAMPLES_PER_CLASS,
                    'met': all(count >= self.MIN_SAMPLES_PER_CLASS 
                              for count in stats.get('samples_by_label', {}).values())
                },
                'validated_samples': {
                    'current': stats.get('validated_samples', 0),
                    'percentage': (stats.get('validated_samples', 0) / max(stats.get('total_samples', 1), 1)) * 100
                }
            }
            
            overall_ready = all(req['met'] for req in requirements.values() if 'met' in req)
            
            return {
                'ready': overall_ready,
                'requirements': requirements,
                'recommendation': self._get_training_recommendation(requirements),
                'estimated_training_time': self._estimate_training_time(stats.get('total_samples', 0)),
                'last_training': self._get_last_training_info()
            }
            
        except Exception as e:
            logger.error(f"Failed to check training readiness: {e}")
            return {
                'ready': False,
                'error': str(e),
                'requirements': {}
            }
    
    def _get_training_recommendation(self, requirements: Dict) -> str:
        """Generate recommendation based on current data"""
        if not requirements['total_samples']['met']:
            needed = requirements['total_samples']['required'] - requirements['total_samples']['current']
            return f"Need {needed} more training samples (current: {requirements['total_samples']['current']})"
        
        if not requirements['classes']['met']:
            return f"Need more diverse labels (current: {requirements['classes']['current']}, need: {requirements['classes']['required']})"
        
        if not requirements['samples_per_class']['met']:
            insufficient = [label for label, count in requirements['samples_per_class']['current'].items() 
                           if count < requirements['samples_per_class']['required']]
            return f"Need more samples for: {', '.join(insufficient)}"
        
        return "Ready for training! All requirements met."
    
    def _estimate_training_time(self, sample_count: int) -> str:
        """Estimate training time based on sample count"""
        # Rough estimation: 1-2 minutes per 100 samples
        minutes = max(1, (sample_count // 100) * 1.5)
        
        if minutes < 60:
            return f"~{int(minutes)} minutes"
        else:
            hours = minutes / 60
            return f"~{hours:.1f} hours"
    
    def _get_last_training_info(self) -> Optional[Dict]:
        """Get information about the last training session"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.rag_db.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT session_id, model_type, training_samples_count, training_accuracy,
                       validation_accuracy, status, completed_at
                FROM model_training_sessions 
                ORDER BY created_at DESC 
                LIMIT 1
            ''')
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    'session_id': result[0],
                    'model_type': result[1],
                    'samples_used': result[2],
                    'training_accuracy': result[3],
                    'validation_accuracy': result[4],
                    'status': result[5],
                    'completed_at': result[6]
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get last training info: {e}")
            return None
    
    def start_training(self, model_type: str = 'distilbert_v2') -> Dict:
        """
        Start model fine-tuning process
        
        Args:
            model_type: Type of model to train
            
        Returns:
            Dict with training session info
        """
        try:
            # Check readiness
            readiness = self.check_training_readiness()
            if not readiness['ready']:
                return {
                    'status': 'error',
                    'message': 'Not ready for training',
                    'requirements': readiness['requirements']
                }
            
            # Get training data
            training_data = self._prepare_training_data()
            if not training_data:
                return {
                    'status': 'error',
                    'message': 'Failed to prepare training data'
                }
            
            # Create training session
            session_id = self.rag_db.create_training_session(
                model_type=model_type,
                training_samples_count=len(training_data)
            )
            
            if not session_id:
                return {
                    'status': 'error',
                    'message': 'Failed to create training session'
                }
            
            # Start training process (simulated for demo)
            training_results = self._run_training(session_id, training_data, model_type)
            
            return {
                'status': 'success',
                'session_id': session_id,
                'training_results': training_results,
                'message': f'Training completed for {len(training_data)} samples'
            }
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            return {
                'status': 'error',
                'message': f'Training failed: {str(e)}'
            }
    
    def _prepare_training_data(self) -> List[Dict]:
        """Prepare training data from the database"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.rag_db.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT email_content, email_subject, true_label, user_feedback, confidence_score
                FROM model_training_data
                WHERE email_content IS NOT NULL AND true_label IS NOT NULL
                ORDER BY created_at DESC
            ''')
            
            training_data = []
            for row in cursor.fetchall():
                training_data.append({
                    'content': row[0],
                    'subject': row[1],
                    'label': row[2],
                    'feedback': row[3],
                    'confidence': row[4]
                })
            
            conn.close()
            
            logger.info(f"Prepared {len(training_data)} training samples")
            return training_data
            
        except Exception as e:
            logger.error(f"Failed to prepare training data: {e}")
            return []
    
    def _run_training(self, session_id: str, training_data: List[Dict], model_type: str) -> Dict:
        """
        Simulate the training process (in production, this would run actual ML training)
        """
        try:
            start_time = time.time()
            
            # Simulate training steps
            logger.info(f"Starting training session {session_id}")
            
            # Update session status
            self.rag_db.update_training_session(session_id, status='training')
            
            # Simulate data preparation
            time.sleep(1)  # Simulate processing time
            
            # Simulate training epochs
            training_accuracy = 0.85 + (len(training_data) / 1000) * 0.1  # Better with more data
            validation_accuracy = training_accuracy - 0.05  # Slight overfitting simulation
            
            # Simulate validation
            validation_samples = max(20, len(training_data) // 5)
            
            # Calculate training duration
            training_duration = time.time() - start_time
            
            # Update session with results
            self.rag_db.update_training_session(
                session_id,
                validation_samples_count=validation_samples,
                training_accuracy=round(training_accuracy, 3),
                validation_accuracy=round(validation_accuracy, 3),
                training_duration=round(training_duration, 2),
                model_size=150,  # MB
                training_parameters=json.dumps({
                    'learning_rate': 2e-5,
                    'batch_size': 16,
                    'epochs': 3,
                    'model_type': model_type
                }),
                status='completed',
                completed_at=datetime.now().isoformat()
            )
            
            # Save model info (simulated)
            model_path = os.path.join(self.model_cache_dir, f"{session_id}_model")
            os.makedirs(model_path, exist_ok=True)
            
            with open(os.path.join(model_path, 'training_info.json'), 'w') as f:
                json.dump({
                    'session_id': session_id,
                    'model_type': model_type,
                    'training_accuracy': training_accuracy,
                    'validation_accuracy': validation_accuracy,
                    'samples_used': len(training_data),
                    'completed_at': datetime.now().isoformat()
                }, f, indent=2)
            
            logger.info(f"Training session {session_id} completed successfully")
            
            return {
                'training_accuracy': training_accuracy,
                'validation_accuracy': validation_accuracy,
                'samples_used': len(training_data),
                'validation_samples': validation_samples,
                'training_duration': training_duration,
                'model_path': model_path
            }
            
        except Exception as e:
            # Update session with error
            self.rag_db.update_training_session(
                session_id,
                status='failed',
                completed_at=datetime.now().isoformat()
            )
            logger.error(f"Training failed for session {session_id}: {e}")
            raise
    
    def get_training_history(self, limit: int = 10) -> List[Dict]:
        """Get history of training sessions"""
        try:
            import sqlite3
            conn = sqlite3.connect(self.rag_db.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT session_id, model_type, training_samples_count, validation_samples_count,
                       training_accuracy, validation_accuracy, training_duration, status,
                       started_at, completed_at
                FROM model_training_sessions
                ORDER BY created_at DESC
                LIMIT ?
            ''', (limit,))
            
            history = []
            for row in cursor.fetchall():
                history.append({
                    'session_id': row[0],
                    'model_type': row[1],
                    'training_samples': row[2],
                    'validation_samples': row[3],
                    'training_accuracy': row[4],
                    'validation_accuracy': row[5],
                    'duration': row[6],
                    'status': row[7],
                    'started_at': row[8],
                    'completed_at': row[9]
                })
            
            conn.close()
            return history
            
        except Exception as e:
            logger.error(f"Failed to get training history: {e}")
            return []