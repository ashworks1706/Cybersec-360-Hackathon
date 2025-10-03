#!/usr/bin/env python3
"""Debug email processor transformation"""

import sys
import os
sys.path.append('/home/ash/projects/Cybersec-360-hackathon/flask-backend')

from utils.email_processor import EmailProcessor
from layers.layer1_database import Layer1DatabaseChecker

def debug_email_processing():
    print("🔍 Email Processing Debug")
    print("=" * 50)
    
    # Initialize components
    processor = EmailProcessor()
    layer1 = Layer1DatabaseChecker()
    
    # GitHub email data (as sent by API)
    raw_email_data = {
        'from': 'notifications@github.com',  # Note: using 'from' like the API
        'subject': 'Your pull request has been merged',
        'body': """Hi there,

Your pull request #123 has been successfully merged into the main branch.

Thanks for your contribution!

Best regards,
GitHub Team"""
    }
    
    print("📧 RAW EMAIL DATA (as sent to API):")
    print(f"From: {raw_email_data['from']}")
    print(f"Subject: {raw_email_data['subject']}")
    print(f"Body: {raw_email_data['body']}")
    print()
    
    # Process email
    print("🔄 PROCESSING EMAIL...")
    processed_email = processor.process(raw_email_data)
    
    print("📧 PROCESSED EMAIL DATA:")
    print(f"Sender: {processed_email.get('sender')}")
    print(f"Subject: {processed_email.get('subject')}")
    print(f"Body: {processed_email.get('body')}")
    print(f"URLs: {processed_email.get('urls', [])}")
    print()
    
    # Test Layer 1 with processed data
    print("🔍 LAYER 1 CHECK (with processed data):")
    layer1_result = layer1.check_email(processed_email)
    print(f"   Status: {layer1_result['status']}")
    print(f"   Confidence: {layer1_result['confidence']}")
    print(f"   Threat Indicators: {layer1_result['threat_indicators']}")
    print()
    
    print("🎯 ANALYSIS:")
    if layer1_result['status'] == 'threat':
        print("❌ PROCESSED email flagged as THREAT")
        print(f"   This explains the API behavior!")
        print(f"   Problem indicators: {layer1_result['threat_indicators']}")
    else:
        print("✅ PROCESSED email marked as CLEAN")
        print("   The issue must be elsewhere")

if __name__ == "__main__":
    debug_email_processing()