# Security Validator - Input validation and security checks

import re
import logging
import time
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse
import hashlib

logger = logging.getLogger(__name__)

class SecurityValidator:
    def __init__(self):
        # Security patterns
        self.malicious_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'data:text/html',  # Data URLs
            r'vbscript:',  # VBScript
            r'onload\s*=',  # Event handlers
            r'onerror\s*=',
            r'onclick\s*='
        ]
        
        # Dangerous file extensions
        self.dangerous_extensions = [
            '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
            '.jar', '.app', '.deb', '.pkg', '.dmg', '.msi'
        ]
        
        # Suspicious domains
        self.suspicious_domains = [
            'bit.ly', 'tinyurl.com', 'short.link', 't.co',
            'goo.gl', 'ow.ly', 'tiny.cc'
        ]
        
        logger.info("Security Validator initialized")
    
    def validate_input(self, data: Any, input_type: str = 'general') -> Dict:
        """
        Validate input data for security threats
        
        Args:
            data: Input data to validate
            input_type: Type of input (email, url, text, etc.)
            
        Returns:
            Dict with validation results
        """
        try:
            validation_result = {
                'is_safe': True,
                'threats_detected': [],
                'risk_level': 'low',
                'sanitized_data': data
            }
            
            if input_type == 'email':
                return self.validate_email_input(data)
            elif input_type == 'url':
                return self.validate_url_input(data)
            elif input_type == 'text':
                return self.validate_text_input(data)
            else:
                return self.validate_general_input(data)
                
        except Exception as e:
            logger.error(f"Input validation failed: {e}")
            return {
                'is_safe': False,
                'threats_detected': ['validation_error'],
                'risk_level': 'high',
                'sanitized_data': None,
                'error': str(e)
            }
    
    def validate_email_input(self, email_data: Dict) -> Dict:
        """Validate email data for security threats"""
        threats = []
        risk_level = 'low'
        
        try:
            # Check email body for malicious content
            body = email_data.get('body', '')
            if body:
                body_threats = self.scan_for_malicious_patterns(body)
                threats.extend(body_threats)
            
            # Check URLs in email
            urls = email_data.get('urls', [])
            for url in urls:
                url_validation = self.validate_url_input(url)
                if not url_validation['is_safe']:
                    threats.extend(url_validation['threats_detected'])
            
            # Check for suspicious sender patterns
            sender = email_data.get('sender', '')
            if sender:
                sender_threats = self.validate_sender(sender)
                threats.extend(sender_threats)
            
            # Determine risk level
            if len(threats) >= 3:
                risk_level = 'high'
            elif len(threats) >= 1:
                risk_level = 'medium'
            
            return {
                'is_safe': len(threats) == 0,
                'threats_detected': threats,
                'risk_level': risk_level,
                'sanitized_data': self.sanitize_email_data(email_data)
            }
            
        except Exception as e:
            logger.error(f"Email validation failed: {e}")
            return {
                'is_safe': False,
                'threats_detected': ['email_validation_error'],
                'risk_level': 'high',
                'sanitized_data': None
            }
    
    def validate_url_input(self, url: str) -> Dict:
        """Validate URL for security threats"""
        threats = []
        
        try:
            if not isinstance(url, str):
                return {
                    'is_safe': False,
                    'threats_detected': ['invalid_url_type'],
                    'risk_level': 'high',
                    'sanitized_data': None
                }
            
            # Parse URL
            try:
                parsed = urlparse(url)
            except Exception:
                threats.append('malformed_url')
                return {
                    'is_safe': False,
                    'threats_detected': threats,
                    'risk_level': 'high',
                    'sanitized_data': None
                }
            
            # Check for suspicious protocols
            if parsed.scheme.lower() in ['javascript', 'vbscript', 'data']:
                threats.append('suspicious_protocol')
            
            # Check for suspicious domains
            domain = parsed.netloc.lower()
            if any(sus_domain in domain for sus_domain in self.suspicious_domains):
                threats.append('suspicious_domain')
            
            # Check for URL shorteners
            if any(shortener in domain for shortener in self.suspicious_domains):
                threats.append('url_shortener')
            
            # Check for suspicious paths
            path = parsed.path.lower()
            if any(ext in path for ext in self.dangerous_extensions):
                threats.append('dangerous_file_extension')
            
            # Check for excessive URL length (potential buffer overflow)
            if len(url) > 2000:
                threats.append('excessive_url_length')
            
            risk_level = 'high' if len(threats) >= 2 else 'medium' if threats else 'low'
            
            return {
                'is_safe': len(threats) == 0,
                'threats_detected': threats,
                'risk_level': risk_level,
                'sanitized_data': self.sanitize_url(url)
            }
            
        except Exception as e:
            logger.error(f"URL validation failed: {e}")
            return {
                'is_safe': False,
                'threats_detected': ['url_validation_error'],
                'risk_level': 'high',
                'sanitized_data': None
            }
    
    def validate_text_input(self, text: str) -> Dict:
        """Validate text input for security threats"""
        threats = []
        
        try:
            if not isinstance(text, str):
                return {
                    'is_safe': False,
                    'threats_detected': ['invalid_text_type'],
                    'risk_level': 'high',
                    'sanitized_data': None
                }
            
            # Check for malicious patterns
            malicious_patterns = self.scan_for_malicious_patterns(text)
            threats.extend(malicious_patterns)
            
            # Check for excessive length
            if len(text) > 100000:  # 100KB limit
                threats.append('excessive_text_length')
            
            # Check for null bytes
            if '\x00' in text:
                threats.append('null_byte_injection')
            
            # Check for control characters
            control_chars = [char for char in text if ord(char) < 32 and char not in '\t\n\r']
            if control_chars:
                threats.append('control_characters')
            
            risk_level = 'high' if len(threats) >= 2 else 'medium' if threats else 'low'
            
            return {
                'is_safe': len(threats) == 0,
                'threats_detected': threats,
                'risk_level': risk_level,
                'sanitized_data': self.sanitize_text(text)
            }
            
        except Exception as e:
            logger.error(f"Text validation failed: {e}")
            return {
                'is_safe': False,
                'threats_detected': ['text_validation_error'],
                'risk_level': 'high',
                'sanitized_data': None
            }
    
    def validate_general_input(self, data: Any) -> Dict:
        """General input validation"""
        threats = []
        
        try:
            # Check data type
            if not isinstance(data, (str, dict, list, int, float, bool, type(None))):
                threats.append('unsupported_data_type')
            
            # Check for excessive nesting (for dict/list)
            if isinstance(data, (dict, list)):
                if self.check_excessive_nesting(data, max_depth=10):
                    threats.append('excessive_nesting')
            
            # Convert to string and check patterns
            if isinstance(data, (dict, list)):
                text_repr = str(data)
                if len(text_repr) > 50000:  # Large data structures
                    threats.append('excessive_data_size')
            
            risk_level = 'high' if len(threats) >= 2 else 'medium' if threats else 'low'
            
            return {
                'is_safe': len(threats) == 0,
                'threats_detected': threats,
                'risk_level': risk_level,
                'sanitized_data': self.sanitize_general_data(data)
            }
            
        except Exception as e:
            logger.error(f"General validation failed: {e}")
            return {
                'is_safe': False,
                'threats_detected': ['general_validation_error'],
                'risk_level': 'high',
                'sanitized_data': None
            }
    
    def scan_for_malicious_patterns(self, text: str) -> List[str]:
        """Scan text for malicious patterns"""
        threats = []
        
        for pattern in self.malicious_patterns:
            if re.search(pattern, text, re.IGNORECASE | re.DOTALL):
                threats.append(f'malicious_pattern_{pattern[:20]}')
        
        return threats
    
    def validate_sender(self, sender: str) -> List[str]:
        """Validate email sender for suspicious patterns"""
        threats = []
        
        # Check for suspicious sender patterns
        suspicious_patterns = [
            r'no-reply.*@.*\.tk$',  # Suspicious TLD with no-reply
            r'security.*@.*\.ml$',   # Security from suspicious TLD
            r'admin.*@.*\.ga$',      # Admin from suspicious TLD
            r'.*@[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$',  # IP address instead of domain
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, sender, re.IGNORECASE):
                threats.append('suspicious_sender_pattern')
                break
        
        # Check for homograph attacks (simplified)
        if self.contains_homograph_chars(sender):
            threats.append('homograph_attack')
        
        return threats
    
    def contains_homograph_chars(self, text: str) -> bool:
        """Check for homograph attack characters"""
        # Common homograph characters that might be used in phishing
        homograph_chars = [
            'а',  # Cyrillic 'a'
            'е',  # Cyrillic 'e'
            'о',  # Cyrillic 'o'
            'р',  # Cyrillic 'p'
            'с',  # Cyrillic 'c'
            'х',  # Cyrillic 'x'
        ]
        
        return any(char in text for char in homograph_chars)
    
    def check_excessive_nesting(self, data: Any, max_depth: int, current_depth: int = 0) -> bool:
        """Check for excessive nesting in data structures"""
        if current_depth > max_depth:
            return True
        
        if isinstance(data, dict):
            return any(self.check_excessive_nesting(value, max_depth, current_depth + 1) 
                      for value in data.values())
        elif isinstance(data, list):
            return any(self.check_excessive_nesting(item, max_depth, current_depth + 1) 
                      for item in data)
        
        return False
    
    def sanitize_email_data(self, email_data: Dict) -> Dict:
        """Sanitize email data"""
        sanitized = {}
        
        for key, value in email_data.items():
            if isinstance(value, str):
                sanitized[key] = self.sanitize_text(value)
            elif isinstance(value, list):
                sanitized[key] = [self.sanitize_text(item) if isinstance(item, str) else item 
                                for item in value]
            else:
                sanitized[key] = value
        
        return sanitized
    
    def sanitize_url(self, url: str) -> str:
        """Sanitize URL"""
        if not isinstance(url, str):
            return ''
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\'\\]', '', url)
        
        # Limit length
        if len(sanitized) > 2000:
            sanitized = sanitized[:2000]
        
        return sanitized
    
    def sanitize_text(self, text: str) -> str:
        """Sanitize text input"""
        if not isinstance(text, str):
            return ''
        
        # Remove null bytes
        sanitized = text.replace('\x00', '')
        
        # Remove dangerous script tags
        for pattern in self.malicious_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove control characters (except tab, newline, carriage return)
        sanitized = ''.join(char for char in sanitized 
                          if ord(char) >= 32 or char in '\t\n\r')
        
        # Limit length
        if len(sanitized) > 50000:
            sanitized = sanitized[:50000] + '... [truncated for safety]'
        
        return sanitized
    
    def sanitize_general_data(self, data: Any) -> Any:
        """Sanitize general data"""
        if isinstance(data, str):
            return self.sanitize_text(data)
        elif isinstance(data, dict):
            return {key: self.sanitize_general_data(value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self.sanitize_general_data(item) for item in data]
        else:
            return data
    
    def generate_content_hash(self, content: str) -> str:
        """Generate hash for content identification"""
        try:
            return hashlib.sha256(content.encode('utf-8')).hexdigest()
        except Exception as e:
            logger.error(f"Hash generation failed: {e}")
            return ''
    
    def validate_api_key(self, api_key: str) -> bool:
        """Validate API key format"""
        try:
            if not isinstance(api_key, str):
                return False
            
            # Basic API key validation
            if len(api_key) < 16 or len(api_key) > 128:
                return False
            
            # Check for suspicious patterns
            if any(char in api_key for char in '<>"\' '):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
            return False
    
    def rate_limit_check(self, user_id: str, action: str, max_requests: int = 100, 
                        time_window: int = 3600) -> Dict:
        """Check rate limiting (simplified implementation)"""
        # In production, this would use Redis or similar for distributed rate limiting
        try:
            current_time = int(time.time())
            
            # Simple in-memory rate limiting (not suitable for production)
            # This is just a placeholder for the concept
            
            return {
                'allowed': True,
                'remaining_requests': max_requests - 1,
                'reset_time': current_time + time_window
            }
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return {
                'allowed': False,
                'remaining_requests': 0,
                'reset_time': 0,
                'error': str(e)
            }