#!/bin/bash
# PhishGuard 360 - Simple Python Development Setup (No Docker Required)

set -e

echo "🛡️ PhishGuard 360 - Simple Development Setup"
echo "=============================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing Python dependencies (minimal set for quick start)..."
cd flask-backend
pip install -r requirements-minimal.txt

# Create development database
echo "🗄️ Setting up development database..."
python -c "
from database.rag_database import RAGDatabase
print('Initializing RAG database...')
db = RAGDatabase()
print('✅ Database initialized successfully!')
"

# Start the development server
echo "🚀 Starting PhishGuard 360 Backend..."
echo "📊 Development URLs:"
echo "   • Backend API: http://localhost:5001"
echo "   • Health Check: http://localhost:5001/api/health"
echo ""
echo "🔧 To stop the server: Press Ctrl+C"
echo "🔧 To run tests: python test_backend.py"
echo ""

# Set development environment variables
export FLASK_ENV=development
export FLASK_DEBUG=1
export GEMINI_API_KEY=mock-key-for-development
export HUGGINGFACE_API_KEY=mock-key-for-development

# Start Flask app
echo "🚀 Starting PhishGuard 360 Demo Backend..."
python demo_app.py