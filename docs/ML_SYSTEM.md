# Machine Learning System Documentation

Complete guide for the ML-based fraud detection system including model architecture, training, deployment, and auto-retraining.

---

## Table of Contents
1. [Overview](#overview)
2. [Model Architecture](#model-architecture)
3. [Training Pipeline](#training-pipeline)
4. [MLflow Integration](#mlflow-integration)
5. [Auto-Retrain System](#auto-retrain-system)
6. [Deployment](#deployment)

---

## Overview

The fraud detection system uses **XGBoost regression models** to predict continuous fraud scores (0-100), providing granular risk assessment for real-time transaction monitoring.

### Key Features
- Regression-based scoring (0-100) instead of binary classification
- MLflow for model versioning and experiment tracking
- Automatic retraining when new data segments are created
- Real-time inference via FastAPI

---

## Model Architecture

### XGBoost Regressor

**Input Features**:
- `deposit_amount` - Transaction deposit amount
- `withdrawal_amount` - Transaction withdrawal amount  
- `current_balance` - Account balance after transaction
- `frequency` - Transaction frequency (24-hour window)
- `country` - Country code (one-hot encoded)
- `payment_method` - Payment method (one-hot encoded)

**Output**: Fraud score (continuous value 0-100)

### Why Regression?
1. **Granular Risk Scores**: Provides nuanced risk levels instead of binary fraud/not-fraud
2. **Flexible Thresholds**: Can adjust decision boundaries without retraining
3. **Better Monitoring**: Track score distributions over time
4. **Human Interpretability**: Easier to understand "65% fraud risk" vs "fraud: true"

### Label Mapping
- **Score 0-40**: Label 0 (Normal) - Low risk transactions
- **Score 41-70**: Label 1 (Warning) - Medium risk, flag for review
- **Score 71-100**: Label 2 (Banned) - High risk, automatic ban

---

## Training Pipeline

### Data Collection

**Source**: Apache Pinot `transactions` table

```python
# Query Pinot for training data
query = """
SELECT 
  deposit_amount,
  withdrawal_amount,
  current_balance,
  frequency,
  country,
  payment_method,
  fraud_score
FROM transactions
WHERE create_dt >= NOW() - 604800000  -- Last 7 days
LIMIT 100000
"""
```

### Feature Engineering

1. **One-Hot Encoding**: Country and payment method
2. **Numeric Scaling**: StandardScaler for amount features
3. **Feature Selection**: Remove low-variance features

### Model Training

**Script**: `scripts/train_and_export_mlflow.py`

```python
from xgboost import XGBRegressor
import mlflow

# Model configuration
model = XGBRegressor(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    objective='reg:squarederror',
    random_state=42
)

# Train
model.fit(X_train, y_train)

# Log to MLflow
with mlflow.start_run():
    mlflow.log_params({
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1
    })
    mlflow.log_metrics({
        'mae': mae,
        'rmse': rmse,
        'r2': r2
    })
    mlflow.sklearn.log_model(model, "model")
```

### Evaluation Metrics

**Regression Metrics**:
- **MAE** (Mean Absolute Error): Average prediction error
- **RMSE** (Root Mean Squared Error): Penalizes large errors
- **R²** (R-squared): Proportion of variance explained

**Classification Metrics** (using thresholds):
- **Precision**: Of predicted frauds, how many were correct
- **Recall**: Of actual frauds, how many were detected
- **F1-Score**: Harmonic mean of precision and recall

---

## MLflow Integration

### Setup

**Docker Service** (defined in `docker-compose.yml`):
```yaml
mlflow:
  image: ghcr.io/mlflow/mlflow:v2.9.2
  ports:
    - "5000:5000"
  volumes:
    - ./mlruns:/mlflow/mlruns
    - ./mlartifacts:/mlflow/mlartifacts
  command: >
    mlflow server
    --backend-store-uri sqlite:///mlflow/mlruns/mlflow.db
    --default-artifact-root /mlflow/mlartifacts
    --host 0.0.0.0
    --port 5000
```

**Access**: http://localhost:5000

### Model Registry

All trained models are registered with:
- **Experiment Name**: "Fraud Detection"
- **Model Name**: "fraud_detection_model"
- **Versioning**: Automatic version increment
- **Metadata**: Training metrics, parameters, dataset info

### Model Versioning

```python
import mlflow

# Set tracking URI
mlflow.set_tracking_uri("http://localhost:5000")

# Create experiment
experiment_id = mlflow.create_experiment("Fraud Detection")

# Start run
with mlflow.start_run(experiment_id=experiment_id):
    # Train and log model
    mlflow.sklearn.log_model(model, "model")
    
    # Register model
    mlflow.register_model(
        f"runs:/{run_id}/model",
        "fraud_detection_model"
    )
```

### Loading Models

```python
import mlflow.sklearn

# Load latest version
model_uri = "models:/fraud_detection_model/latest"
model = mlflow.sklearn.load_model(model_uri)

# Load specific version
model_uri = "models:/fraud_detection_model/3"
model = mlflow.sklearn.load_model(model_uri)
```

---

## Auto-Retrain System

### Trigger Mechanism

**Monitor**: `app/segment_monitor.py`

The system automatically retrains when:
1. New Pinot segment is created (1000 records threshold)
2. Segment monitor detects segment count increase
3. Training pipeline executes
4. New model is deployed

### Pinot Segment Configuration

**File**: `conf/transactions_realtime_table.json`

```json
{
  "tableIndexConfig": {
    "streamConfigs": {
      "realtime.segment.flush.threshold.rows": "1000"
    }
  }
}
```

**Trigger**: When a realtime segment reaches 1000 records, it seals and commits automatically.

### Segment Monitor

**Script**: `app/segment_monitor.py`

```python
def check_new_segments():
    """Check if new segments were created"""
    current_count = get_segment_count()
    
    if current_count > last_known_count:
        print(f"New segment detected: {last_known_count} → {current_count}")
        trigger_retrain()
        last_known_count = current_count

def trigger_retrain():
    """Execute model retraining"""
    subprocess.run([
        "python3",
        "scripts/train_and_export_mlflow.py"
    ])
```

**Run Monitor**:
```bash
nohup python3 -u app/segment_monitor.py > logs/segment_monitor.log 2>&1 &
```

### Training Workflow

1. **Segment Monitor** detects new segment
2. **Training Script** (`train_and_export_mlflow.py`) executes:
   - Fetch latest data from Pinot
   - Preprocess features
   - Train XGBoost model
   - Evaluate performance
   - Log to MLflow
   - Save model artifact
3. **API** automatically loads latest model
4. **ML Detector** uses new model for scoring

---

## Deployment

### FastAPI Integration

**Model Loading** (`app/main.py`):
```python
import mlflow.sklearn

# Load model on startup
@app.on_event("startup")
async def load_model():
    global model
    model_uri = "models:/fraud_detection_model/latest"
    model = mlflow.sklearn.load_model(model_uri)
    print(f"Model loaded: {model_uri}")
```

**Prediction Endpoint**:
```python
@app.post("/predict")
async def predict(transaction: TransactionInput):
    # Preprocess
    features = preprocess(transaction)
    
    # Predict
    fraud_score = model.predict([features])[0]
    
    # Map to label
    if fraud_score < 40:
        label = 0  # Normal
    elif fraud_score < 70:
        label = 1  # Warning
    else:
        label = 2  # Banned
    
    return {
        "fraud_score": fraud_score,
        "label": label,
        "risk_level": get_risk_level(label)
    }
```

### Real-time Scoring

**ML Fraud Detector** (`crawl_data/ml_fraud_detector.py`):
```python
from kafka import KafkaConsumer
import mlflow.sklearn

# Load model
model = mlflow.sklearn.load_model("models:/fraud_detection_model/latest")

# Consume transactions
consumer = KafkaConsumer('transactions_raw')

for message in consumer:
    transaction = json.loads(message.value)
    
    # Score transaction
    features = extract_features(transaction)
    fraud_score = model.predict([features])[0]
    
    # Update transaction with score and label
    transaction['fraud_score'] = fraud_score
    transaction['label'] = get_label(fraud_score)
    
    # Produce to clean topic
    producer.send('transactions_clean', transaction)
```

### Model Refresh

The system supports hot-reloading of models:

```python
@app.post("/reload-model")
async def reload_model():
    """Manually reload the latest model"""
    global model
    model_uri = "models:/fraud_detection_model/latest"
    model = mlflow.sklearn.load_model(model_uri)
    return {"status": "Model reloaded", "uri": model_uri}
```

---

## Model Performance Monitoring

### UI Dashboard

**Location**: Transaction page (`/transaction`)

**Metrics Displayed**:
- Total Transactions
- Average Fraud Score (Test Set)
- Training Set Size
- Test Set Size
- MAE (Mean Absolute Error)
- RMSE (Root Mean Squared Error)
- R² Score

### MLflow UI

**Access**: http://localhost:5000

**Features**:
- Compare model versions
- View training metrics over time
- Download model artifacts
- Track experiment parameters

### Prometheus Metrics

**Custom Metrics** (via Pinot exporter):
- `pinot_table_size_bytes{table="transactions"}`
- `pinot_server_segment_count{table="transactions"}`
- Model prediction latency
- Score distribution

---

## Best Practices

### Training

1. **Regular Retraining**: Automatic retraining every 1000 records keeps model fresh
2. **Data Quality**: Monitor for data drift and anomalies
3. **Feature Engineering**: Continuously evaluate feature importance
4. **Cross-Validation**: Use time-based splits for time-series data

### Deployment

1. **Model Versioning**: Always version models via MLflow
2. **A/B Testing**: Compare old vs new model performance
3. **Rollback Plan**: Keep previous model version ready
4. **Monitoring**: Track prediction latency and score distributions

### Maintenance

1. **Weekly**: Review model performance metrics
2. **Monthly**: Analyze false positives/negatives
3. **Quarterly**: Re-evaluate features and architecture
4. **Yearly**: Consider model type changes

---

## Troubleshooting

### Model Not Loading

```bash
# Check MLflow is running
curl http://localhost:5000/health

# Check model exists
mlflow models list

# Check logs
tail -f logs/api.log
```

### Poor Model Performance

```bash
# Retrain manually
python3 scripts/train_and_export_mlflow.py

# Check training data
curl -X POST "http://localhost:8099/query/sql" \
  -d '{"sql":"SELECT COUNT(*) FROM transactions"}'

# View metrics in MLflow UI
http://localhost:5000
```

### Auto-Retrain Not Triggering

```bash
# Check segment monitor
tail -f logs/segment_monitor.log

# Verify segment count
curl "http://localhost:9000/segments/transactions"

# Restart monitor
pkill -f segment_monitor.py
nohup python3 -u app/segment_monitor.py > logs/segment_monitor.log 2>&1 &
```

---

## API Reference

### Training Endpoint
```bash
POST /train
```
Manually trigger model training

### Prediction Endpoint
```bash
POST /predict
Content-Type: application/json

{
  "user_seq": 1,
  "deposit_amount": 1000,
  "withdrawal_amount": 500,
  "current_balance": 5000,
  "frequency": 10,
  "country": "US",
  "payment_method": "credit_card"
}
```

### Model Info Endpoint
```bash
GET /model/info
```
Returns current model version and metadata

---

**Version**: 1.0.0  
**Last Updated**: November 25, 2025
