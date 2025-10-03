# Layer 1: Public Database Spam Checker
# Checks emails against known spam/phishing databases

import hashlib
import requests
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import sqlite3
import json

logger = logging.getLogger(__name__)

class Layer1DatabaseChecker:
    def __init__(self):
        self.cache_db = 'cache/layer1_cache.db'
        self.cache_duration = timedelta(hours=24)  # Cache results for 24 hours
        
        # Public spam databases and APIs
        self.spam_databases = {
            'spamhaus': {
                'url': 'https://www.spamhaus.org/sbl/listings/',
                'enabled': False  # Requires API key
            },
            'virustotal': {
                'url': 'https://www.virustotal.com/vtapi/v2/url/report',
                'enabled': False  # Requires API key
            },
            'phishtank': {
                'url': 'http://checkurl.phishtank.com/checkurl/',
                'enabled': False  # Requires API key
            }
        }
        
        # Initialize local cache database
        self.init_cache_db()
        
        # Load known spam patterns
        self.load_spam_patterns()
        
        logger.info("Layer 1 Database Checker initialized")
    
    def init_cache_db(self):
        """Initialize SQLite cache database"""
        try:
            import os
            os.makedirs('cache', exist_ok=True)
            
            conn = sqlite3.connect(self.cache_db)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS spam_cache (
                    email_hash TEXT PRIMARY KEY,
                    is_spam INTEGER,
                    confidence REAL,
                    source TEXT,
                    timestamp TEXT,
                    metadata TEXT
                )
            ''')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to initialize cache database: {e}")
    
    def load_spam_patterns(self):
        """Load known spam patterns and indicators"""
        self.spam_patterns = {
            'sender_domains': [
                'suspicious-bank.com',
                'phishing-test.com',
                'fake-amazon.net',
                'secure-paypal.org'
            ],
            'subject_patterns': [
                'urgent.*verify.*account',
                'click.*here.*immediately',
                'suspended.*account',
                'confirm.*identity.*now',
                'limited.*time.*offer'
            ],
            'body_patterns': [
                'click.*link.*verify',
                'account.*suspended.*verify',
                'urgent.*action.*required',
                'confirm.*payment.*information'
            ],
            'suspicious_urls': [
                'bit.ly',
                'tinyurl.com',
                'short.link'
            ]
        }
    
    def check_email(self, email_data: Dict) -> Dict:
        """
        Check email against public databases and known patterns
        
        Args:
            email_data: Processed email data
            
        Returns:
            Dict with check results
        """
        start_time = datetime.utcnow()
        
        try:
            # Generate email hash for caching
            email_hash = self.generate_email_hash(email_data)
            
            # Check cache first
            cached_result = self.check_cache(email_hash)
            if cached_result:
                logger.info(f"Layer 1 cache hit for hash {email_hash[:8]}")
                return cached_result
            
            # Perform actual checks
            result = {
                'layer': 1,
                'status': 'clean',
                'confidence': 0.95,
                'checks_performed': [],
                'threat_indicators': [],
                'databases_checked': 0,
                'processing_time': 0
            }
            
            # Check against known spam patterns
            pattern_result = self.check_spam_patterns(email_data)
            result['checks_performed'].append('pattern_matching')
            
            if pattern_result['is_suspicious']:
                result['status'] = 'threat'
                result['confidence'] = pattern_result['confidence']
                result['threat_indicators'].extend(pattern_result['indicators'])
            
            # Check sender reputation (simulated)
            reputation_result = self.check_sender_reputation(email_data)
            result['checks_performed'].append('sender_reputation')
            result['databases_checked'] += 1
            
            if reputation_result['is_suspicious']:
                result['status'] = 'threat'
                result['confidence'] = max(result['confidence'], reputation_result['confidence'])
                result['threat_indicators'].extend(reputation_result['indicators'])
            
            # Check URLs in email (simulated)
            if 'body' in email_data:
                url_result = self.check_urls(email_data['body'])
                result['checks_performed'].append('url_scanning')
                result['databases_checked'] += 1
                
                if url_result['suspicious_urls']:
                    result['status'] = 'threat'
                    result['confidence'] = max(result['confidence'], 0.8)
                    result['threat_indicators'].extend(url_result['indicators'])
            
            # Calculate processing time
            end_time = datetime.utcnow()
            result['processing_time'] = (end_time - start_time).total_seconds()
            
            # Cache the result
            self.cache_result(email_hash, result)
            
            logger.info(f"Layer 1 check completed: status={result['status']}, "
                       f"confidence={result['confidence']:.2f}")
            
            return result
            
        except Exception as e:
            logger.error(f"Layer 1 check failed: {e}")
            return {
                'layer': 1,
                'status': 'error',
                'confidence': 0.0,
                'error': str(e),
                'processing_time': (datetime.utcnow() - start_time).total_seconds()
            }
    
    def generate_email_hash(self, email_data: Dict) -> str:
        """Generate hash for email caching"""
        content = f"{email_data.get('sender', '')}{email_data.get('subject', '')}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def check_cache(self, email_hash: str) -> Optional[Dict]:
        """Check if email result is cached"""
        try:
            conn = sqlite3.connect(self.cache_db)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT is_spam, confidence, source, timestamp, metadata
                FROM spam_cache 
                WHERE email_hash = ? AND datetime(timestamp) > datetime('now', '-1 day')
            ''', (email_hash,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                is_spam, confidence, source, timestamp, metadata = result
                return {
                    'layer': 1,
                    'status': 'threat' if is_spam else 'clean',
                    'confidence': confidence,
                    'source': source,
                    'cached': True,
                    'cache_timestamp': timestamp
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Cache check failed: {e}")
            return None
    
    def cache_result(self, email_hash: str, result: Dict):
        """Cache scan result"""
        try:
            conn = sqlite3.connect(self.cache_db)
            cursor = conn.cursor()
            
            is_spam = 1 if result['status'] == 'threat' else 0
            timestamp = datetime.utcnow().isoformat()
            metadata = json.dumps(result.get('threat_indicators', []))
            
            cursor.execute('''
                INSERT OR REPLACE INTO spam_cache 
                (email_hash, is_spam, confidence, source, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (email_hash, is_spam, result['confidence'], 'layer1', timestamp, metadata))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Cache storage failed: {e}")
    
    def check_spam_patterns(self, email_data: Dict) -> Dict:
        """Check against known spam patterns"""
        indicators = []
        confidence = 0.0
        
        sender = email_data.get('sender', '').lower()
        subject = email_data.get('subject', '').lower()
        body = email_data.get('body', '').lower()
        
        # Check sender domain
        for domain in self.spam_patterns['sender_domains']:
            if domain in sender:
                indicators.append(f"Suspicious sender domain: {domain}")
                confidence = max(confidence, 0.9)
        
        # Check subject patterns
        import re
        for pattern in self.spam_patterns['subject_patterns']:
            if re.search(pattern, subject, re.IGNORECASE):
                indicators.append(f"Suspicious subject pattern: {pattern}")
                confidence = max(confidence, 0.8)
        
        # Check body patterns
        for pattern in self.spam_patterns['body_patterns']:
            if re.search(pattern, body, re.IGNORECASE):
                indicators.append(f"Suspicious body pattern: {pattern}")
                confidence = max(confidence, 0.7)
        
        return {
            'is_suspicious': len(indicators) > 0,
            'confidence': confidence,
            'indicators': indicators
        }
    
    def check_sender_reputation(self, email_data: Dict) -> Dict:
        """Check sender reputation (simulated)"""
        sender = email_data.get('sender', '')
        
        # Simulate sender reputation check
        # In production, this would query real reputation databases
        
        suspicious_indicators = []
        confidence = 0.0
        
        # Check for suspicious sender patterns
        if '@' not in sender:
            suspicious_indicators.append("Invalid sender format")
            confidence = 0.9
        
        # Check domain reputation (simulated)
        domain = sender.split('@')[-1] if '@' in sender else ''
        
        # Simulate checks for new domains, suspicious TLDs, etc.
        suspicious_tlds = ['.tk', '.ml', '.ga', '.cf']
        for tld in suspicious_tlds:
            if domain.endswith(tld):
                suspicious_indicators.append(f"Suspicious TLD: {tld}")
                confidence = max(confidence, 0.7)
        
        return {
            'is_suspicious': len(suspicious_indicators) > 0,
            'confidence': confidence,
            'indicators': suspicious_indicators
        }
    
    def check_urls(self, email_body: str) -> Dict:
        """Check URLs in email body"""
        import re
        
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        urls = re.findall(url_pattern, email_body)
        
        suspicious_urls = []
        indicators = []
        
        for url in urls:
            # Check against known URL shorteners
            for shortener in self.spam_patterns['suspicious_urls']:
                if shortener in url:
                    suspicious_urls.append(url)
                    indicators.append(f"URL shortener detected: {shortener}")
        
        return {
            'urls_found': urls,
            'suspicious_urls': suspicious_urls,
            'indicators': indicators
        }
    
    def update_spam_database(self, new_patterns: Dict):
        """Update spam patterns database"""
        try:
            for category, patterns in new_patterns.items():
                if category in self.spam_patterns:
                    self.spam_patterns[category].extend(patterns)
            
            logger.info("Spam patterns database updated")
            
        except Exception as e:
            logger.error(f"Failed to update spam database: {e}")
    
    def get_statistics(self) -> Dict:
        """Get Layer 1 statistics"""
        try:
            conn = sqlite3.connect(self.cache_db)
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) FROM spam_cache')
            total_checks = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM spam_cache WHERE is_spam = 1')
            spam_detected = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_checks': total_checks,
                'spam_detected': spam_detected,
                'clean_emails': total_checks - spam_detected,
                'spam_rate': spam_detected / total_checks if total_checks > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {}