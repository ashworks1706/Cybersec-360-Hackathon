# PhishGuard 360 - Flask Backend Dockerfile
# Multi-stage build for production optimization

# ============================================
# Stage 1: Base Python Environment
# ============================================
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r phishguard && useradd -r -g phishguard phishguard

# Set working directory
WORKDIR /app

# ============================================
# Stage 2: Dependencies Installation
# ============================================
FROM base as dependencies

# Copy requirements first for better caching
COPY flask-backend/requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ============================================
# Stage 3: Production Build
# ============================================
FROM dependencies as production

# Copy application code
COPY flask-backend/ .

# Create necessary directories
RUN mkdir -p logs uploads temp models database/data

# Set proper permissions
RUN chown -R phishguard:phishguard /app

# Switch to non-root user
USER phishguard

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Default command
CMD ["python", "app.py"]

# ============================================
# Stage 4: Development Build (Optional)
# ============================================
FROM dependencies as development

# Install development dependencies
RUN pip install pytest pytest-cov black flake8 mypy

# Copy application code
COPY flask-backend/ .

# Create directories
RUN mkdir -p logs uploads temp models database/data

# Set permissions
RUN chown -R phishguard:phishguard /app

# Switch to non-root user
USER phishguard

# Expose port with debug mode
EXPOSE 5000

# Development command with hot reload
CMD ["python", "app.py", "--debug"]