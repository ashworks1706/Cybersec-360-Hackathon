#!/bin/bash
# PhishGuard 360 - Production Deployment Script

set -e

echo "🛡️ PhishGuard 360 - Production Deployment"
echo "========================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please copy .env.template to .env and fill in your API keys:"
    echo "   cp .env.template .env"
    echo "   nano .env"
    exit 1
fi

# Check if required environment variables are set
echo "🔍 Checking environment variables..."
source .env

required_vars=("GEMINI_API_KEY" "HUGGINGFACE_API_KEY" "SECRET_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Error: Missing required environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    echo "📝 Please update your .env file with the missing values."
    exit 1
fi

echo "✅ Environment variables validated"

# Create SSL directory if it doesn't exist
if [ ! -d "nginx/ssl" ]; then
    echo "🔐 Creating SSL certificates directory..."
    mkdir -p nginx/ssl
    
    # Generate self-signed certificate for development
    # In production, replace with real SSL certificates
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    echo "⚠️  Self-signed SSL certificate created for development."
    echo "   For production, replace nginx/ssl/cert.pem and nginx/ssl/key.pem with real certificates."
fi

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose pull

# Build application
echo "🔨 Building PhishGuard 360..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting PhishGuard 360 services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
if docker-compose ps | grep -q "Up (healthy)"; then
    echo "✅ Services are healthy!"
else
    echo "⚠️  Some services may not be fully healthy yet. Checking logs..."
    docker-compose logs --tail=20
fi

# Display service information
echo ""
echo "🎉 PhishGuard 360 deployed successfully!"
echo "========================================"
echo "📊 Service URLs:"
echo "   • Main Application: https://localhost"
echo "   • API Endpoint: https://localhost/api"
echo "   • Monitoring: http://localhost:9090 (Prometheus)"
echo ""
echo "📋 Useful commands:"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop services: docker-compose down"
echo "   • Restart: docker-compose restart"
echo "   • Update: docker-compose pull && docker-compose up -d"
echo ""
echo "🔧 Troubleshooting:"
echo "   • Check service status: docker-compose ps"
echo "   • View specific service logs: docker-compose logs <service-name>"
echo "   • Access backend container: docker-compose exec phishguard-backend bash"