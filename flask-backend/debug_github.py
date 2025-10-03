#!/usr/bin/env python3
"""Debug why GitHub email is being flagged"""

import requests
import json

def debug_github_email():
    base_url = "http://localhost:5000"
    
    # Legitimate GitHub Email
    test_email = {
        "from": "notifications@github.com",
        "subject": "Your pull request has been merged",
        "body": "Hi there,\n\nYour pull request #123 has been successfully merged into the main branch.\n\nThanks for your contribution!\n\nBest regards,\nGitHub Team"
    }
    
    payload = {
        "email_data": test_email,
        "user_id": "debug_user",
        "scan_type": "full"
    }
    
    print("🔍 Debugging GitHub Email False Positive")
    print("=" * 50)
    print(f"From: {test_email['from']}")
    print(f"Subject: {test_email['subject']}")
    print(f"Body: {test_email['body']}")
    print("=" * 50)
    
    try:
        response = requests.post(
            f"{base_url}/api/scan",
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print("🔍 DETECTION RESULTS:")
            print(f"Final Verdict: {result.get('final_verdict')}")
            print(f"Threat Level: {result.get('threat_level')}")
            print(f"Confidence: {result.get('confidence_score')}")
            
            layer1 = result.get('layers', {}).get('layer1', {})
            if layer1:
                print(f"\n📊 Layer 1 Results:")
                print(f"Status: {layer1.get('status')}")
                print(f"Confidence: {layer1.get('confidence')}")
                print(f"Source: {layer1.get('source')}")
                print(f"Cached: {layer1.get('cached')}")
                
                # The key question: what pattern triggered this?
                print(f"\n⚠️  This legitimate email was flagged as a threat!")
                print(f"We need to identify which pattern caused this false positive.")
                
        else:
            print(f"Request failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Debug failed: {e}")

if __name__ == "__main__":
    debug_github_email()