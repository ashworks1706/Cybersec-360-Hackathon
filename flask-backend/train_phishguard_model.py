#!/usr/bin/env python3
"""
PhishGuard 360 - Model Fine-tuning Script
Fine-tune DistilBERT on hackathon phishing dataset for improved accuracy
"""

import os
import sys
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    TrainingArguments, 
    Trainer,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import logging
from datetime import datetime
import json
import argparse
import warnings
warnings.filterwarnings("ignore")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'training_log_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PhishingDataset(Dataset):
    """Custom dataset for phishing email classification"""
    
    def __init__(self, texts, labels, tokenizer, max_length=512):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        # Tokenize
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }

class PhishGuardTrainer:
    """Fine-tuning trainer for PhishGuard 360"""
    
    def __init__(self, 
                 base_model="distilbert-base-uncased",
                 dataset_path="../hackathon-resources/se_phishing_test_set.csv",
                 output_dir="./models/phishguard-distilbert",
                 max_length=512,
                 batch_size=16,
                 learning_rate=2e-5,
                 num_epochs=5):
        
        self.base_model = base_model
        self.dataset_path = dataset_path
        self.output_dir = output_dir
        self.max_length = max_length
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.num_epochs = num_epochs
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"🚀 Initializing PhishGuard Trainer")
        logger.info(f"   Base Model: {base_model}")
        logger.info(f"   Dataset: {dataset_path}")
        logger.info(f"   Output: {output_dir}")
        
    def load_and_prepare_data(self):
        """Load and prepare the hackathon dataset"""
        logger.info("📊 Loading dataset...")
        
        # Load CSV data
        df = pd.read_csv(self.dataset_path)
        logger.info(f"   Total samples: {len(df)}")
        
        # Check label distribution
        label_counts = df['label'].value_counts()
        logger.info(f"   Label distribution: {dict(label_counts)}")
        
        # Convert labels to numeric (0 = Benign, 1 = Malicious)
        label_mapping = {'Benign': 0, 'Malicious': 1}
        df['label_numeric'] = df['label'].map(label_mapping)
        
        # Check for any unmapped labels
        if df['label_numeric'].isna().any():
            logger.error("Found unmapped labels!")
            unique_labels = df['label'].unique()
            logger.error(f"Unique labels: {unique_labels}")
            return None, None, None, None
        
        # Prepare texts and labels
        texts = df['email_text'].values
        labels = df['label_numeric'].values
        
        # Split data (80% train, 10% validation, 10% test)
        X_train, X_temp, y_train, y_temp = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )
        
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp
        )
        
        logger.info(f"   Train samples: {len(X_train)}")
        logger.info(f"   Validation samples: {len(X_val)}")
        logger.info(f"   Test samples: {len(X_test)}")
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def setup_model_and_tokenizer(self):
        """Setup model and tokenizer"""
        logger.info("🤖 Setting up model and tokenizer...")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.base_model)
        
        # Load model for sequence classification
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.base_model,
            num_labels=2,
            id2label={0: "Benign", 1: "Malicious"},
            label2id={"Benign": 0, "Malicious": 1}
        )
        
        logger.info(f"   Model: {self.model.__class__.__name__}")
        logger.info(f"   Parameters: {sum(p.numel() for p in self.model.parameters()):,}")
        
        # Check for GPU
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"   Device: {device}")
        
        self.model.to(device)
        
    def create_datasets(self, X_train, X_val, X_test, y_train, y_val, y_test):
        """Create PyTorch datasets"""
        logger.info("📦 Creating datasets...")
        
        self.train_dataset = PhishingDataset(
            X_train, y_train, self.tokenizer, self.max_length
        )
        
        self.val_dataset = PhishingDataset(
            X_val, y_val, self.tokenizer, self.max_length
        )
        
        self.test_dataset = PhishingDataset(
            X_test, y_test, self.tokenizer, self.max_length
        )
        
        logger.info(f"   Train dataset size: {len(self.train_dataset)}")
        logger.info(f"   Validation dataset size: {len(self.val_dataset)}")
        logger.info(f"   Test dataset size: {len(self.test_dataset)}")
    
    def compute_metrics(self, eval_pred):
        """Compute evaluation metrics"""
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=1)
        
        precision, recall, f1, _ = precision_recall_fscore_support(
            labels, predictions, average='weighted'
        )
        accuracy = accuracy_score(labels, predictions)
        
        return {
            'accuracy': accuracy,
            'f1': f1,
            'precision': precision,
            'recall': recall
        }
    
    def train_model(self):
        """Fine-tune the model"""
        logger.info("🎯 Starting fine-tuning...")
        
        # Setup training arguments
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=self.num_epochs,
            per_device_train_batch_size=self.batch_size,
            per_device_eval_batch_size=self.batch_size,
            warmup_steps=100,
            weight_decay=0.01,
            learning_rate=self.learning_rate,
            logging_dir=f'{self.output_dir}/logs',
            logging_steps=50,
            eval_strategy="steps",  # Updated parameter name
            eval_steps=100,
            save_strategy="steps",
            save_steps=200,
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            greater_is_better=True,
            report_to=None,  # Disable wandb/tensorboard
        )
        
        # Setup trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=self.train_dataset,
            eval_dataset=self.val_dataset,
            compute_metrics=self.compute_metrics,
            callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
        )
        
        # Train the model
        logger.info("🚀 Training started...")
        train_result = trainer.train()
        
        # Save the fine-tuned model
        trainer.save_model()
        self.tokenizer.save_pretrained(self.output_dir)
        
        logger.info("✅ Training completed!")
        logger.info(f"   Final train loss: {train_result.training_loss:.4f}")
        
        return trainer
    
    def evaluate_model(self, trainer):
        """Evaluate the fine-tuned model"""
        logger.info("📊 Evaluating model...")
        
        # Evaluate on test set
        test_results = trainer.evaluate(self.test_dataset)
        
        logger.info("🎯 Test Results:")
        logger.info(f"   Accuracy: {test_results['eval_accuracy']:.4f}")
        logger.info(f"   F1 Score: {test_results['eval_f1']:.4f}")
        logger.info(f"   Precision: {test_results['eval_precision']:.4f}")
        logger.info(f"   Recall: {test_results['eval_recall']:.4f}")
        
        # Get predictions for confusion matrix
        predictions = trainer.predict(self.test_dataset)
        y_pred = np.argmax(predictions.predictions, axis=1)
        y_true = predictions.label_ids
        
        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        logger.info("📈 Confusion Matrix:")
        logger.info(f"   [[TN: {cm[0,0]}, FP: {cm[0,1]}],")
        logger.info(f"    [FN: {cm[1,0]}, TP: {cm[1,1]}]]")
        
        # Save evaluation results
        results = {
            'test_accuracy': float(test_results['eval_accuracy']),
            'test_f1': float(test_results['eval_f1']),
            'test_precision': float(test_results['eval_precision']),
            'test_recall': float(test_results['eval_recall']),
            'confusion_matrix': cm.tolist(),
            'training_date': datetime.now().isoformat(),
            'base_model': self.base_model,
            'dataset_size': len(self.train_dataset) + len(self.val_dataset) + len(self.test_dataset)
        }
        
        with open(f'{self.output_dir}/evaluation_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        return results
    
    def create_model_card(self, results):
        """Create a model card for the fine-tuned model"""
        model_card = f"""
# PhishGuard-DistilBERT

## Model Description
Fine-tuned DistilBERT model for phishing email detection, specifically trained for the PhishGuard 360 system.

## Training Data
- **Dataset**: Hackathon Social Engineering Phishing Test Set
- **Size**: {results['dataset_size']} samples
- **Classes**: Benign (0), Malicious (1)

## Performance
- **Accuracy**: {results['test_accuracy']:.4f}
- **F1 Score**: {results['test_f1']:.4f}
- **Precision**: {results['test_precision']:.4f}
- **Recall**: {results['test_recall']:.4f}

## Training Details
- **Base Model**: {self.base_model}
- **Training Date**: {results['training_date']}
- **Epochs**: {self.num_epochs}
- **Learning Rate**: {self.learning_rate}
- **Batch Size**: {self.batch_size}

## Usage
```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

tokenizer = AutoTokenizer.from_pretrained("./models/phishguard-distilbert")
model = AutoModelForSequenceClassification.from_pretrained("./models/phishguard-distilbert")
```

## Model Files
- `pytorch_model.bin` - Model weights
- `config.json` - Model configuration
- `tokenizer.json` - Tokenizer
- `evaluation_results.json` - Performance metrics
"""
        
        with open(f'{self.output_dir}/README.md', 'w') as f:
            f.write(model_card)
        
        logger.info(f"📄 Model card saved to {self.output_dir}/README.md")
    
    def run_full_training(self):
        """Run the complete training pipeline"""
        logger.info("🛡️ PhishGuard 360 - Model Fine-tuning Pipeline")
        logger.info("=" * 60)
        
        try:
            # Load data
            X_train, X_val, X_test, y_train, y_val, y_test = self.load_and_prepare_data()
            if X_train is None:
                return False
            
            # Setup model
            self.setup_model_and_tokenizer()
            
            # Create datasets
            self.create_datasets(X_train, X_val, X_test, y_train, y_val, y_test)
            
            # Train model
            trainer = self.train_model()
            
            # Evaluate model
            results = self.evaluate_model(trainer)
            
            # Create model card
            self.create_model_card(results)
            
            logger.info("🎉 Fine-tuning completed successfully!")
            logger.info(f"📁 Model saved to: {self.output_dir}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Training failed: {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Fine-tune DistilBERT for PhishGuard 360')
    
    parser.add_argument('--base_model', default='distilbert-base-uncased',
                       help='Base model to fine-tune')
    parser.add_argument('--dataset', default='../hackathon-resources/se_phishing_test_set.csv',
                       help='Path to training dataset')
    parser.add_argument('--output_dir', default='./models/phishguard-distilbert',
                       help='Output directory for fine-tuned model')
    parser.add_argument('--epochs', type=int, default=5,
                       help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=16,
                       help='Training batch size')
    parser.add_argument('--learning_rate', type=float, default=2e-5,
                       help='Learning rate')
    parser.add_argument('--max_length', type=int, default=512,
                       help='Maximum sequence length')
    
    args = parser.parse_args()
    
    # Create trainer
    trainer = PhishGuardTrainer(
        base_model=args.base_model,
        dataset_path=args.dataset,
        output_dir=args.output_dir,
        max_length=args.max_length,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        num_epochs=args.epochs
    )
    
    # Run training
    success = trainer.run_full_training()
    
    if success:
        print(f"\n🎉 SUCCESS! Model saved to: {args.output_dir}")
        print(f"🔄 Next step: Update PhishGuard 360 to use the new model")
        sys.exit(0)
    else:
        print(f"\n❌ FAILED! Check logs for details")
        sys.exit(1)

if __name__ == "__main__":
    main()