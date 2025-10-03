# RAG Database for User Experience and Threat Intelligence
# Stores and retrieves user context and suspect information

import sqlite3
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)

class RAGDatabase:
    def __init__(self, db_path: str = 'database/rag_database.db'):
        self.db_path = db_path
        self.init_database()
        logger.info("RAG Database initialized")
    
    def init_database(self):
        """Initialize SQLite database with required tables"""
        try:
            import os
            os.makedirs('database', exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # User experience table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_experience (
                    user_id TEXT PRIMARY KEY,
                    personal_info TEXT,
                    contacts TEXT,
                    organizations TEXT,
                    previous_scams TEXT,
                    risk_profile TEXT,
                    preferences TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            
            # Suspect information table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS suspect_info (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_email TEXT,
                    sender_name TEXT,
                    tactics_used TEXT,
                    threat_level TEXT,
                    target_demographics TEXT,
                    success_indicators TEXT,
                    email_metadata TEXT,
                    first_seen TEXT,
                    last_seen TEXT,
                    frequency_count INTEGER DEFAULT 1
                )
            ''')
            
            # Conversation history table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    sender_email TEXT,
                    subject TEXT,
                    body_snippet TEXT,
                    timestamp TEXT,
                    sentiment TEXT,
                    is_reply INTEGER DEFAULT 0,
                    thread_id TEXT
                )
            ''')
            
            # Threat intelligence table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS threat_intelligence (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    indicator_type TEXT,
                    indicator_value TEXT,
                    threat_type TEXT,
                    confidence_score REAL,
                    source TEXT,
                    first_seen TEXT,
                    last_seen TEXT,
                    metadata TEXT
                )
            ''')
            
            # Email metadata for ML pipeline
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS email_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email_hash TEXT UNIQUE,
                    sender TEXT,
                    subject TEXT,
                    timestamp TEXT,
                    scan_results TEXT,
                    user_feedback TEXT,
                    final_action TEXT,
                    created_at TEXT
                )
            ''')

            # Scan history table for tracking all scans
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS scan_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_id TEXT UNIQUE,
                    user_id TEXT,
                    email_sender TEXT,
                    email_subject TEXT,
                    email_date TEXT,
                    final_verdict TEXT,
                    threat_level TEXT,
                    confidence_score REAL,
                    layer1_status TEXT,
                    layer2_status TEXT,
                    layer3_status TEXT,
                    processing_time REAL,
                    scan_timestamp TEXT,
                    created_at TEXT
                )
            ''')
            
            # User documents table for RAG enhancement
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    document_name TEXT,
                    document_type TEXT,
                    document_content TEXT,
                    document_summary TEXT,
                    document_hash TEXT UNIQUE,
                    file_size INTEGER,
                    upload_timestamp TEXT,
                    last_accessed TEXT,
                    access_count INTEGER DEFAULT 0,
                    tags TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT
                )
            ''')
            
            # Model training data table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_training_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email_content TEXT,
                    email_subject TEXT,
                    email_sender TEXT,
                    true_label TEXT,
                    user_feedback TEXT,
                    confidence_score REAL,
                    scan_date TEXT,
                    model_version TEXT,
                    is_validated INTEGER DEFAULT 0,
                    created_at TEXT
                )
            ''')
            
            # Model training sessions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_training_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE,
                    model_type TEXT,
                    training_samples_count INTEGER,
                    validation_samples_count INTEGER,
                    training_accuracy REAL,
                    validation_accuracy REAL,
                    training_duration REAL,
                    model_size INTEGER,
                    training_parameters TEXT,
                    status TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    created_at TEXT
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def get_user_experience(self, user_id: str) -> Dict:
        """
        Get user experience data for contextual analysis
        
        Args:
            user_id: User identifier
            
        Returns:
            Dict containing user context information
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT personal_info, contacts, organizations, previous_scams, 
                       risk_profile, preferences
                FROM user_experience 
                WHERE user_id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                personal_info, contacts, organizations, previous_scams, risk_profile, preferences = result
                
                return {
                    'user_id': user_id,
                    'personal_info': json.loads(personal_info) if personal_info else {},
                    'contacts': json.loads(contacts) if contacts else [],
                    'organizations': json.loads(organizations) if organizations else [],
                    'previous_scams': json.loads(previous_scams) if previous_scams else [],
                    'risk_profile': json.loads(risk_profile) if risk_profile else {},
                    'preferences': json.loads(preferences) if preferences else {}
                }
            else:
                # Create default user profile
                return self.create_default_user_profile(user_id)
                
        except Exception as e:
            logger.error(f"Failed to get user experience for {user_id}: {e}")
            return self.create_default_user_profile(user_id)
    
    def create_default_user_profile(self, user_id: str) -> Dict:
        """Create a default user profile for new users"""
        default_profile = {
            'user_id': user_id,
            'personal_info': {
                'age_group': 'unknown',
                'occupation': 'unknown',
                'tech_savviness': 'medium',
                'primary_email_usage': 'personal'
            },
            'contacts': [],
            'organizations': [],
            'previous_scams': [],
            'risk_profile': {
                'overall_risk': 'medium',
                'susceptible_to': [],
                'awareness_level': 'medium'
            },
            'preferences': {
                'security_level': 'medium',
                'notification_frequency': 'normal'
            }
        }
        
        # Store the default profile
        self.update_user_experience(user_id, default_profile)
        
        return default_profile
    
    def update_user_experience(self, user_id: str, experience_data: Dict):
        """Update user experience data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            timestamp = datetime.utcnow().isoformat()
            
            cursor.execute('''
                INSERT OR REPLACE INTO user_experience
                (user_id, personal_info, contacts, organizations, previous_scams,
                 risk_profile, preferences, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                json.dumps(experience_data.get('personal_info', {})),
                json.dumps(experience_data.get('contacts', [])),
                json.dumps(experience_data.get('organizations', [])),
                json.dumps(experience_data.get('previous_scams', [])),
                json.dumps(experience_data.get('risk_profile', {})),
                json.dumps(experience_data.get('preferences', {})),
                timestamp,
                timestamp
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Updated user experience for {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to update user experience: {e}")
    
    def store_suspect_info(self, suspect_info: Dict, email_metadata: Dict) -> Dict:
        """
        Store suspect information in threat intelligence database
        
        Args:
            suspect_info: Information about the suspect/threat
            email_metadata: Associated email metadata
            
        Returns:
            Dict with storage result
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            sender_email = suspect_info.get('sender', email_metadata.get('sender', ''))
            sender_name = suspect_info.get('sender_name', '')
            
            # Check if suspect already exists
            cursor.execute('''
                SELECT id, frequency_count FROM suspect_info 
                WHERE sender_email = ?
            ''', (sender_email,))
            
            existing = cursor.fetchone()
            timestamp = datetime.utcnow().isoformat()
            
            if existing:
                # Update existing record
                suspect_id, frequency = existing
                cursor.execute('''
                    UPDATE suspect_info 
                    SET tactics_used = ?, threat_level = ?, last_seen = ?,
                        frequency_count = ?, email_metadata = ?
                    WHERE id = ?
                ''', (
                    json.dumps(suspect_info.get('tactics_used', [])),
                    suspect_info.get('threat_level', 'unknown'),
                    timestamp,
                    frequency + 1,
                    json.dumps(email_metadata),
                    suspect_id
                ))
                
                logger.info(f"Updated suspect info for {sender_email} (frequency: {frequency + 1})")
                
            else:
                # Insert new record
                cursor.execute('''
                    INSERT INTO suspect_info
                    (sender_email, sender_name, tactics_used, threat_level,
                     target_demographics, success_indicators, email_metadata,
                     first_seen, last_seen, frequency_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    sender_email,
                    sender_name,
                    json.dumps(suspect_info.get('tactics_used', [])),
                    suspect_info.get('threat_level', 'unknown'),
                    json.dumps(suspect_info.get('target_demographics', [])),
                    json.dumps(suspect_info.get('success_indicators', [])),
                    json.dumps(email_metadata),
                    timestamp,
                    timestamp,
                    1
                ))
                
                logger.info(f"Stored new suspect info for {sender_email}")
            
            conn.commit()
            conn.close()
            
            return {
                'status': 'success',
                'message': f'Suspect information stored for {sender_email}'
            }
            
        except Exception as e:
            logger.error(f"Failed to store suspect info: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_conversation_history(self, user_id: str, sender_email: str, 
                               limit: int = 10) -> List[Dict]:
        """Get conversation history between user and sender"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT subject, body_snippet, timestamp, sentiment, is_reply
                FROM conversation_history
                WHERE user_id = ? AND sender_email = ?
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (user_id, sender_email, limit))
            
            results = cursor.fetchall()
            conn.close()
            
            history = []
            for result in results:
                subject, body_snippet, timestamp, sentiment, is_reply = result
                history.append({
                    'subject': subject,
                    'body_snippet': body_snippet,
                    'timestamp': timestamp,
                    'sentiment': sentiment,
                    'is_reply': bool(is_reply)
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get conversation history: {e}")
            return []
    
    def add_conversation_entry(self, user_id: str, sender_email: str, 
                             email_data: Dict):
        """Add entry to conversation history"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Generate thread ID based on subject
            subject = email_data.get('subject', '')
            clean_subject = subject.lower().replace('re:', '').replace('fwd:', '').strip()
            thread_id = hashlib.md5(f"{user_id}_{sender_email}_{clean_subject}".encode()).hexdigest()
            
            # Extract body snippet (first 200 characters)
            body = email_data.get('body', '')
            body_snippet = body[:200] + '...' if len(body) > 200 else body
            
            # Determine if it's a reply
            is_reply = subject.lower().startswith(('re:', 'fwd:', 'fw:'))
            
            cursor.execute('''
                INSERT INTO conversation_history
                (user_id, sender_email, subject, body_snippet, timestamp,
                 sentiment, is_reply, thread_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                sender_email,
                subject,
                body_snippet,
                email_data.get('timestamp', datetime.utcnow().isoformat()),
                'neutral',  # Default sentiment
                int(is_reply),
                thread_id
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to add conversation entry: {e}")
    
    def get_threat_intelligence(self, indicator_value: str, 
                               indicator_type: str = 'email') -> Dict:
        """Get threat intelligence for specific indicator"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT threat_type, confidence_score, source, first_seen,
                       last_seen, metadata
                FROM threat_intelligence
                WHERE indicator_value = ? AND indicator_type = ?
                ORDER BY confidence_score DESC
            ''', (indicator_value, indicator_type))
            
            results = cursor.fetchall()
            conn.close()
            
            if results:
                threat_data = []
                for result in results:
                    threat_type, confidence, source, first_seen, last_seen, metadata = result
                    threat_data.append({
                        'threat_type': threat_type,
                        'confidence_score': confidence,
                        'source': source,
                        'first_seen': first_seen,
                        'last_seen': last_seen,
                        'metadata': json.loads(metadata) if metadata else {}
                    })
                
                return {
                    'indicator': indicator_value,
                    'threat_data': threat_data,
                    'risk_level': self.calculate_risk_level(threat_data)
                }
            
            return {'indicator': indicator_value, 'threat_data': [], 'risk_level': 'unknown'}
            
        except Exception as e:
            logger.error(f"Failed to get threat intelligence: {e}")
            return {'indicator': indicator_value, 'threat_data': [], 'risk_level': 'error'}
    
    def calculate_risk_level(self, threat_data: List[Dict]) -> str:
        """Calculate overall risk level from threat intelligence"""
        if not threat_data:
            return 'low'
        
        max_confidence = max(item['confidence_score'] for item in threat_data)
        
        if max_confidence >= 0.8:
            return 'high'
        elif max_confidence >= 0.6:
            return 'medium'
        else:
            return 'low'
    
    def store_email_metadata(self, email_data: Dict, scan_results: Dict, 
                           user_feedback: Optional[str] = None):
        """Store email metadata for ML pipeline"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Generate email hash
            email_content = f"{email_data.get('sender', '')}{email_data.get('subject', '')}"
            email_hash = hashlib.md5(email_content.encode()).hexdigest()
            
            cursor.execute('''
                INSERT OR REPLACE INTO email_metadata
                (email_hash, sender, subject, timestamp, scan_results,
                 user_feedback, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                email_hash,
                email_data.get('sender'),
                email_data.get('subject'),
                email_data.get('timestamp'),
                json.dumps(scan_results),
                user_feedback,
                datetime.utcnow().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to store email metadata: {e}")
    
    def get_ml_training_data(self, days: int = 30) -> List[Dict]:
        """Get email metadata for ML model training"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            cursor.execute('''
                SELECT sender, subject, scan_results, user_feedback, final_action
                FROM email_metadata
                WHERE created_at > ? AND user_feedback IS NOT NULL
            ''', (cutoff_date,))
            
            results = cursor.fetchall()
            conn.close()
            
            training_data = []
            for result in results:
                sender, subject, scan_results, user_feedback, final_action = result
                training_data.append({
                    'sender': sender,
                    'subject': subject,
                    'scan_results': json.loads(scan_results) if scan_results else {},
                    'user_feedback': user_feedback,
                    'final_action': final_action
                })
            
            return training_data
            
        except Exception as e:
            logger.error(f"Failed to get ML training data: {e}")
            return []
    
    def store_scan_result(self, scan_result: Dict):
        """Store scan result in scan history"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Extract layer statuses
            layers = scan_result.get('layers', {})
            layer1_status = json.dumps(layers.get('layer1', {}))
            layer2_status = json.dumps(layers.get('layer2', {}))
            layer3_status = json.dumps(layers.get('layer3', {}))

            # Extract email data
            email_data = scan_result.get('email_data', {})
            email_sender = email_data.get('sender', 'unknown')
            email_subject = email_data.get('subject', 'No subject')
            email_date = email_data.get('date', datetime.utcnow().isoformat())

            cursor.execute('''
                INSERT OR REPLACE INTO scan_history
                (scan_id, user_id, email_sender, email_subject, email_date,
                 final_verdict, threat_level, confidence_score,
                 layer1_status, layer2_status, layer3_status,
                 processing_time, scan_timestamp, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                scan_result.get('scan_id'),
                scan_result.get('user_id'),
                email_sender,
                email_subject,
                email_date,
                scan_result.get('final_verdict'),
                scan_result.get('threat_level'),
                scan_result.get('confidence_score'),
                layer1_status,
                layer2_status,
                layer3_status,
                scan_result.get('processing_time'),
                scan_result.get('timestamp'),
                datetime.utcnow().isoformat()
            ))

            conn.commit()
            conn.close()

            logger.info(f"Stored scan result {scan_result.get('scan_id')} in database")

        except Exception as e:
            logger.error(f"Failed to store scan result: {e}")
            raise

    def get_scan_history(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """
        Get scan history for a specific user

        Args:
            user_id: User identifier
            limit: Maximum number of results to return
            offset: Number of results to skip

        Returns:
            List of scan history records
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT scan_id, email_sender, email_subject, email_date,
                       final_verdict, threat_level, confidence_score,
                       layer1_status, layer2_status, layer3_status,
                       processing_time, scan_timestamp, created_at
                FROM scan_history
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (user_id, limit, offset))

            results = cursor.fetchall()
            conn.close()

            scan_history = []
            for result in results:
                (scan_id, email_sender, email_subject, email_date,
                 final_verdict, threat_level, confidence_score,
                 layer1_status, layer2_status, layer3_status,
                 processing_time, scan_timestamp, created_at) = result

                scan_history.append({
                    'scan_id': scan_id,
                    'email_sender': email_sender,
                    'email_subject': email_subject,
                    'email_date': email_date,
                    'final_verdict': final_verdict,
                    'threat_level': threat_level,
                    'confidence_score': confidence_score,
                    'layers': {
                        'layer1': json.loads(layer1_status) if layer1_status else {},
                        'layer2': json.loads(layer2_status) if layer2_status else {},
                        'layer3': json.loads(layer3_status) if layer3_status else {}
                    },
                    'processing_time': processing_time,
                    'scan_timestamp': scan_timestamp,
                    'created_at': created_at
                })

            return scan_history

        except Exception as e:
            logger.error(f"Failed to get scan history for {user_id}: {e}")
            return []

    def get_database_statistics(self) -> Dict:
        """Get database statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            stats = {}

            # User experience stats
            cursor.execute('SELECT COUNT(*) FROM user_experience')
            stats['total_users'] = cursor.fetchone()[0]

            # Suspect info stats
            cursor.execute('SELECT COUNT(*) FROM suspect_info')
            stats['total_suspects'] = cursor.fetchone()[0]

            cursor.execute('SELECT AVG(frequency_count) FROM suspect_info')
            avg_frequency = cursor.fetchone()[0]
            stats['avg_suspect_frequency'] = avg_frequency if avg_frequency else 0

            # Conversation history stats
            cursor.execute('SELECT COUNT(*) FROM conversation_history')
            stats['total_conversations'] = cursor.fetchone()[0]

            # Threat intelligence stats
            cursor.execute('SELECT COUNT(*) FROM threat_intelligence')
            stats['total_threat_indicators'] = cursor.fetchone()[0]

            # Email metadata stats
            cursor.execute('SELECT COUNT(*) FROM email_metadata')
            stats['total_emails_processed'] = cursor.fetchone()[0]

            cursor.execute('SELECT COUNT(*) FROM email_metadata WHERE user_feedback IS NOT NULL')
            stats['emails_with_feedback'] = cursor.fetchone()[0]

            # Scan history stats
            cursor.execute('SELECT COUNT(*) FROM scan_history')
            stats['total_scans'] = cursor.fetchone()[0]

            cursor.execute('SELECT COUNT(*) FROM scan_history WHERE final_verdict = "threat"')
            stats['threats_detected'] = cursor.fetchone()[0]

            conn.close()

            return stats

        except Exception as e:
            logger.error(f"Failed to get database statistics: {e}")
            return {}
    
    # ============================================
    # Document Management for RAG Enhancement
    # ============================================
    
    def add_user_document(self, user_id: str, document_name: str, document_content: str, 
                         document_type: str = 'text', tags: List[str] = None) -> Dict:
        """
        Add a document to user's RAG knowledge base
        
        Args:
            user_id: User identifier
            document_name: Name of the document
            document_content: Full text content of the document
            document_type: Type of document (text, pdf, email, etc.)
            tags: Optional tags for categorization
            
        Returns:
            Dict with document ID and status
        """
        try:
            # Generate document hash for deduplication
            document_hash = hashlib.sha256(document_content.encode()).hexdigest()
            
            # Generate summary (first 500 characters as basic summary)
            document_summary = document_content[:500] + "..." if len(document_content) > 500 else document_content
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if document already exists
            cursor.execute('SELECT id FROM user_documents WHERE document_hash = ?', (document_hash,))
            existing = cursor.fetchone()
            
            if existing:
                conn.close()
                return {
                    'status': 'duplicate',
                    'message': 'Document already exists',
                    'document_id': existing[0]
                }
            
            # Insert new document
            cursor.execute('''
                INSERT INTO user_documents 
                (user_id, document_name, document_type, document_content, document_summary, 
                 document_hash, file_size, upload_timestamp, tags, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                document_name,
                document_type,
                document_content,
                document_summary,
                document_hash,
                len(document_content),
                datetime.now().isoformat(),
                json.dumps(tags) if tags else None,
                datetime.now().isoformat()
            ))
            
            document_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"Document added for user {user_id}: {document_name}")
            
            return {
                'status': 'success',
                'message': 'Document added successfully',
                'document_id': document_id,
                'document_hash': document_hash
            }
            
        except Exception as e:
            logger.error(f"Failed to add document: {e}")
            return {
                'status': 'error',
                'message': f'Failed to add document: {str(e)}'
            }
    
    def get_user_documents(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Get all documents for a user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, document_name, document_type, document_summary, file_size,
                       upload_timestamp, tags, access_count
                FROM user_documents 
                WHERE user_id = ? AND is_active = 1
                ORDER BY upload_timestamp DESC
                LIMIT ?
            ''', (user_id, limit))
            
            documents = []
            for row in cursor.fetchall():
                documents.append({
                    'id': row[0],
                    'name': row[1],
                    'type': row[2],
                    'summary': row[3],
                    'size': row[4],
                    'uploaded': row[5],
                    'tags': json.loads(row[6]) if row[6] else [],
                    'access_count': row[7]
                })
            
            conn.close()
            return documents
            
        except Exception as e:
            logger.error(f"Failed to get user documents: {e}")
            return []
    
    def get_document_content(self, document_id: int, user_id: str) -> Dict:
        """Get full document content and update access count"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get document and verify ownership
            cursor.execute('''
                SELECT document_name, document_content, document_type, tags
                FROM user_documents 
                WHERE id = ? AND user_id = ? AND is_active = 1
            ''', (document_id, user_id))
            
            result = cursor.fetchone()
            if not result:
                conn.close()
                return {'status': 'error', 'message': 'Document not found'}
            
            # Update access count and timestamp
            cursor.execute('''
                UPDATE user_documents 
                SET access_count = access_count + 1, last_accessed = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), document_id))
            
            conn.commit()
            conn.close()
            
            return {
                'status': 'success',
                'name': result[0],
                'content': result[1],
                'type': result[2],
                'tags': json.loads(result[3]) if result[3] else []
            }
            
        except Exception as e:
            logger.error(f"Failed to get document content: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def delete_user_document(self, document_id: int, user_id: str) -> Dict:
        """Soft delete a user document"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE user_documents 
                SET is_active = 0 
                WHERE id = ? AND user_id = ?
            ''', (document_id, user_id))
            
            if cursor.rowcount == 0:
                conn.close()
                return {'status': 'error', 'message': 'Document not found'}
            
            conn.commit()
            conn.close()
            
            return {'status': 'success', 'message': 'Document deleted'}
            
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            return {'status': 'error', 'message': str(e)}
    
    # ============================================
    # Model Training Data Management
    # ============================================
    
    def add_training_sample(self, email_content: str, email_subject: str, email_sender: str,
                           true_label: str, user_feedback: str = None, confidence_score: float = None) -> Dict:
        """Add a training sample from user feedback"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO model_training_data 
                (email_content, email_subject, email_sender, true_label, user_feedback, 
                 confidence_score, scan_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                email_content,
                email_subject,
                email_sender,
                true_label,
                user_feedback,
                confidence_score,
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
            training_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"Training sample added: {true_label}")
            return {'status': 'success', 'training_id': training_id}
            
        except Exception as e:
            logger.error(f"Failed to add training sample: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_training_data_stats(self) -> Dict:
        """Get statistics about available training data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            stats = {}
            
            # Total samples
            cursor.execute('SELECT COUNT(*) FROM model_training_data')
            stats['total_samples'] = cursor.fetchone()[0]
            
            # Samples by label
            cursor.execute('''
                SELECT true_label, COUNT(*) 
                FROM model_training_data 
                GROUP BY true_label
            ''')
            stats['samples_by_label'] = dict(cursor.fetchall())
            
            # Validated samples
            cursor.execute('SELECT COUNT(*) FROM model_training_data WHERE is_validated = 1')
            stats['validated_samples'] = cursor.fetchone()[0]
            
            # Recent samples (last 30 days)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            cursor.execute('SELECT COUNT(*) FROM model_training_data WHERE created_at > ?', (thirty_days_ago,))
            stats['recent_samples'] = cursor.fetchone()[0]
            
            conn.close()
            
            # Determine if enough data for training
            stats['ready_for_training'] = (
                stats['total_samples'] >= 100 and  # Minimum 100 samples
                len(stats['samples_by_label']) >= 2 and  # At least 2 classes
                all(count >= 20 for count in stats['samples_by_label'].values())  # Min 20 per class
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get training data stats: {e}")
            return {'ready_for_training': False, 'error': str(e)}
    
    def create_training_session(self, model_type: str, training_samples_count: int) -> str:
        """Create a new model training session"""
        try:
            session_id = f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO model_training_sessions 
                (session_id, model_type, training_samples_count, status, started_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                session_id,
                model_type,
                training_samples_count,
                'started',
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Training session created: {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Failed to create training session: {e}")
            return None
    
    def update_training_session(self, session_id: str, **kwargs) -> bool:
        """Update training session with results"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build dynamic update query
            update_fields = []
            values = []
            
            for key, value in kwargs.items():
                if key in ['validation_samples_count', 'training_accuracy', 'validation_accuracy',
                          'training_duration', 'model_size', 'training_parameters', 'status',
                          'completed_at']:
                    update_fields.append(f"{key} = ?")
                    values.append(value)
            
            if not update_fields:
                return False
            
            values.append(session_id)
            query = f"UPDATE model_training_sessions SET {', '.join(update_fields)} WHERE session_id = ?"
            
            cursor.execute(query, values)
            conn.commit()
            conn.close()
            
            return cursor.rowcount > 0
            
        except Exception as e:
            logger.error(f"Failed to update training session: {e}")
            return False
    
    def health_check(self):
        """
        Perform health check on the RAG database system.
        
        Returns:
            Dict with health status and statistics
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if database is accessible
            cursor.execute("SELECT 1")
            
            # Get basic statistics
            stats = {}
            
            # Count total experiences
            cursor.execute("SELECT COUNT(*) FROM user_experiences")
            stats['total_experiences'] = cursor.fetchone()[0]
            
            # Count unique users
            cursor.execute("SELECT COUNT(DISTINCT user_id) FROM user_experiences")
            stats['unique_users'] = cursor.fetchone()[0]
            
            # Count user documents
            cursor.execute("SELECT COUNT(*) FROM user_documents")
            stats['total_documents'] = cursor.fetchone()[0]
            
            # Count training sessions
            cursor.execute("SELECT COUNT(*) FROM model_training_sessions")
            stats['training_sessions'] = cursor.fetchone()[0]
            
            # Check for recent activity (last 24 hours)
            recent_cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            cursor.execute("SELECT COUNT(*) FROM user_experiences WHERE timestamp > ?", (recent_cutoff,))
            stats['recent_activity'] = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'status': 'healthy',
                'database_accessible': True,
                'statistics': stats,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"RAG database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'database_accessible': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }