#!/usr/bin/env python3
"""
Model Deployment Script for PhishGuard 360
Updates all system components to use the fine-tuned custom model
"""

import os
import sys
import json
import shutil
import pandas as pd
from pathlib import Path
import logging
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ModelDeployment:
    """Deploy custom fine-tuned model across PhishGuard 360 system"""
    
    def __init__(self, model_path="./models/phishguard-distilbert"):
        self.model_path = Path(model_path)
        self.model_name = "phishguard-distilbert-v1.0"
        
        # Files to update
        self.files_to_update = {
            'layer2_model.py': 'layers/layer2_model.py',
            'config.py': 'config.py',
            '.env.example': '.env.example',
            '.env': '.env'
        }
        
        logger.info(f"🚀 Initializing model deployment from {model_path}")
    
    def verify_model_files(self):
        """Verify all required model files exist"""
        required_files = [
            'config.json',
            'tokenizer.json',
            'vocab.txt'
        ]
        
        # Check for either pytorch_model.bin or model.safetensors
        model_file_found = False
        for model_file in ['pytorch_model.bin', 'model.safetensors']:
            if (self.model_path / model_file).exists():
                model_file_found = True
                break
        
        if not model_file_found:
            required_files.append('pytorch_model.bin or model.safetensors')
        
        logger.info("🔍 Verifying model files...")
        
        if not self.model_path.exists():
            logger.error(f"❌ Model directory not found: {self.model_path}")
            return False
        
        missing_files = []
        for file in required_files:
            if not (self.model_path / file).exists():
                missing_files.append(file)
        
        if missing_files:
            logger.error(f"❌ Missing model files: {missing_files}")
            return False
        
        logger.info("✅ All model files verified")
        return True
    
    def backup_original_files(self):
        """Create backup of original files"""
        logger.info("💾 Creating backup of original files...")
        
        backup_dir = Path("./backups/original_model")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        for file_key, file_path in self.files_to_update.items():
            if Path(file_path).exists():
                backup_path = backup_dir / f"{file_key}.backup"
                shutil.copy2(file_path, backup_path)
                logger.info(f"   Backed up: {file_path} -> {backup_path}")
    
    def update_layer2_model(self):
        """Update Layer 2 model to use custom model"""
        logger.info("🤖 Updating Layer 2 model configuration...")
        
        layer2_file = 'layers/layer2_model.py'
        
        # Read the current file
        with open(layer2_file, 'r') as f:
            content = f.read()
        
        # Replace the model name
        old_model = 'cybersectony/phishing-email-detection-distilbert_v2.1'
        new_model_path = str(self.model_path.resolve())
        
        # Update model initialization
        content = content.replace(
            f'self.model_name = "{old_model}"',
            f'self.model_name = "{new_model_path}"'
        )
        
        # Add custom model loading method
        load_model_method = '''
    def load_model(self):
        """Load the custom fine-tuned PhishGuard model"""
        try:
            logger.info("Loading custom PhishGuard DistilBERT model...")
            
            # Check if custom model exists
            if os.path.exists(self.model_name):
                # Load custom fine-tuned model
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
                logger.info("✅ Custom fine-tuned model loaded successfully")
            else:
                # Fallback to HuggingFace model
                logger.warning(f"Custom model not found at {self.model_name}")
                logger.info("📥 Falling back to HuggingFace model...")
                fallback_model = "cybersectony/phishing-email-detection-distilbert_v2.1"
                self.tokenizer = AutoTokenizer.from_pretrained(fallback_model)
                self.model = AutoModelForSequenceClassification.from_pretrained(fallback_model)
                logger.info("✅ Fallback model loaded successfully")
            
            # Move model to appropriate device
            self.model.to(self.device)
            self.model.eval()
            
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            # Fallback to a basic model or error handling
            self.model = None
            self.tokenizer = None'''
        
        # Replace the existing load_model method
        import re
        pattern = r'def load_model\(self\):.*?(?=\n    def|\nclass|\n\n[a-zA-Z]|\Z)'
        content = re.sub(pattern, load_model_method.strip(), content, flags=re.DOTALL)
        
        # Write the updated content
        with open(layer2_file, 'w') as f:
            f.write(content)
        
        logger.info("✅ Layer 2 model updated")
    
    def update_config_file(self):
        """Update config.py with custom model settings"""
        logger.info("⚙️ Updating config.py...")
        
        config_file = 'config.py'
        
        # Add custom model configuration
        custom_config = f'''
# Custom Model Configuration
CUSTOM_MODEL_PATH = "{self.model_path.resolve()}"
CUSTOM_MODEL_NAME = "{self.model_name}"
USE_CUSTOM_MODEL = True

# Model Performance Settings
CUSTOM_MODEL_CONFIDENCE_THRESHOLD = 0.7  # Adjusted for fine-tuned model
CUSTOM_MODEL_HIGH_CONFIDENCE_THRESHOLD = 0.85
'''
        
        # Read existing config
        if Path(config_file).exists():
            with open(config_file, 'r') as f:
                content = f.read()
        else:
            content = ""
        
        # Add custom model config if not already present
        if "CUSTOM_MODEL_PATH" not in content:
            content += custom_config
        
        # Write updated config
        with open(config_file, 'w') as f:
            f.write(content)
        
        logger.info("✅ Config file updated")
    
    def update_env_files(self):
        """Update environment files with custom model settings"""
        logger.info("🔧 Updating environment files...")
        
        # Environment variables to add/update
        env_updates = {
            'PHISHGUARD_MODEL_PATH': str(self.model_path.resolve()),
            'PHISHGUARD_MODEL_NAME': self.model_name,
            'USE_CUSTOM_MODEL': 'true',
            'MODEL_VERSION': 'v1.0-finetuned'
        }
        
        # Update .env.example
        self.update_env_file('.env.example', env_updates)
        
        # Update .env if it exists
        if Path('.env').exists():
            self.update_env_file('.env', env_updates)
        
        logger.info("✅ Environment files updated")
    
    def update_env_file(self, env_file, updates):
        """Update a specific environment file"""
        logger.info(f"   Updating {env_file}...")
        
        # Read existing content
        if Path(env_file).exists():
            with open(env_file, 'r') as f:
                lines = f.readlines()
        else:
            lines = []
        
        # Create a dict of existing variables
        existing_vars = {}
        for i, line in enumerate(lines):
            if '=' in line and not line.strip().startswith('#'):
                key = line.split('=')[0].strip()
                existing_vars[key] = i
        
        # Add custom model section header if not present
        model_section_exists = any('Custom Model Configuration' in line for line in lines)
        if not model_section_exists:
            lines.append('\n# Custom Model Configuration\n')
        
        # Update or add variables
        for key, value in updates.items():
            line = f"{key}={value}\n"
            if key in existing_vars:
                lines[existing_vars[key]] = line
            else:
                lines.append(line)
        
        # Write updated content
        with open(env_file, 'w') as f:
            f.writelines(lines)
    
    def create_deployment_summary(self):
        """Create a summary of the deployment"""
        summary = {
            'deployment_date': str(pd.Timestamp.now()),
            'model_path': str(self.model_path.resolve()),
            'model_name': self.model_name,
            'files_updated': list(self.files_to_update.values()),
            'status': 'deployed'
        }
        
        # Load model evaluation results if available
        eval_file = self.model_path / 'evaluation_results.json'
        if eval_file.exists():
            with open(eval_file, 'r') as f:
                eval_results = json.load(f)
            summary['model_performance'] = eval_results
        
        # Save deployment summary
        with open('deployment_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info("📄 Deployment summary saved to deployment_summary.json")
        return summary
    
    def verify_deployment(self):
        """Verify the deployment was successful"""
        logger.info("🔍 Verifying deployment...")
        
        try:
            # Try to import and initialize the updated Layer 2
            sys.path.insert(0, '.')
            from layers.layer2_model import Layer2ModelClassifier
            
            layer2 = Layer2ModelClassifier()
            
            if layer2.model is not None:
                logger.info("✅ Custom model loaded successfully in Layer 2")
                
                # Test with a simple email
                test_email = {
                    'sender': 'test@example.com',
                    'subject': 'Test email',
                    'body': 'This is a test email to verify model deployment.'
                }
                
                result = layer2.classify_email(test_email)
                logger.info(f"✅ Model test classification successful")
                logger.info(f"   Status: {result.get('status')}")
                logger.info(f"   Confidence: {result.get('confidence', 0):.3f}")
                
                return True
            else:
                logger.error("❌ Model failed to load in Layer 2")
                return False
                
        except Exception as e:
            logger.error(f"❌ Deployment verification failed: {e}")
            return False
    
    def run_deployment(self):
        """Run the complete deployment process"""
        logger.info("🛡️ PhishGuard 360 - Custom Model Deployment")
        logger.info("=" * 60)
        
        try:
            # Verify model exists
            if not self.verify_model_files():
                return False
            
            # Backup original files
            self.backup_original_files()
            
            # Update system components
            self.update_layer2_model()
            self.update_config_file()
            self.update_env_files()
            
            # Create deployment summary
            summary = self.create_deployment_summary()
            
            # Verify deployment
            if self.verify_deployment():
                logger.info("🎉 Custom model deployment completed successfully!")
                logger.info(f"📊 Model Performance:")
                if 'model_performance' in summary:
                    perf = summary['model_performance']
                    logger.info(f"   Accuracy: {perf.get('test_accuracy', 'N/A'):.4f}")
                    logger.info(f"   F1 Score: {perf.get('test_f1', 'N/A'):.4f}")
                
                logger.info(f"📁 Model Path: {self.model_path.resolve()}")
                return True
            else:
                logger.error("❌ Deployment verification failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Deployment failed: {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    """Main deployment function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Deploy custom PhishGuard model')
    parser.add_argument('--model_path', default='./models/phishguard-distilbert',
                       help='Path to fine-tuned model directory')
    
    args = parser.parse_args()
    
    # Run deployment
    deployer = ModelDeployment(args.model_path)
    success = deployer.run_deployment()
    
    if success:
        print(f"\n🎉 SUCCESS! Custom model deployed successfully")
        print(f"🔄 Restart the Flask server to use the new model")
        sys.exit(0)
    else:
        print(f"\n❌ FAILED! Check logs for details")
        sys.exit(1)

if __name__ == "__main__":
    main()