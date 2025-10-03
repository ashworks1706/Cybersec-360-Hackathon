# Flask Backend Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd flask-backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run the Backend

```bash
python run.py
```

The backend will start at `http://localhost:5000`

## 📋 API Endpoints

### Health Check
- **GET** `/api/health`
- Returns service status and version

### Email Scanning
- **POST** `/api/scan`
- Scans email through all security layers
- **Body:**
```json
{
  "email_data": {
    "sender": "sender@example.com",
    "subject": "Email subject",
    "body": "Email content",
    "date": "2023-01-01T00:00:00Z"
  },
  "user_id": "user_123",
  "scan_type": "full"
}
```

### User Experience
- **GET** `/api/user/{user_id}/experience`
- Returns user context data for Layer 3

### Feedback Submission
- **POST** `/api/feedback`
- Submits user feedback for model improvement

## 🏗️ Architecture

### Layer 1: Database Checker
- Fast lookup against known spam databases
- Pattern matching for suspicious content
- Immediate threat detection

### Layer 2: AI Classification
- DistilBERT model for email classification
- Confidence-based routing to Layer 3
- Continuous learning from feedback

### Layer 3: Detective Agent
- Gemini LLM for advanced analysis
- RAG database for user context
- Social engineering detection

## 🔧 Configuration

Key configuration options in `.env`:

- `GEMINI_API_KEY`: Google Gemini API key for Layer 3
- `CONFIDENCE_THRESHOLD`: AI model confidence threshold (default: 0.5)
- `CONVERSATION_TIMEOUT_HOURS`: How long to monitor conversations (default: 10)
- `LAYER1_ENABLED`, `LAYER2_ENABLED`, `LAYER3_ENABLED`: Enable/disable layers

## 🧪 Testing

Run the test suite:

```bash
python test_backend.py
```

## 📊 Monitoring

Check logs:
```bash
tail -f logs/phishguard.log
```

## 🔒 Security

- Input validation on all endpoints
- Rate limiting to prevent abuse
- Secure handling of email content
- Content sanitization

## 🚀 Production Deployment

1. Set `FLASK_ENV=production`
2. Use a proper WSGI server (gunicorn)
3. Configure reverse proxy (nginx)
4. Set up monitoring and logging
5. Configure database backups

Example gunicorn command:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:PhishGuardBackend().app
```