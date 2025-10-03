
# PhishGuard-DistilBERT

## Model Description
Fine-tuned DistilBERT model for phishing email detection, specifically trained for the PhishGuard 360 system.

## Training Data
- **Dataset**: Hackathon Social Engineering Phishing Test Set
- **Size**: 150 samples
- **Classes**: Benign (0), Malicious (1)

## Performance
- **Accuracy**: 1.0000
- **F1 Score**: 1.0000
- **Precision**: 1.0000
- **Recall**: 1.0000

## Training Details
- **Base Model**: distilbert-base-uncased
- **Training Date**: 2025-10-03T10:15:59.430442
- **Epochs**: 5
- **Learning Rate**: 2e-05
- **Batch Size**: 16

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
