#!/bin/bash
# PhishGuard 360 - Development Environment Setup

set -e

echo "🛡️ PhishGuard 360 - Development Setup"
echo "====================================="

# Check if .env file exists, create from template if not
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo "⚠️  Please edit .env file and add your API keys before continuing!"
    echo "   Required: GEMINI_API_KEY, HUGGINGFACE_API_KEY"
    echo "   Run: nano .env"
    read -p "Press Enter after updating .env file..."
fi

# Start development environment
echo "🚀 Starting development environment..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 20

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "✅ Development environment started successfully!"
    echo ""
    echo "📊 Development URLs:"
    echo "   • Backend API: http://localhost:5000"
    echo "   • Database Admin: http://localhost:8080 (Adminer)"
    echo "   • Redis: http://localhost:6379"
    echo ""
    echo "🔧 Development commands:"
    echo "   • View logs: docker-compose -f docker-compose.dev.yml logs -f"
    echo "   • Stop: docker-compose -f docker-compose.dev.yml down"
    echo "   • Restart: docker-compose -f docker-compose.dev.yml restart"
    echo "   • Shell access: docker-compose -f docker-compose.dev.yml exec phishguard-backend-dev bash"
    echo ""
    echo "📝 The backend code is mounted as a volume for hot reloading!"
else
    echo "❌ Failed to start development environment"
    docker-compose -f docker-compose.dev.yml logs
fi