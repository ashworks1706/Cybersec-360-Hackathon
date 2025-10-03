# Configuration file for PhishGuard 360 Backend

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database Configuration
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///phishguard.db'
    RAG_DB_PATH = os.environ.get('RAG_DB_PATH') or 'database/rag_database.db'
    
    # API Keys
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or 'your-gemini-api-key-here'
    VIRUSTOTAL_API_KEY = os.environ.get('VIRUSTOTAL_API_KEY') or None
    SPAMHAUS_API_KEY = os.environ.get('SPAMHAUS_API_KEY') or None
    
    # Model Configuration
    MODEL_NAME = os.environ.get('MODEL_NAME') or 'cybersectony/phishing-email-detection-distilbert_v2.1'
    MODEL_CACHE_DIR = os.environ.get('MODEL_CACHE_DIR') or './models'
    CONFIDENCE_THRESHOLD = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.5'))
    
    # Security Settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    RATE_LIMIT_REQUESTS = int(os.environ.get('RATE_LIMIT_REQUESTS', '100'))
    RATE_LIMIT_WINDOW = int(os.environ.get('RATE_LIMIT_WINDOW', '3600'))  # 1 hour
    
    # Chrome Extension Settings
    ALLOWED_ORIGINS = [
        'chrome-extension://*',
        'http://localhost:*',
        'https://localhost:*'
    ]
    
    # Email Processing
    MAX_EMAIL_LENGTH = int(os.environ.get('MAX_EMAIL_LENGTH', '50000'))
    MAX_URLS_PER_EMAIL = int(os.environ.get('MAX_URLS_PER_EMAIL', '10'))
    
    # Layer Configuration
    LAYER1_ENABLED = os.environ.get('LAYER1_ENABLED', 'true').lower() == 'true'
    LAYER2_ENABLED = os.environ.get('LAYER2_ENABLED', 'true').lower() == 'true'
    LAYER3_ENABLED = os.environ.get('LAYER3_ENABLED', 'true').lower() == 'true'
    
    # Conversation Monitoring
    CONVERSATION_TIMEOUT_HOURS = int(os.environ.get('CONVERSATION_TIMEOUT_HOURS', '10'))
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/phishguard.log')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Enhanced security for production
    RATE_LIMIT_REQUESTS = 50  # Lower rate limit for production
    
class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    DATABASE_URL = 'sqlite:///:memory:'
    RAG_DB_PATH = ':memory:'

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}