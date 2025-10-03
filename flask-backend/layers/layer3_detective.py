# Layer 3: Detective Agent with Gemini LLM and RAG
# Advanced social engineering detection with user context

import logging
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json
try:
    import google.generativeai as genai
except ImportError:
    genai = None
from database.rag_database import RAGDatabase
from config import Config

logger = logging.getLogger(__name__)

class Layer3DetectiveAgent:
    def __init__(self):
        # Initialize Gemini AI
        self.setup_gemini()
        
        # RAG database for user context and threat intelligence
        self.rag_db = RAGDatabase()
        
        # Detective analysis prompts
        self.setup_prompts()
        
        # Conversation tracking
        self.active_conversations = {}
        
        logger.info("Layer 3 Detective Agent initialized")
    
    def setup_gemini(self):
        """Setup Google Gemini AI"""
        try:
            # Load API key from environment configuration
            api_key = Config.GEMINI_API_KEY

            # Validate API key
            if not api_key or api_key == 'your-gemini-api-key-here':
                logger.error("GEMINI_API_KEY not configured. Please set it in .env file")
                self.model = None
                return

            if not genai:
                logger.error("google.generativeai module not installed. Install with: pip install google-generativeai")
                self.model = None
                return

            # Configure Gemini with API key
            genai.configure(api_key=api_key)

            # Initialize model with latest flash model (fast and efficient for phishing detection)
            self.model = genai.GenerativeModel('gemini-2.5-flash')

            logger.info("Gemini AI configured successfully with gemini-2.5-flash model")

        except Exception as e:
            logger.error(f"Failed to setup Gemini AI: {e}")
            self.model = None
    
    def setup_prompts(self):
        """Setup prompts for different analysis types"""
        self.prompts = {
            'social_engineering_analysis': """
You are an expert cybersecurity detective specializing in social engineering and phishing detection.

Analyze this email for social engineering tactics and potential threats:

EMAIL DATA:
Subject: {subject}
From: {sender}
Body: {body}

USER CONTEXT:
{user_context}

PREVIOUS SCAN RESULTS:
Layer 1: {layer1_results}
Layer 2: {layer2_results}

Please analyze this email and provide:

1. **Social Engineering Score** (0-100): Rate the likelihood this is a social engineering attack
2. **Tactics Identified**: List specific social engineering tactics used
3. **Personal Context Relevance**: How the attack relates to the user's profile
4. **Threat Assessment**: Detailed explanation of the threat
5. **Recommended Action**: What the user should do

Be thorough but concise. Focus on patterns that indicate deception, manipulation, or impersonation.
""",
            
            'impersonation_detection': """
Analyze if this email is attempting to impersonate someone the user knows or a legitimate organization.

EMAIL: {email_content}
USER CONTACTS: {user_contacts}
USER ORGANIZATIONS: {user_organizations}

Check for:
- Name similarity to known contacts
- Domain spoofing attempts
- Authority impersonation
- Relationship manipulation

Provide a detailed impersonation analysis.
""",
            
            'conversation_continuation': """
This email is part of an ongoing conversation. Previous context:

CONVERSATION HISTORY: {conversation_history}
NEW EMAIL: {new_email}

Analyze if this continues a legitimate conversation or if the tone/content has shifted to indicate a compromised account or impersonation attempt.
"""
        }
    
    def analyze_email(self, email_data: Dict, user_id: str, layer2_results: Dict) -> Dict:
        """
        Perform comprehensive detective analysis using Gemini LLM and RAG
        
        Args:
            email_data: Processed email data
            user_id: User identifier for context
            layer2_results: Results from Layer 2 analysis
            
        Returns:
            Dict with detective analysis results
        """
        start_time = datetime.utcnow()
        
        try:
            # Get user context from RAG database
            user_context = self.get_user_experience(user_id)
            
            # Perform social engineering analysis
            se_analysis = self.analyze_social_engineering(
                email_data, user_context, layer2_results
            )
            
            # Check for impersonation attempts
            impersonation_analysis = self.detect_impersonation(
                email_data, user_context
            )
            
            # Analyze conversation context if applicable
            conversation_analysis = self.analyze_conversation_context(
                email_data, user_id
            )
            
            # Generate final assessment
            final_assessment = self.generate_final_assessment(
                se_analysis, impersonation_analysis, conversation_analysis
            )
            
            result = {
                'layer': 3,
                'verdict': final_assessment['verdict'],
                'threat_level': final_assessment['threat_level'],
                'confidence': final_assessment['confidence'],
                'social_engineering_score': se_analysis.get('score', 0),
                'tactics_identified': se_analysis.get('tactics', []),
                'impersonation_risk': impersonation_analysis.get('risk_level', 'low'),
                'personal_context': final_assessment.get('personal_relevance', 'none'),
                'detailed_analysis': final_assessment.get('analysis', ''),
                'recommended_action': final_assessment.get('recommendation', ''),
                'processing_time': (datetime.utcnow() - start_time).total_seconds()
            }
            
            # Store analysis results
            self.store_analysis_results(email_data, user_id, result)
            
            # Start conversation monitoring if flagged as suspicious
            if result['verdict'] in ['threat', 'suspicious']:
                self.start_conversation_monitoring(email_data, user_id)
            
            logger.info(f"Layer 3 analysis complete: verdict={result['verdict']}, "
                       f"se_score={result['social_engineering_score']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Layer 3 analysis failed: {e}")
            return {
                'layer': 3,
                'verdict': 'error',
                'threat_level': 'unknown',
                'confidence': 0.0,
                'error': str(e),
                'processing_time': (datetime.utcnow() - start_time).total_seconds()
            }
    
    def get_user_experience(self, user_id: str) -> Dict:
        """Get user experience and context data"""
        try:
            return self.rag_db.get_user_experience(user_id)
        except Exception as e:
            logger.error(f"Failed to get user experience: {e}")
            return {}
    
    def analyze_social_engineering(self, email_data: Dict, user_context: Dict, 
                                 layer2_results: Dict) -> Dict:
        """Analyze email for social engineering tactics"""
        try:
            if not self.model:
                return self.fallback_social_engineering_analysis(email_data)
            
            # Prepare prompt
            prompt = self.prompts['social_engineering_analysis'].format(
                subject=email_data.get('subject', ''),
                sender=email_data.get('sender', ''),
                body=email_data.get('body', ''),
                user_context=json.dumps(user_context, indent=2),
                layer1_results="Clean - no known spam signatures",
                layer2_results=json.dumps(layer2_results, indent=2)
            )
            
            # Get Gemini analysis
            response = self.model.generate_content(prompt)
            analysis_text = response.text
            
            # Parse the response
            analysis = self.parse_gemini_response(analysis_text)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Social engineering analysis failed: {e}")
            return self.fallback_social_engineering_analysis(email_data)
    
    def detect_impersonation(self, email_data: Dict, user_context: Dict) -> Dict:
        """Detect impersonation attempts"""
        try:
            sender = email_data.get('sender', '').lower()
            subject = email_data.get('subject', '').lower()
            body = email_data.get('body', '').lower()
            
            impersonation_indicators = []
            risk_level = 'low'
            
            # Check against known contacts
            known_contacts = user_context.get('contacts', [])
            for contact in known_contacts:
                contact_name = contact.get('name', '').lower()
                contact_email = contact.get('email', '').lower()
                
                # Check for name similarity with different email
                if contact_name in body and contact_email not in sender:
                    impersonation_indicators.append(
                        f"Name '{contact_name}' mentioned but email doesn't match known contact"
                    )
                    risk_level = 'high'
            
            # Check for authority impersonation
            authority_keywords = ['bank', 'paypal', 'amazon', 'microsoft', 'google', 'apple']
            for keyword in authority_keywords:
                if keyword in sender and keyword not in sender.split('@')[-1]:
                    impersonation_indicators.append(
                        f"Potential {keyword} impersonation - sender doesn't match official domain"
                    )
                    risk_level = 'medium' if risk_level == 'low' else risk_level
            
            return {
                'risk_level': risk_level,
                'indicators': impersonation_indicators,
                'analysis': f"Detected {len(impersonation_indicators)} impersonation indicators"
            }
            
        except Exception as e:
            logger.error(f"Impersonation detection failed: {e}")
            return {'risk_level': 'unknown', 'indicators': [], 'analysis': 'Analysis failed'}
    
    def analyze_conversation_context(self, email_data: Dict, user_id: str) -> Dict:
        """Analyze if this email is part of an ongoing conversation"""
        try:
            sender = email_data.get('sender', '')
            subject = email_data.get('subject', '')
            
            # Check for conversation indicators
            conversation_indicators = []
            
            # Check for "Re:" or "Fwd:" patterns
            if subject.startswith(('re:', 'fwd:', 'fw:')):
                conversation_indicators.append("Reply or forward pattern detected")
            
            # Check conversation history (simplified)
            conversation_history = self.rag_db.get_conversation_history(user_id, sender)
            
            if conversation_history:
                conversation_indicators.append(f"Found {len(conversation_history)} previous emails from sender")
                
                # Analyze tone shift (simplified)
                recent_tone = self.analyze_email_tone(email_data)
                historical_tone = self.analyze_historical_tone(conversation_history)
                
                if recent_tone != historical_tone:
                    conversation_indicators.append("Tone shift detected - possible account compromise")
            
            return {
                'is_conversation': len(conversation_indicators) > 0,
                'indicators': conversation_indicators,
                'conversation_length': len(conversation_history) if conversation_history else 0
            }
            
        except Exception as e:
            logger.error(f"Conversation analysis failed: {e}")
            return {'is_conversation': False, 'indicators': [], 'conversation_length': 0}
    
    def generate_final_assessment(self, se_analysis: Dict, impersonation_analysis: Dict, 
                                conversation_analysis: Dict) -> Dict:
        """Generate final threat assessment"""
        try:
            # Calculate overall threat score
            se_score = se_analysis.get('score', 0)
            impersonation_risk = impersonation_analysis.get('risk_level', 'low')
            conversation_risk = len(conversation_analysis.get('indicators', []))
            
            # Risk scoring
            total_score = se_score
            
            if impersonation_risk == 'high':
                total_score += 30
            elif impersonation_risk == 'medium':
                total_score += 15
            
            total_score += conversation_risk * 10
            
            # Determine verdict
            if total_score >= 80:
                verdict = 'threat'
                threat_level = 'high'
                confidence = 0.9
            elif total_score >= 60:
                verdict = 'suspicious'
                threat_level = 'medium'
                confidence = 0.75
            elif total_score >= 40:
                verdict = 'suspicious'
                threat_level = 'low'
                confidence = 0.6
            else:
                verdict = 'safe'
                threat_level = 'low'
                confidence = 0.8
            
            # Generate detailed analysis
            analysis_parts = []
            
            if se_analysis.get('tactics'):
                analysis_parts.append(f"Social engineering tactics detected: {', '.join(se_analysis['tactics'])}")
            
            if impersonation_analysis.get('indicators'):
                analysis_parts.append(f"Impersonation risks: {', '.join(impersonation_analysis['indicators'])}")
            
            if conversation_analysis.get('indicators'):
                analysis_parts.append(f"Conversation anomalies: {', '.join(conversation_analysis['indicators'])}")
            
            detailed_analysis = '. '.join(analysis_parts) if analysis_parts else "No significant threats detected."
            
            # Generate recommendation
            if verdict == 'threat':
                recommendation = "DO NOT INTERACT with this email. Delete immediately and report as phishing."
            elif verdict == 'suspicious':
                recommendation = "Exercise extreme caution. Verify sender through alternative communication channel before taking any action."
            else:
                recommendation = "Email appears legitimate, but always verify requests for sensitive information."
            
            return {
                'verdict': verdict,
                'threat_level': threat_level,
                'confidence': confidence,
                'total_score': total_score,
                'analysis': detailed_analysis,
                'recommendation': recommendation,
                'personal_relevance': 'high' if total_score > 60 else 'medium' if total_score > 30 else 'low'
            }
            
        except Exception as e:
            logger.error(f"Final assessment generation failed: {e}")
            return {
                'verdict': 'error',
                'threat_level': 'unknown',
                'confidence': 0.0,
                'analysis': 'Assessment failed',
                'recommendation': 'Manual review required'
            }
    
    def parse_gemini_response(self, response_text: str) -> Dict:
        """Parse Gemini AI response into structured data"""
        try:
            # This is a simplified parser - in production, use more robust parsing
            analysis = {
                'score': 50,  # default
                'tactics': [],
                'analysis': response_text
            }
            
            # Extract score if present
            lines = response_text.split('\n')
            for line in lines:
                if 'score' in line.lower() and any(char.isdigit() for char in line):
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        analysis['score'] = min(int(numbers[0]), 100)
                        break
            
            # Extract tactics
            tactics_section = False
            for line in lines:
                if 'tactics' in line.lower():
                    tactics_section = True
                    continue
                
                if tactics_section and line.strip():
                    if line.startswith('-') or line.startswith('*'):
                        tactic = line.strip().lstrip('-*').strip()
                        if tactic:
                            analysis['tactics'].append(tactic)
                    elif not line.startswith(' '):
                        tactics_section = False
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return {'score': 50, 'tactics': [], 'analysis': response_text}
    
    def fallback_social_engineering_analysis(self, email_data: Dict) -> Dict:
        """Fallback analysis when Gemini is not available"""
        logger.warning("Using fallback social engineering analysis")
        
        subject = email_data.get('subject', '').lower()
        body = email_data.get('body', '').lower()
        
        # Common social engineering tactics
        se_indicators = {
            'urgency': ['urgent', 'immediate', 'expires', 'deadline', 'asap'],
            'authority': ['bank', 'security', 'admin', 'manager', 'government'],
            'fear': ['suspended', 'locked', 'blocked', 'terminated', 'fraud'],
            'reward': ['winner', 'prize', 'reward', 'bonus', 'gift'],
            'curiosity': ['confidential', 'secret', 'exclusive', 'private']
        }
        
        detected_tactics = []
        score = 0
        
        for tactic, keywords in se_indicators.items():
            for keyword in keywords:
                if keyword in subject or keyword in body:
                    detected_tactics.append(tactic)
                    score += 15
                    break
        
        return {
            'score': min(score, 100),
            'tactics': detected_tactics,
            'analysis': f"Rule-based analysis detected {len(detected_tactics)} social engineering tactics"
        }
    
    def analyze_email_tone(self, email_data: Dict) -> str:
        """Analyze the tone of an email (simplified)"""
        body = email_data.get('body', '').lower()
        
        if any(word in body for word in ['urgent', 'immediate', 'deadline']):
            return 'urgent'
        elif any(word in body for word in ['please', 'kindly', 'thank you']):
            return 'polite'
        elif any(word in body for word in ['must', 'required', 'mandatory']):
            return 'demanding'
        else:
            return 'neutral'
    
    def analyze_historical_tone(self, conversation_history: List[Dict]) -> str:
        """Analyze historical tone from conversation history"""
        if not conversation_history:
            return 'unknown'
        
        # Simplified - analyze most recent emails
        recent_emails = conversation_history[-3:] if len(conversation_history) >= 3 else conversation_history
        
        tone_counts = {'urgent': 0, 'polite': 0, 'demanding': 0, 'neutral': 0}
        
        for email in recent_emails:
            tone = self.analyze_email_tone(email)
            tone_counts[tone] += 1
        
        # Return most common tone
        return max(tone_counts, key=tone_counts.get)
    
    def start_conversation_monitoring(self, email_data: Dict, user_id: str):
        """Start monitoring conversation for suspicious activity"""
        try:
            conversation_id = f"{user_id}_{email_data.get('sender', '')}"
            
            self.active_conversations[conversation_id] = {
                'user_id': user_id,
                'sender': email_data.get('sender'),
                'start_time': datetime.utcnow(),
                'status': 'monitoring',
                'timeout': datetime.utcnow() + timedelta(hours=10)  # 10-hour timeout
            }
            
            logger.info(f"Started conversation monitoring for {conversation_id}")
            
        except Exception as e:
            logger.error(f"Failed to start conversation monitoring: {e}")
    
    def store_analysis_results(self, email_data: Dict, user_id: str, analysis_result: Dict):
        """Store analysis results for learning and improvement"""
        try:
            # Store in RAG database for future reference
            suspect_info = {
                'sender': email_data.get('sender'),
                'tactics_used': analysis_result.get('tactics_identified', []),
                'threat_level': analysis_result.get('threat_level'),
                'social_engineering_score': analysis_result.get('social_engineering_score'),
                'analysis_timestamp': datetime.utcnow().isoformat()
            }
            
            self.post_suspect_info(suspect_info, email_data)
            
        except Exception as e:
            logger.error(f"Failed to store analysis results: {e}")
    
    def post_suspect_info(self, suspect_info: Dict, email_metadata: Dict):
        """Post suspect information to RAG database"""
        try:
            return self.rag_db.store_suspect_info(suspect_info, email_metadata)
        except Exception as e:
            logger.error(f"Failed to post suspect info: {e}")
            return {'status': 'error', 'message': str(e)}