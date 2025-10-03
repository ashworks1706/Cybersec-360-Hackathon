# 🧪 PhishGuard 360 - Testing Instructions

## 🚀 Updated Chrome Extension Features

### ✅ **Latest Update: Email-Specific Scan Button**
The Chrome extension now properly displays the "Scan Email" button **only when viewing individual emails**, not in the inbox or compose windows.

## 📋 **Step-by-Step Testing Guide**

### **1. Start Backend Server**
```bash
cd flask-backend
python app.py
```
✅ **Expected:** Server starts on `http://localhost:5000` with all layers initialized

### **2. Load Chrome Extension**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. ✅ **Expected:** PhishGuard 360 extension appears in extension list

### **3. Test Email-Specific Button Placement**

#### **Test Case 1: Inbox View (No Button)**
1. Go to Gmail: `https://mail.google.com`
2. Stay in inbox list view
3. ✅ **Expected:** NO "Scan Email" button visible

#### **Test Case 2: Compose Window (No Button)**
1. Click "Compose" in Gmail
2. ✅ **Expected:** NO "Scan Email" button in compose window

#### **Test Case 3: Individual Email View (Button Present)**
1. Click on any email in your inbox to open it
2. ✅ **Expected:** "Scan Email" button appears in email toolbar
3. ✅ **Expected:** Button has blue gradient background with shield icon

#### **Test Case 4: Navigate Between Views**
1. Open an email → **Button should appear**
2. Go back to inbox → **Button should disappear**
3. Open different email → **Button should appear again**
4. ✅ **Expected:** Button dynamically shows/hides based on context

### **4. Test Email Scanning Functionality**

#### **Scan Benign Email**
1. Open a normal email (like a newsletter or personal email)
2. Click "Scan Email" button
3. ✅ **Expected:** 
   - Button changes to "Scanning..." with pink gradient
   - Sidebar opens with scan results
   - Verdict: "SAFE" with green indicator
   - Processing time < 3 seconds

#### **Scan Suspicious Email**
1. Open a promotional/marketing email (higher phishing risk)
2. Click "Scan Email" button  
3. ✅ **Expected:**
   - Multi-layer analysis results
   - Confidence score displayed
   - Detailed threat assessment

### **5. Test Keyboard Shortcut**
1. Open any email
2. Press `Ctrl+Shift+S`
3. ✅ **Expected:** Email scan starts automatically

### **6. Test Error Handling**
1. Stop backend server
2. Try to scan an email
3. ✅ **Expected:** Error notification appears

## 🛡️ **Button Behavior Specifications**

### **When Button Appears:**
- ✅ Individual email view (thread open)
- ✅ Email conversation view
- ✅ Any email with visible content

### **When Button Hidden:**
- ❌ Inbox list view
- ❌ Compose window
- ❌ Settings pages
- ❌ Search results (without email open)
- ❌ Label management pages

### **Visual Indicators:**
- **Normal State:** Blue gradient with shield icon
- **Scanning State:** Pink gradient with "Scanning..." text
- **Hover State:** Slightly darker blue with shadow lift

## 🔧 **Troubleshooting**

### **Button Not Appearing in Email View**
1. Check console for errors (F12 → Console)
2. Verify you're viewing a single email (not inbox list)
3. Try refreshing the Gmail page
4. Check if extension is enabled

### **Scan Not Working**
1. Verify backend server is running on port 5000
2. Check browser console for CORS errors
3. Ensure Gmail is not in offline mode

### **Performance Issues**
1. Clear browser cache
2. Restart Chrome
3. Reload extension

## 📊 **Expected Performance Metrics**

- **Button Injection:** < 500ms after email load
- **Email Scan:** < 3 seconds total processing
- **Layer 1 (Database):** < 100ms
- **Layer 2 (AI Model):** < 2 seconds  
- **Layer 3 (LLM):** < 1 second
- **UI Response:** Real-time updates

## 🎯 **Demo Preparation Checklist**

- [ ] Backend server running smoothly
- [ ] Extension loaded and working
- [ ] Test emails identified (safe + suspicious)
- [ ] Button placement verified
- [ ] Scan results sidebar working
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] Ready for live demonstration!

## 🏆 **Success Criteria**

✅ **Button appears ONLY in individual email views**  
✅ **Button hidden in inbox/compose/other views**  
✅ **Smooth navigation between different Gmail sections**  
✅ **Real-time email scanning with accurate results**  
✅ **Professional UI that integrates seamlessly with Gmail**  

---

**Your PhishGuard 360 system is now ready for hackathon demonstration!** 🚀