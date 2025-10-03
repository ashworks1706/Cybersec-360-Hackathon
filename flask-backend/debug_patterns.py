#!/usr/bin/env python3
"""Debug which specific pattern is matching the GitHub email"""

import re

def debug_patterns():
    # GitHub email content
    subject = "Your pull request has been merged"
    body = """Hi there,

Your pull request #123 has been successfully merged into the main branch.

Thanks for your contribution!

Best regards,
GitHub Team"""
    
    full_content = f"{subject} {body}".lower()
    
    print("🔍 Debugging Pattern Matches for GitHub Email")
    print("=" * 60)
    print(f"Subject: {subject}")
    print(f"Body: {body}")
    print("=" * 60)
    
    # Define the patterns from our enhanced system
    patterns = {
        'subject_patterns': [
            r'urgent.*verify.*account',
            r'click.*here.*immediately', 
            r'suspended.*account',
            r'confirm.*identity.*now',
            r'limited.*time.*offer',
            r'ssn.*number.*needed',
            r'social.*security.*number',
            r'verify.*ssn',
            r'last.*four.*digits',
            r'personal.*information.*missing',
            r'crucial.*details.*missing',
            r'checkup.*scheduled',
            r'appointment.*reminder'
        ],
        'body_patterns': [
            r'click.*link.*verify',
            r'account.*suspended.*verify',
            r'urgent.*action.*required',
            r'confirm.*payment.*information',
            r'ssn.*number',
            r'social.*security.*number',
            r'last.*four.*digits.*ssn',
            r'share.*it.*urgently',
            r'asap.*urgent',
            r'personal.*information.*missing',
            r'crucial.*details.*about.*your',
            r'we.*found.*that.*we.*are.*missing',
            r'public.*health.*services',
            r'checkup.*scheduled.*on.*monday',
            r'need.*last.*four.*digits',
            r'please.*share.*it.*urgently'
        ],
        'financial_requests': [
            'ssn', 'social security', 'bank account', 'credit card',
            'routing number', 'account number', 'pin number'
        ],
        'urgency_indicators': [
            'urgent', 'immediately', 'asap', 'right away', 'at earliest',
            'time sensitive', 'expires soon', 'act now'
        ],
        'suspicious_phrases': [
            'share it urgently asap',
            'last four digits of your ssn',
            'missing crucial details',
            'personal information',
            'public health services',
            'urgently asap',
            'share it urgently'
        ]
    }
    
    matches_found = []
    
    # Check subject patterns
    print("\n📧 SUBJECT PATTERN CHECKS:")
    for pattern in patterns['subject_patterns']:
        if re.search(pattern, subject.lower(), re.IGNORECASE):
            matches_found.append(f"Subject pattern: {pattern}")
            print(f"   ✅ MATCH: {pattern}")
        else:
            print(f"   ❌ No match: {pattern}")
    
    # Check body patterns
    print("\n📄 BODY PATTERN CHECKS:")
    for pattern in patterns['body_patterns']:
        if re.search(pattern, body.lower(), re.IGNORECASE):
            matches_found.append(f"Body pattern: {pattern}")
            print(f"   ✅ MATCH: {pattern}")
        else:
            print(f"   ❌ No match: {pattern}")
    
    # Check financial requests
    print("\n💰 FINANCIAL REQUEST CHECKS:")
    for term in patterns['financial_requests']:
        if term.lower() in full_content:
            matches_found.append(f"Financial term: {term}")
            print(f"   ✅ MATCH: {term}")
        else:
            print(f"   ❌ No match: {term}")
    
    # Check urgency indicators
    print("\n⚡ URGENCY INDICATOR CHECKS:")
    urgency_matches = []
    for term in patterns['urgency_indicators']:
        if term.lower() in full_content:
            urgency_matches.append(term)
            print(f"   ✅ MATCH: {term}")
        else:
            print(f"   ❌ No match: {term}")
    
    if len(urgency_matches) >= 2:
        matches_found.append(f"Multiple urgency indicators: {urgency_matches}")
    
    # Check suspicious phrases
    print("\n🚨 SUSPICIOUS PHRASE CHECKS:")
    for phrase in patterns['suspicious_phrases']:
        if phrase.lower() in full_content:
            matches_found.append(f"Suspicious phrase: {phrase}")
            print(f"   ✅ MATCH: {phrase}")
        else:
            print(f"   ❌ No match: {phrase}")
    
    # Summary
    print("\n" + "=" * 60)
    print("🎯 SUMMARY:")
    if matches_found:
        print(f"❌ {len(matches_found)} PATTERN(S) MATCHED:")
        for match in matches_found:
            print(f"   • {match}")
        print("\n⚠️  This explains why the GitHub email is flagged as phishing!")
    else:
        print("✅ NO PATTERNS MATCHED - GitHub email should be safe")
    print("=" * 60)

if __name__ == "__main__":
    debug_patterns()