# Email Processor - Handles email content processing and normalization

import re
import html
import logging
from typing import Dict, List, Optional
from datetime import datetime
from email.utils import parseaddr, parsedate_to_datetime
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

logger = logging.getLogger(__name__)

class EmailProcessor:
    def __init__(self):
        # Email normalization patterns
        self.url_pattern = re.compile(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        )
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})')
        
        logger.info("Email Processor initialized")
    
    def process(self, email_data: Dict) -> Dict:
        """
        Process and normalize email data
        
        Args:
            email_data: Raw email data from Chrome extension
            
        Returns:
            Dict with processed email data
        """
        try:
            # Handle both 'from' and 'sender' field names for compatibility
            sender_field = email_data.get('from', email_data.get('sender', ''))
            
            processed = {
                'sender': self.normalize_sender(sender_field),
                'subject': self.normalize_subject(email_data.get('subject', '')),
                'body': self.normalize_body(email_data.get('body', '')),
                'timestamp': self.normalize_timestamp(email_data.get('date', '')),
                'urls': [],
                'emails': [],
                'phones': [],
                'metadata': {}
            }
            
            # Extract structured data
            processed['urls'] = self.extract_urls(processed['body'])
            processed['emails'] = self.extract_emails(processed['body'])
            processed['phones'] = self.extract_phone_numbers(processed['body'])
            
            # Add metadata
            processed['metadata'] = {
                'original_data': email_data,
                'processing_timestamp': datetime.utcnow().isoformat(),
                'text_length': len(processed['body']),
                'url_count': len(processed['urls']),
                'email_count': len(processed['emails']),
                'phone_count': len(processed['phones'])
            }
            
            logger.debug(f"Processed email from {processed['sender']}")
            
            return processed
            
        except Exception as e:
            logger.error(f"Email processing failed: {e}")
            # Return minimal processed data
            return {
                'sender': email_data.get('sender', ''),
                'subject': email_data.get('subject', ''),
                'body': email_data.get('body', ''),
                'timestamp': datetime.utcnow().isoformat(),
                'urls': [],
                'emails': [],
                'phones': [],
                'metadata': {'error': str(e)}
            }
    
    def normalize_sender(self, sender: str) -> str:
        """Normalize sender email address"""
        try:
            if not sender:
                return ''
            
            # Parse email address (handle "Name <email@domain.com>" format)
            name, email = parseaddr(sender)
            
            if email:
                return email.lower().strip()
            else:
                # Fallback: extract email with regex
                matches = self.email_pattern.findall(sender)
                if matches:
                    return matches[0].lower().strip()
                else:
                    return sender.strip()
                    
        except Exception as e:
            logger.warning(f"Sender normalization failed: {e}")
            return sender.strip() if sender else ''
    
    def normalize_subject(self, subject: str) -> str:
        """Normalize email subject"""
        try:
            if not subject:
                return ''
            
            # Decode HTML entities
            normalized = html.unescape(subject)
            
            # Remove excessive whitespace
            normalized = ' '.join(normalized.split())
            
            # Remove null bytes and control characters
            normalized = ''.join(char for char in normalized if ord(char) >= 32 or char in '\t\n\r')
            
            return normalized.strip()
            
        except Exception as e:
            logger.warning(f"Subject normalization failed: {e}")
            return subject.strip() if subject else ''
    
    def normalize_body(self, body: str) -> str:
        """Normalize email body content"""
        try:
            if not body:
                return ''
            
            # Remove HTML tags if BeautifulSoup is available
            if BeautifulSoup:
                try:
                    soup = BeautifulSoup(body, 'html.parser')
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    text = soup.get_text()
                except Exception:
                    # Fallback to simple HTML removal
                    text = self.remove_html_simple(body)
            else:
                text = self.remove_html_simple(body)
            
            # Decode HTML entities
            text = html.unescape(text)
            
            # Normalize whitespace
            text = ' '.join(text.split())
            
            # Remove null bytes and control characters
            text = ''.join(char for char in text if ord(char) >= 32 or char in '\t\n\r')
            
            # Limit length (prevent extremely long emails from causing issues)
            if len(text) > 10000:
                text = text[:10000] + '... [truncated]'
            
            return text.strip()
            
        except Exception as e:
            logger.warning(f"Body normalization failed: {e}")
            return body.strip() if body else ''
    
    def remove_html_simple(self, text: str) -> str:
        """Simple HTML tag removal without external dependencies"""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text
    
    def normalize_timestamp(self, timestamp: str) -> str:
        """Normalize timestamp to ISO format"""
        try:
            if not timestamp:
                return datetime.utcnow().isoformat()
            
            # Try to parse various timestamp formats
            try:
                # Try ISO format first
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                return dt.isoformat()
            except:
                pass
            
            try:
                # Try email date format
                dt = parsedate_to_datetime(timestamp)
                return dt.isoformat()
            except:
                pass
            
            try:
                # Try common formats
                formats = [
                    '%Y-%m-%d %H:%M:%S',
                    '%m/%d/%Y %I:%M:%S %p',
                    '%d/%m/%Y %H:%M:%S',
                    '%Y-%m-%d',
                    '%m/%d/%Y'
                ]
                
                for fmt in formats:
                    try:
                        dt = datetime.strptime(timestamp, fmt)
                        return dt.isoformat()
                    except:
                        continue
            except:
                pass
            
            # Fallback to current time
            logger.warning(f"Could not parse timestamp: {timestamp}")
            return datetime.utcnow().isoformat()
            
        except Exception as e:
            logger.warning(f"Timestamp normalization failed: {e}")
            return datetime.utcnow().isoformat()
    
    def extract_urls(self, text: str) -> List[str]:
        """Extract URLs from text"""
        try:
            if not text:
                return []
            
            urls = self.url_pattern.findall(text)
            
            # Clean and validate URLs
            cleaned_urls = []
            for url in urls:
                url = url.strip()
                if url and len(url) > 10:  # Basic validation
                    cleaned_urls.append(url)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_urls = []
            for url in cleaned_urls:
                if url not in seen:
                    seen.add(url)
                    unique_urls.append(url)
            
            return unique_urls[:10]  # Limit to first 10 URLs
            
        except Exception as e:
            logger.warning(f"URL extraction failed: {e}")
            return []
    
    def extract_emails(self, text: str) -> List[str]:
        """Extract email addresses from text"""
        try:
            if not text:
                return []
            
            emails = self.email_pattern.findall(text)
            
            # Clean and validate emails
            cleaned_emails = []
            for email in emails:
                email = email.lower().strip()
                if email and '@' in email and '.' in email.split('@')[-1]:
                    cleaned_emails.append(email)
            
            # Remove duplicates
            return list(set(cleaned_emails))[:10]  # Limit to first 10 emails
            
        except Exception as e:
            logger.warning(f"Email extraction failed: {e}")
            return []
    
    def extract_phone_numbers(self, text: str) -> List[str]:
        """Extract phone numbers from text"""
        try:
            if not text:
                return []
            
            matches = self.phone_pattern.findall(text)
            
            # Format phone numbers consistently
            phones = []
            for match in matches:
                if isinstance(match, tuple):
                    # Extract digits and format
                    digits = ''.join(re.findall(r'\d', ''.join(match)))
                    if len(digits) >= 10:
                        phones.append(digits)
                else:
                    digits = ''.join(re.findall(r'\d', match))
                    if len(digits) >= 10:
                        phones.append(digits)
            
            # Remove duplicates
            return list(set(phones))[:5]  # Limit to first 5 phone numbers
            
        except Exception as e:
            logger.warning(f"Phone extraction failed: {e}")
            return []
    
    def extract_features(self, email_data: Dict) -> Dict:
        """Extract features for ML model"""
        try:
            features = {
                # Text-based features
                'subject_length': len(email_data.get('subject', '')),
                'body_length': len(email_data.get('body', '')),
                'url_count': len(email_data.get('urls', [])),
                'email_count': len(email_data.get('emails', [])),
                'phone_count': len(email_data.get('phones', [])),
                
                # Sender analysis
                'sender_domain': self.extract_domain(email_data.get('sender', '')),
                'sender_is_reply_address': 'no-reply' in email_data.get('sender', '').lower(),
                
                # Content analysis
                'has_urgent_words': self.contains_urgent_words(email_data.get('subject', '') + ' ' + email_data.get('body', '')),
                'has_suspicious_attachments': False,  # Would need attachment analysis
                'contains_external_links': len(email_data.get('urls', [])) > 0,
                
                # Timing features
                'timestamp': email_data.get('timestamp', ''),
                'is_weekend': self.is_weekend_email(email_data.get('timestamp', '')),
                'is_after_hours': self.is_after_hours_email(email_data.get('timestamp', ''))
            }
            
            return features
            
        except Exception as e:
            logger.warning(f"Feature extraction failed: {e}")
            return {}
    
    def extract_domain(self, email: str) -> str:
        """Extract domain from email address"""
        try:
            if '@' in email:
                return email.split('@')[-1].lower()
            return ''
        except:
            return ''
    
    def contains_urgent_words(self, text: str) -> bool:
        """Check if text contains urgent/suspicious words"""
        urgent_words = [
            'urgent', 'immediate', 'expires', 'deadline', 'asap', 'emergency',
            'suspended', 'locked', 'blocked', 'verify', 'confirm', 'click here',
            'act now', 'limited time', 'expires today', 'final notice'
        ]
        
        text_lower = text.lower()
        return any(word in text_lower for word in urgent_words)
    
    def is_weekend_email(self, timestamp: str) -> bool:
        """Check if email was sent on weekend"""
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            return dt.weekday() >= 5  # Saturday=5, Sunday=6
        except:
            return False
    
    def is_after_hours_email(self, timestamp: str) -> bool:
        """Check if email was sent after business hours"""
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            hour = dt.hour
            return hour < 8 or hour > 18  # Before 8 AM or after 6 PM
        except:
            return False
    
    def validate_email_data(self, email_data: Dict) -> Dict:
        """Validate email data structure"""
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Required fields
        required_fields = ['sender', 'subject', 'body']
        for field in required_fields:
            if not email_data.get(field):
                validation_result['errors'].append(f"Missing or empty field: {field}")
                validation_result['is_valid'] = False
        
        # Sender validation
        sender = email_data.get('sender', '')
        if sender and '@' not in sender:
            validation_result['warnings'].append("Sender does not appear to be a valid email address")
        
        # Body length validation
        body = email_data.get('body', '')
        if len(body) > 50000:  # Very long email
            validation_result['warnings'].append("Email body is unusually long")
        elif len(body) < 10:  # Very short email
            validation_result['warnings'].append("Email body is unusually short")
        
        return validation_result