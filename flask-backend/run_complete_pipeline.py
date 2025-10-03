#!/usr/bin/env python3
"""
PhishGuard 360 - Complete Model Pipeline
Train custom model and deploy to production system
"""

import subprocess
import sys
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_training():
    """Run the model training pipeline"""
    logger.info("🎯 Starting model training...")
    
    cmd = [
        sys.executable, 'train_phishguard_model.py',
        '--base_model', 'distilbert-base-uncased',
        '--dataset', '../hackathon-resources/se_phishing_test_set.csv',
        '--output_dir', './models/phishguard-distilbert',
        '--epochs', '5',
        '--batch_size', '16',
        '--learning_rate', '2e-5'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("✅ Model training completed successfully")
            return True
        else:
            logger.error("❌ Model training failed")
            logger.error(f"Error: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Training execution failed: {e}")
        return False

def run_deployment():
    """Run the model deployment pipeline"""
    logger.info("🚀 Starting model deployment...")
    
    cmd = [
        sys.executable, 'deploy_custom_model.py',
        '--model_path', './models/phishguard-distilbert'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("✅ Model deployment completed successfully")
            return True
        else:
            logger.error("❌ Model deployment failed")
            logger.error(f"Error: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Deployment execution failed: {e}")
        return False

def check_requirements():
    """Check if all requirements are available"""
    logger.info("🔍 Checking requirements...")
    
    # Check dataset
    dataset_path = Path("../hackathon-resources/se_phishing_test_set.csv")
    if not dataset_path.exists():
        logger.error(f"❌ Dataset not found: {dataset_path}")
        return False
    
    logger.info(f"✅ Dataset found: {dataset_path}")
    
    # Check required packages
    required_packages = [
        'torch', 'transformers', 'pandas', 'numpy', 
        'sklearn', 'datasets'  # Note: scikit-learn imports as sklearn
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"❌ Missing packages: {missing_packages}")
        logger.info("Install with: pip install torch transformers pandas numpy scikit-learn datasets")
        return False
    
    logger.info("✅ All required packages available")
    return True

def main():
    """Main pipeline function"""
    print("🛡️ PhishGuard 360 - Complete Model Pipeline")
    print("=" * 60)
    
    # Check requirements
    if not check_requirements():
        print("❌ Requirements check failed")
        sys.exit(1)
    
    # Run training
    if not run_training():
        print("❌ Training failed")
        sys.exit(1)
    
    # Run deployment
    if not run_deployment():
        print("❌ Deployment failed")
        sys.exit(1)
    
    print("\n🎉 SUCCESS! Complete pipeline executed successfully")
    print("📊 Custom model trained and deployed")
    print("🔄 Restart the Flask server to use the new model")
    print("\nNext steps:")
    print("1. Stop the current Flask server (Ctrl+C)")
    print("2. Restart with: python app.py")
    print("3. Test the enhanced detection system")

if __name__ == "__main__":
    main()