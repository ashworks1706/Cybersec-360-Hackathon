#!/usr/bin/env python3
"""
PhishGuard 360 Backend Startup Script
Initializes and runs the Flask backend server
"""

import os
import sys
import logging
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our application
try:
    from app import PhishGuardBackend
    from config import config
except ImportError as e:
    print(f"Failed to import required modules: {e}")
    print("Please install required dependencies with: pip install -r requirements.txt")
    sys.exit(1)

def setup_logging():
    """Setup logging configuration"""
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('logs/phishguard.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )

def create_directories():
    """Create necessary directories"""
    directories = [
        'cache',
        'database', 
        'logs',
        'models'
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"✓ Created directory: {directory}")

def main():
    """Main startup function"""
    print("🛡️  PhishGuard 360 Backend Starting...")
    print("=" * 50)
    
    # Setup environment
    setup_logging()
    create_directories()
    
    # Get configuration
    env = os.environ.get('FLASK_ENV', 'development')
    config_class = config.get(env, config['default'])
    
    print(f"Environment: {env}")
    print(f"Configuration: {config_class.__name__}")
    
    # Initialize backend
    try:
        backend = PhishGuardBackend()
        print("✓ Backend initialized successfully")
        
        # Start server
        host = os.environ.get('FLASK_HOST', 'localhost')
        port = int(os.environ.get('FLASK_PORT', 5000))
        debug = env == 'development'
        
        print(f"🚀 Starting server on {host}:{port}")
        print(f"📱 Chrome extension should connect to: http://{host}:{port}")
        print("=" * 50)
        
        backend.run(host=host, port=port, debug=debug)
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down PhishGuard 360 Backend...")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()