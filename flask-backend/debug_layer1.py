#!/usr/bin/env python3
"""Step-by-step debug of Layer 1 detection"""

import sys
import os
sys.path.append('/home/ash/projects/Cybersec-360-hackathon/flask-backend')

from layers.layer1_database import Layer1DatabaseChecker

def debug_layer1_step_by_step():
    print("🔍 Step-by-Step Layer 1 Debug")
    print("=" * 50)
    
    # Initialize Layer 1
    layer1 = Layer1DatabaseChecker()
    
    # GitHub email data
    email_data = {
        'sender': 'notifications@github.com',
        'subject': 'Your pull request has been merged',
        'body': """Hi there,

Your pull request #123 has been successfully merged into the main branch.

Thanks for your contribution!

Best regards,
GitHub Team"""
    }
    
    print("📧 Testing Email:")
    print(f"From: {email_data['sender']}")
    print(f"Subject: {email_data['subject']}")
    print(f"Body: {email_data['body']}")
    print()
    
    # Test each check individually
    print("🔍 1. PATTERN CHECK:")
    pattern_result = layer1.check_spam_patterns(email_data)
    print(f"   Is Suspicious: {pattern_result['is_suspicious']}")
    print(f"   Confidence: {pattern_result['confidence']}")
    print(f"   Indicators: {pattern_result['indicators']}")
    print()
    
    print("🔍 2. SENDER REPUTATION CHECK:")
    reputation_result = layer1.check_sender_reputation(email_data)
    print(f"   Is Suspicious: {reputation_result['is_suspicious']}")
    print(f"   Confidence: {reputation_result['confidence']}")
    print(f"   Indicators: {reputation_result['indicators']}")
    print()
    
    print("🔍 3. URL CHECK:")
    url_result = layer1.check_urls(email_data['body'])
    print(f"   URLs Found: {url_result['urls_found']}")
    print(f"   Suspicious URLs: {url_result['suspicious_urls']}")
    print(f"   Indicators: {url_result['indicators']}")
    print()
    
    print("🔍 4. FULL CHECK:")
    full_result = layer1.check_email(email_data)
    print(f"   Final Status: {full_result['status']}")
    print(f"   Final Confidence: {full_result['confidence']}")
    print(f"   Threat Indicators: {full_result['threat_indicators']}")
    print(f"   Checks Performed: {full_result['checks_performed']}")
    print()
    
    print("🎯 ANALYSIS:")
    if full_result['status'] == 'threat':
        print("❌ Email flagged as THREAT")
        print(f"   Problem indicators: {full_result['threat_indicators']}")
    else:
        print("✅ Email marked as CLEAN")

if __name__ == "__main__":
    debug_layer1_step_by_step()