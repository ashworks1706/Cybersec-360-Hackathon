#!/bin/bash

# PhishGuard 360 - Complete System Test
echo "🚀 Starting PhishGuard 360 System Test..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Navigate to project directory
cd /home/ash/projects/Cybersec-360-hackathon

# Build and start the complete system
echo "📦 Building Docker containers..."
docker compose build --no-cache

echo "🌐 Starting complete system..."
docker compose up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check Flask demo app
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ Flask Demo App: Running on http://localhost:5001"
else
    echo "❌ Flask Demo App: Not responding"
fi

# Check Nginx
if curl -s http://localhost:80 > /dev/null; then
    echo "✅ Nginx: Running on http://localhost:80"
else
    echo "❌ Nginx: Not responding"
fi

# Check Redis
if docker exec phishguard-redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not responding"
fi

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus: Running on http://localhost:9090"
else
    echo "❌ Prometheus: Not responding"
fi

echo ""
echo "🎯 System Overview:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Chrome Extension:     chrome-extension/ (Load in Chrome Developer Mode)"
echo "🌐 Flask Demo App:       http://localhost:5001"
echo "🏗️  Production App:       http://localhost:80"
echo "📊 Prometheus:           http://localhost:9090"
echo "🗃️  Redis:                Internal (docker network)"
echo "📁 Documents Management: http://localhost:5001/documents.html"
echo "🧠 Model Training:       http://localhost:5001/training.html"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "🧪 Testing Advanced Features:"
echo "1. RAG Database Management:"
echo "   curl -X POST http://localhost:5001/api/user/test_user/documents \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"name\":\"Test Document\",\"content\":\"This is a test phishing email\",\"type\":\"email\",\"tags\":[\"test\"]}'"

echo ""
echo "2. Model Training Status:"
echo "   curl http://localhost:5001/api/model/training/status"

echo ""
echo "3. Training Data Preview:"
echo "   curl http://localhost:5001/api/model/training/preview"

echo ""
echo "📋 Next Steps:"
echo "1. Load chrome-extension/ in Chrome Developer Mode"
echo "2. Visit http://localhost:5001 for the demo interface"
echo "3. Test document management at http://localhost:5001/documents.html"
echo "4. Try model training at http://localhost:5001/training.html"
echo "5. Add documents and feedback to build training data"
echo "6. Start model training when requirements are met"

echo ""
echo "🛑 To stop all services:"
echo "   docker compose down"

echo ""
echo "🔧 To view logs:"
echo "   docker compose logs -f [service_name]"

echo ""
echo "✨ PhishGuard 360 is ready! Happy testing! ✨"