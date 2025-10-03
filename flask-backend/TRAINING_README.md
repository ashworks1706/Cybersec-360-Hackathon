# PhishGuard 360 - Custom Model Training

This directory contains scripts to fine-tune a custom DistilBERT model on the hackathon phishing dataset and deploy it to the PhishGuard 360 system.

## 🎯 Overview

The training pipeline fine-tunes DistilBERT on the provided social engineering phishing dataset to create a custom model specifically tailored for the PhishGuard 360 use case.

## 📋 Prerequisites

### 1. Install Training Dependencies
```bash
pip install -r requirements-training.txt
```

### 2. Verify Dataset
Ensure the hackathon dataset is available:
```bash
ls ../hackathon-resources/se_phishing_test_set.csv
```

## 🚀 Quick Start

### Option 1: Complete Pipeline (Recommended)
Run training and deployment in one command:
```bash
python run_complete_pipeline.py
```

### Option 2: Step-by-Step

#### Step 1: Train the Model
```bash
python train_phishguard_model.py \
    --base_model distilbert-base-uncased \
    --dataset ../hackathon-resources/se_phishing_test_set.csv \
    --output_dir ./models/phishguard-distilbert \
    --epochs 5 \
    --batch_size 16 \
    --learning_rate 2e-5
```

#### Step 2: Deploy the Model
```bash
python deploy_custom_model.py \
    --model_path ./models/phishguard-distilbert
```

## 📊 Training Details

### Dataset
- **Source**: Hackathon Social Engineering Phishing Test Set
- **Size**: ~1,000 samples
- **Classes**: Benign (0), Malicious (1)
- **Split**: 80% train, 10% validation, 10% test

### Model Architecture
- **Base Model**: DistilBERT (distilbert-base-uncased)
- **Task**: Binary classification (phishing vs benign)
- **Parameters**: ~67M parameters
- **Max Sequence Length**: 512 tokens

### Training Configuration
- **Optimizer**: AdamW
- **Learning Rate**: 2e-5
- **Batch Size**: 16
- **Epochs**: 5
- **Warmup Steps**: 100
- **Weight Decay**: 0.01
- **Early Stopping**: 3 epochs patience

## 📁 Output Structure

After training, the following files are created:

```
models/phishguard-distilbert/
├── pytorch_model.bin          # Model weights
├── config.json               # Model configuration
├── tokenizer.json            # Tokenizer
├── tokenizer_config.json     # Tokenizer configuration
├── evaluation_results.json   # Performance metrics
├── README.md                 # Model card
└── logs/                     # Training logs
```

## 🔧 Deployment Process

The deployment script automatically updates:

1. **Layer 2 Model** (`layers/layer2_model.py`)
   - Updates model path to use custom model
   - Adds fallback to HuggingFace model if custom model fails

2. **Configuration** (`config.py`)
   - Adds custom model settings
   - Updates confidence thresholds

3. **Environment Files** (`.env`, `.env.example`)
   - Adds custom model configuration variables
   - Sets model version and paths

## 🎛️ Configuration Options

### Training Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--base_model` | `distilbert-base-uncased` | Base model to fine-tune |
| `--dataset` | `../hackathon-resources/se_phishing_test_set.csv` | Training dataset path |
| `--output_dir` | `./models/phishguard-distilbert` | Output directory |
| `--epochs` | `5` | Number of training epochs |
| `--batch_size` | `16` | Training batch size |
| `--learning_rate` | `2e-5` | Learning rate |
| `--max_length` | `512` | Maximum sequence length |

### Environment Variables

After deployment, these variables control custom model usage:

```bash
# Enable custom model
USE_CUSTOM_MODEL=true

# Model paths
CUSTOM_MODEL_PATH=./models/phishguard-distilbert
CUSTOM_MODEL_NAME=phishguard-distilbert-v1.0

# Performance tuning
CUSTOM_MODEL_CONFIDENCE_THRESHOLD=0.7
CUSTOM_MODEL_HIGH_CONFIDENCE_THRESHOLD=0.85
```

## 📊 Performance Monitoring

### Evaluation Metrics
The training script tracks:
- **Accuracy**: Overall classification accuracy
- **F1 Score**: Weighted F1 score
- **Precision**: Weighted precision
- **Recall**: Weighted recall
- **Confusion Matrix**: Detailed classification results

### Example Results
```json
{
  "test_accuracy": 0.9234,
  "test_f1": 0.9187,
  "test_precision": 0.9156,
  "test_recall": 0.9234,
  "confusion_matrix": [[45, 2], [3, 50]]
}
```

## 🔄 Using the Custom Model

After deployment:

1. **Restart Flask Server**
   ```bash
   python app.py
   ```

2. **Verify Model Loading**
   Check logs for:
   ```
   ✅ Custom fine-tuned model loaded successfully
   ```

3. **Test Detection**
   Use the enhanced detection test:
   ```bash
   python test_enhanced_detection.py
   ```

## 🛠️ Troubleshooting

### Common Issues

#### 1. CUDA Out of Memory
Reduce batch size:
```bash
python train_phishguard_model.py --batch_size 8
```

#### 2. Model Loading Errors
Check model files exist:
```bash
ls -la models/phishguard-distilbert/
```

#### 3. Fallback to HuggingFace Model
If custom model fails to load, the system automatically falls back to the original HuggingFace model.

### Logs
Training logs are saved to:
- `training_log_YYYYMMDD_HHMMSS.log`
- `models/phishguard-distilbert/logs/`

## 🔍 Model Comparison

| Aspect | Original Model | Custom Fine-tuned |
|--------|----------------|-------------------|
| **Source** | HuggingFace Hub | Local fine-tuning |
| **Training Data** | General phishing | Hackathon-specific |
| **Confidence Threshold** | 0.5 | 0.7 (tuned) |
| **Domain Specificity** | General | University/Academic |
| **Performance** | Good baseline | Optimized for use case |

## 📈 Next Steps

1. **Monitor Performance**: Track detection accuracy on real emails
2. **Collect Feedback**: Gather user feedback for model improvement
3. **Incremental Training**: Retrain with new data periodically
4. **A/B Testing**: Compare custom vs original model performance

## 🎉 Success Indicators

After successful deployment, you should see:

✅ **Training completed** with good metrics (>90% accuracy)  
✅ **Model files** created in output directory  
✅ **System updated** to use custom model  
✅ **Flask server** loads custom model successfully  
✅ **Detection tests** pass with improved accuracy  

---

For questions or issues, check the logs or create an issue in the repository.