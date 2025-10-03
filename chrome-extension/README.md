# Chrome Extension Setup Guide

## 🚀 Installation

### 1. Enable Developer Mode
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### 2. Verify Installation
- You should see "PhishGuard 360" in your extensions
- The extension icon should appear in the toolbar

## 📱 Usage

### Gmail Integration
1. Open Gmail in Chrome
2. Open any email
3. Look for the "Scan Email" button in the toolbar
4. Click to start security analysis

### Scan Results
- **Green**: Email is safe
- **Yellow**: Potential threat, exercise caution  
- **Red**: Confirmed threat, do not interact

### Sidebar Features
- **Layer 1 Results**: Public database checks
- **Layer 2 Results**: AI model classification
- **Layer 3 Results**: Advanced threat analysis
- **Action Buttons**: Mark safe, report phishing, block sender

## ⌨️ Keyboard Shortcuts
- `Ctrl+Shift+S`: Scan current email

## 🔧 Settings
Access settings through the extension popup:
- **Auto-scan**: Automatically scan incoming emails
- **Notifications**: Enable/disable scan notifications
- **Security Level**: Adjust sensitivity

## 🔒 Privacy & Security
- Email content is processed locally and on your backend
- No data is sent to third parties without consent
- User context is stored securely for better protection

## 🐛 Troubleshooting

### Extension Not Working
1. Refresh Gmail page
2. Check if backend is running (`http://localhost:5000`)
3. Check browser console for errors
4. Verify extension permissions

### Scan Button Not Appearing
1. Make sure you're on Gmail
2. Reload the extension
3. Check if content script loaded properly

### Backend Connection Issues
1. Verify backend is running on port 5000
2. Check CORS settings in backend
3. Look for network errors in browser console

## 🛠️ Development

### File Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── scripts/
│   ├── background.js      # Background service worker
│   └── content.js         # Gmail integration
├── sidebar/
│   ├── sidebar.html       # Scan results interface
│   ├── sidebar.css        # Styling
│   └── sidebar.js         # Sidebar logic
├── popup/
│   ├── popup.html         # Extension popup
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup functionality
└── assets/                # Icons and images
```

### Key Components
- **Content Script**: Injects scan button into Gmail
- **Background Script**: Handles extension lifecycle
- **Sidebar**: Displays scan results and analysis
- **Popup**: Extension settings and statistics

### Message Passing
The extension uses Chrome's message passing API for communication between components:
- Content script ↔ Background script
- Content script ↔ Sidebar
- Popup ↔ Background script

## 🎯 Features

### Real-time Scanning
- Scans emails as you read them
- Multi-layer security analysis
- Instant threat detection

### User Context
- Learns from your email patterns
- Personalizes threat detection
- Tracks conversation history

### Threat Intelligence
- Updates threat database
- Shares anonymous threat data
- Continuous improvement

## 📊 Analytics
The extension tracks (anonymously):
- Scan success rates
- Threat detection accuracy
- User interaction patterns
- Performance metrics