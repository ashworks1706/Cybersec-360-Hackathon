#!/usr/bin/env python3
"""
Test script for enhanced phishing detection
Tests the fix for false negatives where obvious phishing emails were classified as safe
"""

import requests
import json

def test_enhanced_detection():
    """Test enhanced phishing detection with known problematic emails"""
    
    # Base URL for our Flask backend
    base_url = "http://localhost:5000"
    
    # Test cases - emails that should definitely be flagged as phishing
    test_emails = [
        {
            "name": "SSN Request Phishing",
            "email": {
                "from": "benefits@healthservice-verification.com",
                "subject": "URGENT: SSN Required for Health Benefits Verification",
                "body": """Dear Recipient,

Your health benefits require immediate verification to avoid suspension. 

We need your Social Security Number (SSN) and income verification within 24 hours to maintain your coverage.

Please click here to verify your identity: http://healthservice-verification.com/verify

Failure to respond will result in benefit termination.

Health Services Administration
(Not affiliated with official government agencies)"""
            }
        },
        {
            "name": "IRS Impersonation",
            "email": {
                "from": "agent@irs-compliance.net",
                "subject": "IRS Tax Verification Required - Account Suspended",
                "body": """NOTICE: Your tax account has been suspended due to compliance issues.

You must verify your Tax ID and bank account number immediately to avoid legal action.

Click here to access your IRS account: http://irs-compliance.net/login

You have 24 hours to comply or face penalties.

Internal Revenue Service
Tax Compliance Division"""
            }
        },
        {
            "name": "Medicare Scam",
            "email": {
                "from": "medicare-admin@benefits-check.org",
                "subject": "Medicare Benefits Verification - Action Required",
                "body": """Your Medicare benefits require urgent verification.

Please confirm your Medicare ID, SSN, and current income to prevent benefit suspension.

Verify here: http://benefits-check.org/medicare

Medicare Administration Office"""
            }
        },
        {
            "name": "Legitimate Email (Control)",
            "email": {
                "from": "notifications@github.com",
                "subject": "Your pull request has been merged",
                "body": """Hi there,

Your pull request #123 has been successfully merged into the main branch.

Thanks for your contribution!

Best regards,
GitHub Team"""
            }
        }
    ]
    
    print("🔍 Testing Enhanced Phishing Detection System")
    print("=" * 60)
    
    for i, test_case in enumerate(test_emails, 1):
        print(f"\n📧 Test {i}: {test_case['name']}")
        print("-" * 40)
        
        try:
            # Make request to scan endpoint
            payload = {
                "email_data": test_case['email'],
                "user_id": "test_user",
                "scan_type": "full"
            }
            
            response = requests.post(
                f"{base_url}/api/scan",
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Extract key information from the actual response structure
                overall_status = result.get('final_verdict', 'unknown')
                final_score = result.get('confidence_score', 0)
                threat_level = result.get('threat_level', 'unknown')
                
                # Layer results - the actual structure uses 'layers' key
                layers = result.get('layers', {})
                layer1 = layers.get('layer1', {})
                layer2 = layers.get('layer2', {})
                layer3 = layers.get('layer3', {})
                
                print(f"Overall Status: {overall_status}")
                print(f"Threat Level: {threat_level}")
                print(f"Confidence Score: {final_score:.3f}")
                
                print(f"\n🔍 Layer 1 (Database): {layer1.get('status', 'N/A')} (conf: {layer1.get('confidence', 0):.3f})")
                
                print(f"🤖 Layer 2 (AI Model): {layer2.get('status', 'N/A')} (conf: {layer2.get('confidence', 0):.3f})")
                if layer2.get('manual_override'):
                    print(f"   ⚠️  Manual Override Applied!")
                if layer2.get('risk_indicators'):
                    print(f"   Risk Indicators: {', '.join(layer2['risk_indicators'][:3])}")
                
                if layer3:
                    print(f"🕵️  Layer 3 (Detective): {layer3.get('status', 'N/A')} (conf: {layer3.get('confidence', 0):.3f})")
                
                # Determine if detection was successful
                expected_phishing = test_case['name'] != "Legitimate Email (Control)"
                detection_success = (overall_status in ['threat']) == expected_phishing
                
                status_emoji = "✅" if detection_success else "❌"
                print(f"\n{status_emoji} Detection Result: {'PASS' if detection_success else 'FAIL'}")
                
                if not detection_success:
                    if expected_phishing:
                        print("   ⚠️  FALSE NEGATIVE: Phishing email not detected!")
                    else:
                        print("   ⚠️  FALSE POSITIVE: Legitimate email flagged as phishing!")
                
            else:
                print(f"❌ Request failed: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ Connection failed - is the Flask server running?")
            print("   Start server with: python app.py")
            break
        except Exception as e:
            print(f"❌ Test failed: {e}")
    
    print(f"\n{'=' * 60}")
    print("🏁 Test Complete")
    print("\nTo start the server if not running:")
    print("   cd /home/ash/projects/Cybersec-360-hackathon/flask-backend")
    print("   python app.py")

if __name__ == "__main__":
    test_enhanced_detection()