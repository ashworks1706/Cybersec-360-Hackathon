# PhishGuard 360 - Docker Deployment Guide

## 🐳 Quick Start

### Production Deployment
```bash
# 1. Clone the repository
git clone https://github.com/ashworks1706/Cybersec-360-hackathon.git
cd Cybersec-360-hackathon

# 2. Set up environment variables
cp .env.template .env
nano .env  # Add your API keys

# 3. Deploy
./deploy.sh
```

### Development Setup
```bash
# Quick development environment
./dev-setup.sh
```

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM
- 10GB free disk space

## 🔑 Required API Keys

Before deployment, you need:

1. **Google Gemini API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Get your API key for Layer 3 Detective

2. **Hugging Face API Key**
   - Visit: https://huggingface.co/settings/tokens
   - Create a token for DistilBERT model access

## 🏗️ Architecture

### Production Stack
- **phishguard-backend**: Flask API server
- **nginx**: Reverse proxy with SSL termination
- **redis**: Caching layer
- **prometheus**: Monitoring and metrics

### Development Stack
- **phishguard-backend-dev**: Flask with hot reload
- **redis-dev**: Development cache
- **adminer**: Database management UI

## 📁 Volume Structure

```
phishguard_data/        # SQLite database files
phishguard_logs/        # Application logs
phishguard_models/      # AI model cache
phishguard_uploads/     # File uploads
phishguard_redis/       # Redis persistence
```

## 🔧 Configuration Files

### Environment Variables (.env)
```bash
# Required
GEMINI_API_KEY=your-key-here
HUGGINGFACE_API_KEY=your-key-here
SECRET_KEY=your-secret-key

# Optional
FLASK_ENV=production
LOG_LEVEL=INFO
API_RATE_LIMIT=100
```

### Docker Compose Files
- `docker-compose.yml`: Production configuration
- `docker-compose.dev.yml`: Development configuration

## 🚀 Deployment Commands

### Production
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update deployment
docker-compose pull
docker-compose up -d --force-recreate
```

### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f

# Access backend shell
docker-compose -f docker-compose.dev.yml exec phishguard-backend-dev bash
```

## 🔍 Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Detailed health status
docker inspect <container-name> | jq '.[0].State.Health'
```

## 📊 Monitoring

### Service URLs
- **Main App**: https://localhost
- **API**: https://localhost/api
- **Prometheus**: http://localhost:9090
- **Adminer** (dev): http://localhost:8080

### Metrics Endpoints
- Backend metrics: `/api/metrics`
- Health check: `/api/health`

## 🛡️ Security Features

### SSL/TLS
- Automatic HTTP to HTTPS redirect
- Modern TLS configuration
- HSTS headers

### Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Referrer-Policy: strict-origin-when-cross-origin

### Rate Limiting
- API routes: 10 requests/second
- General routes: 1 request/second
- Burst protection included

## 🔧 Troubleshooting

### Common Issues

1. **Services won't start**
   ```bash
   # Check logs
   docker-compose logs <service-name>
   
   # Rebuild containers
   docker-compose build --no-cache
   ```

2. **API key errors**
   ```bash
   # Verify environment variables
   docker-compose exec phishguard-backend env | grep API_KEY
   ```

3. **Permission issues**
   ```bash
   # Fix volume permissions
   sudo chown -R 1000:1000 volumes/
   ```

4. **SSL certificate issues**
   ```bash
   # Regenerate self-signed cert
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem
   ```

### Performance Tuning

1. **Memory limits**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G  # Adjust based on available RAM
   ```

2. **CPU limits**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1.0'  # Adjust based on available CPUs
   ```

## 🔄 Backup and Restore

### Backup Data
```bash
# Backup database
docker-compose exec phishguard-backend sqlite3 /app/database/data/phishguard.db ".backup /app/backup.db"
docker cp phishguard-backend:/app/backup.db ./backup.db

# Backup volumes
docker run --rm -v phishguard_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data
```

### Restore Data
```bash
# Restore database
docker cp ./backup.db phishguard-backend:/app/restore.db
docker-compose exec phishguard-backend sqlite3 /app/database/data/phishguard.db ".restore /app/restore.db"
```

## 📝 Development Notes

### Hot Reload
Development mode includes volume mounting for hot reload:
```yaml
volumes:
  - ./flask-backend:/app:cached
```

### Debug Mode
Development environment runs with:
- `FLASK_DEBUG=1`
- `LOG_LEVEL=DEBUG`
- Increased rate limits

### Chrome Extension
The Chrome extension needs to be loaded manually in development:
1. Open Chrome Extensions (chrome://extensions/)
2. Enable Developer mode
3. Load unpacked: `chrome-extension/` directory

## 🎯 Production Checklist

- [ ] Update SSL certificates (replace self-signed)
- [ ] Set strong SECRET_KEY
- [ ] Configure proper CORS_ORIGINS
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts
- [ ] Review security headers
- [ ] Test rate limiting
- [ ] Verify health checks
- [ ] Test SSL configuration