# 🔧 PhishGuard 360 - Debugging & Testing Guide

## 🚨 **Current Issue Resolution**

### **Problem Identified:**
1. ❌ `PhishGuardScanner has already been declared` - Multiple script injections
2. ❌ `Could not establish connection. Receiving end does not exist` - Message listener issues

### **Fixes Applied:**
1. ✅ **Singleton Pattern** - Prevents multiple class declarations
2. ✅ **Better Message Handling** - Improved listener setup with error handling
3. ✅ **Ping-Pong Communication** - Tests connection before scanning
4. ✅ **Timeout Protection** - Prevents hanging requests
5. ✅ **Auto-Injection** - Handles missing content scripts

## 🧪 **Step-by-Step Testing**

### **1. Reload Extension**
```bash
# In Chrome:
# 1. Go to chrome://extensions/
# 2. Find "PhishGuard 360"
# 3. Click reload button 🔄
# 4. Refresh Gmail tab
```

### **2. Test Extension Loading**
```javascript
// Open browser console (F12) on Gmail page
// Check for initialization message:
console.log('Looking for PhishGuard initialization...');

// Should see:
// "🛡️ PhishGuard 360 initialized on Gmail"
// "PhishGuard: Message listener setup complete"
```

### **3. Test Popup Communication**
```javascript
// In browser console on Gmail page with email open:
window.phishGuardScanner.isViewingSpecificEmail()
// Should return: true (if viewing email) or false (if in inbox)

window.phishGuardScanner.extractCurrentEmailData()
// Should return: email object with subject, sender, body
```

### **4. Test Manual Scanning**
```javascript
// In browser console:
window.phishGuardScanner.startEmailScan()
// Should start scan process and show sidebar
```

## 🔍 **Debugging Commands**

### **Check Extension Status**
```javascript
// Check if PhishGuard is loaded
console.log('PhishGuard loaded:', !!window.phishGuardInitialized);
console.log('PhishGuard instance:', window.phishGuardScanner);
```

### **Test Message System**
```javascript
// Test ping-pong communication
chrome.runtime.sendMessage({type: 'PING'}, response => {
    console.log('Ping response:', response);
});
```

### **Check Email Detection**
```javascript
// Check current email status
const scanner = window.phishGuardScanner;
if (scanner) {
    console.log('Viewing email:', scanner.isViewingSpecificEmail());
    console.log('Current URL:', window.location.href);
    console.log('Email data:', scanner.extractCurrentEmailData());
}
```

## 🛠️ **Quick Fixes**

### **If Extension Not Loading:**
1. Check Chrome console for errors
2. Verify manifest.json permissions
3. Reload extension completely
4. Clear browser cache

### **If Button Not Appearing:**
1. Make sure you're viewing individual email (not inbox)
2. Check console for injection errors
3. Manually trigger: `window.phishGuardScanner.checkAndInjectScanButton()`

### **If Popup Fails:**
1. Check popup console (right-click extension → Inspect popup)
2. Verify content script is loaded
3. Test manual ping: `chrome.tabs.sendMessage(tabId, {type: 'PING'})`

## 🎯 **Expected Behavior**

### **✅ Working State:**
- Extension popup opens without errors
- "Scan Current Email" button works
- Content script responds to ping
- Scan button appears in email view only
- Backend communication successful

### **🔧 Troubleshooting Steps:**
1. **Reload extension** in chrome://extensions/
2. **Refresh Gmail** page completely
3. **Open individual email** (not inbox list)
4. **Click extension icon** to test popup
5. **Check browser console** for errors

## 🚀 **Ready to Test!**

Your updated PhishGuard 360 should now:
- ✅ Handle multiple script injections gracefully
- ✅ Establish reliable popup ↔ content script communication
- ✅ Show scan button only in email views
- ✅ Provide clear error messages
- ✅ Auto-recover from connection issues

### **Next Steps:**
1. Reload the extension
2. Refresh Gmail 
3. Open an individual email
4. Test the popup "Scan Current Email" button
5. Verify the scan button appears in email toolbar

The communication issues should now be resolved! 🎉