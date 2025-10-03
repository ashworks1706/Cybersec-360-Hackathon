#!/usr/bin/env python3
"""Quick test for a single SSN phishing email"""

import requests
import json

def quick_test():
    base_url = "http://localhost:5000"
    
    # SSN Request Phishing Email
    test_email = {
        "from": "benefits@healthservice-verification.com",
        "subject": "URGENT: SSN Required for Health Benefits Verification", 
        "body": "Your health benefits require immediate verification to avoid suspension. We need your Social Security Number (SSN) and income verification within 24 hours to maintain your coverage."
    }
    
    payload = {
        "email_data": test_email,
        "user_id": "test_user",
        "scan_type": "full"
    }
    
    print("🔍 Testing SSN Phishing Email")
    print("=" * 40)
    
    try:
        response = requests.post(
            f"{base_url}/api/scan",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("Full Response:")
            print(json.dumps(result, indent=2))
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    quick_test()