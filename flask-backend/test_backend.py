# PhishGuard 360 - Test Script
# Basic functionality testing for the backend

import requests
import json
import time
from datetime import datetime

class PhishGuardTester:
    def __init__(self, base_url='http://localhost:5000'):
        self.base_url = base_url
        self.session = requests.Session()
        
    def test_health_check(self):
        """Test health check endpoint"""
        print("🔍 Testing health check...")
        try:
            response = self.session.get(f"{self.base_url}/api/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data['status']}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_email_scan(self):
        """Test email scanning functionality"""
        print("🔍 Testing email scan...")
        
        # Test email data
        test_email = {
            "email_data": {
                "sender": "urgent-security@bank-alert.com",
                "subject": "URGENT: Verify your account immediately",
                "body": "Your account will be suspended unless you verify your identity immediately. Click here to verify: http://suspicious-bank.com/verify",
                "date": datetime.utcnow().isoformat(),
                "url": "https://mail.google.com/test"
            },
            "user_id": "test_user_123",
            "scan_type": "full"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/scan",
                json=test_email,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Email scan completed")
                print(f"   Verdict: {data.get('final_verdict', 'unknown')}")
                print(f"   Confidence: {data.get('confidence_score', 0):.2f}")
                print(f"   Processing time: {data.get('processing_time', 0):.2f}s")
                
                # Print layer results
                layers = data.get('layers', {})
                for layer_name, layer_data in layers.items():
                    print(f"   {layer_name}: {layer_data.get('status', 'unknown')}")
                
                return True
            else:
                print(f"❌ Email scan failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Email scan error: {e}")
            return False
    
    def test_benign_email(self):
        """Test with a benign email"""
        print("🔍 Testing benign email...")
        
        benign_email = {
            "email_data": {
                "sender": "newsletter@university.edu",
                "subject": "Weekly Newsletter - Research Updates",
                "body": "Dear students, here are this week's research updates and upcoming events. Best regards, University Admin",
                "date": datetime.utcnow().isoformat(),
                "url": "https://mail.google.com/test"
            },
            "user_id": "test_user_123",
            "scan_type": "full"
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/scan",
                json=benign_email,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Benign email scan completed")
                print(f"   Verdict: {data.get('final_verdict', 'unknown')}")
                return True
            else:
                print(f"❌ Benign email scan failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Benign email scan error: {e}")
            return False
    
    def test_user_experience(self):
        """Test user experience endpoint"""
        print("🔍 Testing user experience...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/user/test_user_123/experience")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ User experience retrieved")
                print(f"   User ID: {data.get('user_id', 'unknown')}")
                return True
            else:
                print(f"❌ User experience failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ User experience error: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("🛡️  PhishGuard 360 Backend Testing")
        print("=" * 40)
        
        tests = [
            self.test_health_check,
            self.test_benign_email,
            self.test_email_scan,
            self.test_user_experience
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
                print()  # Add spacing between tests
                time.sleep(1)  # Small delay between tests
            except Exception as e:
                print(f"❌ Test failed with exception: {e}")
                print()
        
        print("=" * 40)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed - check the output above")
        
        return passed == total

def main():
    """Main test function"""
    import sys
    
    # Check if server is specified
    server_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5000'
    
    print(f"Testing PhishGuard backend at: {server_url}")
    print()
    
    tester = PhishGuardTester(server_url)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()