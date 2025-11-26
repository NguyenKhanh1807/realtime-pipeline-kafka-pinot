#!/usr/bin/env python3
"""
Train fraud detection model using data from Pinot.
Uses XGBoost REGRESSION to predict fraud scores (0-100).
Thresholds are applied afterward to determine fraud/warning/normal labels.
Logs experiments to MLflow for version control and tracking.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix, precision_score, recall_score, f1_score, accuracy_score
import xgboost as xgb
import joblib
import mlflow
import mlflow.xgboost
import mlflow.sklearn
from scripts.feature_engineering import train_pipeline

def fetch_training_data(days_back=7, min_samples=1000):
    """
    Fetch labeled transaction data from Pinot for training.
    
    Args:
        days_back: Number of days of historical data to fetch
        min_samples: Minimum number of samples required
    
    Returns:
        DataFrame with transaction data
    """
    pinot_url = "http://localhost:8099/query/sql"
    
    # Calculate timestamp for N days ago
    cutoff_time = datetime.now() - timedelta(days=days_back)
    cutoff_str = cutoff_time.strftime("%Y-%m-%d %H:%M:%S")
    
    # query = {
    #     "sql": f"""
    #         SELECT 
    #             user_seq,
    #             deposit_amount,
    #             transaction_count_24hour,
    #             transaction_amount_24hour,
    #             transaction_count_1week,
    #             transaction_amount_1week,
    #             transaction_count_1month,
    #             transaction_amount_1month,
    #             payment_method,
    #             receiving_country,
    #             country_code,
    #             stay_qualify,
    #             id_type,
    #             fraud_score,
    #             label
    #         FROM transactions
    #         WHERE create_dt >= '{cutoff_str}'
    #         AND fraud_score IS NOT NULL
    #         LIMIT 100000
    #     """
    # }
    query = {
        "sql": f"""
            SELECT 
                transaction_seq,
                user_seq,
                create_dt,
                register_date,
                first_transaction_date,
                visa_expire_date,
                birth_date,
                deposit_amount,
                transaction_count_24hour,
                transaction_amount_24hour,
                transaction_count_1week,
                transaction_amount_1week,
                transaction_count_1month,
                transaction_amount_1month,
                
                payment_method,
                receiving_country,
                country_code,
                stay_qualify,
                id_type,
                user_name,
                fraud_score,
                label
            FROM transactions
            WHERE create_dt >= '{cutoff_str}'
            AND fraud_score IS NOT NULL
            LIMIT 100000
        """
    }
    
    print(f"Fetching training data from Pinot (last {days_back} days)...")
    response = requests.post(pinot_url, json=query, timeout=30)
    
    if response.status_code != 200:
        raise Exception(f"Pinot query failed: {response.status_code}")
    
    result = response.json()
    
    if not result.get('resultTable', {}).get('rows'):
        raise Exception("No data returned from Pinot")
    
    # Convert to DataFrame
    columns = result['resultTable']['dataSchema']['columnNames']
    rows = result['resultTable']['rows']
    df = pd.DataFrame(rows, columns=columns)
    
    print(f"Fetched {len(df)} transactions")
    print(f"Fraud score stats:")
    print(f"  Mean: {df['fraud_score'].mean():.2f}")
    print(f"  Median: {df['fraud_score'].median():.2f}")
    print(f"  Min: {df['fraud_score'].min():.2f}")
    print(f"  Max: {df['fraud_score'].max():.2f}")
    print(f"Label distribution:")
    print(f"  Normal (0): {(df['label']==0).sum()} ({(df['label']==0).mean()*100:.1f}%)")
    print(f"  Warning (1): {(df['label']==1).sum()} ({(df['label']==1).mean()*100:.1f}%)")
    print(f"  Banned (2): {(df['label']==2).sum()} ({(df['label']==2).mean()*100:.1f}%)")
    
    if len(df) < min_samples:
        print(f"WARNING: Only {len(df)} samples, recommended minimum is {min_samples}")
    
    return df

def prepare_features(df):
    """
    Feature engineering for fraud detection.
    
    Args:
        df: Raw transaction DataFrame
    
    Returns:
        Tuple of (X, y, feature_names)
    """
    df = df.copy()
    
    # Numeric features
    numeric_features = [
        'deposit_amount',
        'transaction_count_24hour',
        'transaction_amount_24hour',
        'transaction_count_1week',
        'transaction_amount_1week',
        'transaction_count_1month',
        'transaction_amount_1month',
    ]
    
    # Create velocity features (ratios)
    df['amount_per_tx_24h'] = df['transaction_amount_24hour'] / (df['transaction_count_24hour'] + 1)
    df['amount_per_tx_1week'] = df['transaction_amount_1week'] / (df['transaction_count_1week'] + 1)
    df['amount_per_tx_1month'] = df['transaction_amount_1month'] / (df['transaction_count_1month'] + 1)
    
    # Transaction frequency acceleration
    df['tx_accel_week'] = df['transaction_count_1week'] / 7.0
    df['tx_accel_month'] = df['transaction_count_1month'] / 30.0
    
    # Amount ratios
    df['amount_ratio_week_day'] = df['transaction_amount_1week'] / (df['transaction_amount_24hour'] + 1)
    df['amount_ratio_month_week'] = df['transaction_amount_1month'] / (df['transaction_amount_1week'] + 1)
    
    # Cross-border indicator
    df['is_cross_border'] = (df['receiving_country'] != df['country_code']).astype(int)
    
    # Payment method encoding (one-hot)
    payment_dummies = pd.get_dummies(df['payment_method'], prefix='payment')
    df = pd.concat([df, payment_dummies], axis=1)
    df = df.drop(columns=['payment_method'])
    
    # Country risk encoding (one-hot for top countries)
    country_dummies = pd.get_dummies(df['receiving_country'], prefix='country')
    df = pd.concat([df, country_dummies], axis=1)
    df = df.drop(columns=['receiving_country', 'country_code'])
    
    # ID type encoding
    id_dummies = pd.get_dummies(df['id_type'], prefix='id_type')
    df = pd.concat([df, id_dummies], axis=1)
    df = df.drop(columns=['id_type'])
    
    # Stay qualify
    df['stay_qualify_YES'] = (df['stay_qualify'] == 'YES').astype(int)
    
    # Select features for training
    feature_cols = (
        numeric_features + 
        [
            'amount_per_tx_24h', 'amount_per_tx_1week', 'amount_per_tx_1month',
            'tx_accel_week', 'tx_accel_month',
            'amount_ratio_week_day', 'amount_ratio_month_week',
            'is_cross_border', 'stay_qualify_YES'
        ] +
        [col for col in df.columns if col.startswith(('payment_', 'country_', 'id_type_'))]
    )
    
    # Fill NaN values
    X = df[feature_cols].fillna(0)
    y = df['fraud_score'].astype(float)  # Use fraud_score as regression target (0-100)
    
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Number of features: {len(feature_cols)}")
    print(f"Target (fraud_score) range: [{y.min():.2f}, {y.max():.2f}]")
    
    return X, y, feature_cols

def train_model(X, y, feature_names):
    """
    Train XGBoost REGRESSION model to predict fraud scores with MLflow tracking.
    
    Args:
        X: Feature matrix
        y: Fraud scores (0-100)
        feature_names: List of feature names
    
    Returns:
        Trained model, metrics dict, feature importance
    """
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"\nTraining set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    print(f"Training fraud_score - Mean: {y_train.mean():.2f}, Std: {y_train.std():.2f}")
    print(f"Test fraud_score - Mean: {y_test.mean():.2f}, Std: {y_test.std():.2f}")
    
    # Model parameters for regression
    params = {
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1,
        'random_state': 42,
        'objective': 'reg:squarederror',  # Regression objective
        'eval_metric': 'rmse',
        'model_type': 'regression'  # Track model type
    }
    
    # Train XGBoost REGRESSOR
    print("\nTraining XGBoost Regression model...")
    model = xgb.XGBRegressor(**params)
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Evaluate
    print("\n" + "="*60)
    print("MODEL EVALUATION - REGRESSION METRICS")
    print("="*60)
    
    y_pred = model.predict(X_test)
    
    # Clip predictions to valid range [0, 100]
    y_pred = np.clip(y_pred, 0, 100)
    
    # Regression metrics
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nRegression Metrics:")
    print(f"  RMSE: {rmse:.4f}")
    print(f"  MAE: {mae:.4f}")
    print(f"  R² Score: {r2:.4f}")
    print(f"  MSE: {mse:.4f}")
    
    # Evaluate classification performance at different thresholds
    print(f"\nClassification Performance at Thresholds:")
    print(f"  (Threshold 60: Normal vs Warning)")
    print(f"  (Threshold 90: Warning vs Banned)")
    
    # Apply thresholds to get labels
    y_test_labels = np.zeros(len(y_test))
    y_test_labels[y_test >= 60] = 1  # Warning
    y_test_labels[y_test >= 90] = 2  # Banned
    
    y_pred_labels = np.zeros(len(y_pred))
    y_pred_labels[y_pred >= 60] = 1  # Warning
    y_pred_labels[y_pred >= 90] = 2  # Banned
    
    from sklearn.metrics import accuracy_score, classification_report
    threshold_accuracy = accuracy_score(y_test_labels, y_pred_labels)
    
    print(f"\nLabel Classification Accuracy: {threshold_accuracy:.4f}")
    
    # Get unique labels present in the test set
    unique_labels = sorted(np.unique(np.concatenate([y_test_labels, y_pred_labels])))
    label_names = ['Normal', 'Warning', 'Banned']
    present_label_names = [label_names[int(label)] for label in unique_labels]
    
    print(f"\nClassification Report:")
    print(classification_report(y_test_labels, y_pred_labels, 
                                labels=unique_labels,
                                target_names=present_label_names,
                                zero_division=0))
    
    # Calculate fraud rate based on score thresholds
    high_risk_train = (y_train >= 90).sum() / len(y_train)
    high_risk_test = (y_test >= 90).sum() / len(y_test)
    
    # Calculate metrics
    metrics = {
        'rmse': float(rmse),
        'mae': float(mae),
        'r2_score': float(r2),
        'mse': float(mse),
        'threshold_accuracy': float(threshold_accuracy),
        'train_size': len(X_train),
        'test_size': len(X_test),
        'mean_score_train': float(y_train.mean()),
        'mean_score_test': float(y_test.mean()),
        'std_score_train': float(y_train.std()),
        'std_score_test': float(y_test.std()),
        'min_pred': float(y_pred.min()),
        'max_pred': float(y_pred.max()),
        'high_risk_rate_train': float(high_risk_train),
        'high_risk_rate_test': float(high_risk_test),
        'model_type': 'regression'
    }
    
    print(f"\nPredicted Score Range: [{y_pred.min():.2f}, {y_pred.max():.2f}]")
    print(f"High Risk Rate (score >= 90): Train={high_risk_train:.2%}, Test={high_risk_test:.2%}")
    
    # Feature importance
    print("\nTop 10 Most Important Features:")
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    for idx, row in feature_importance.head(10).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")
    
    return model, metrics, params, feature_importance

def save_model(model, feature_names, feature_importance):
    """
    Save trained model and metadata.
    
    Args:
        model: Trained model
        feature_names: List of feature names
        feature_importance: Feature importance DataFrame
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = f"models/fraud_detection_{timestamp}"
    os.makedirs(model_dir, exist_ok=True)
    
    # Save model
    model_path = f"{model_dir}/model.pkl"
    joblib.dump(model, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Save feature names
    feature_path = f"{model_dir}/features.json"
    with open(feature_path, 'w') as f:
        json.dump(feature_names, f, indent=2)
    print(f"Features saved to: {feature_path}")
    
    # Save feature importance
    importance_path = f"{model_dir}/feature_importance.csv"
    feature_importance.to_csv(importance_path, index=False)
    print(f"Feature importance saved to: {importance_path}")
    
    # Save metadata
    metadata = {
        'timestamp': timestamp,
        'model_type': 'XGBoost',
        'num_features': len(feature_names),
        'training_date': datetime.now().isoformat()
    }
    metadata_path = f"{model_dir}/metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to: {metadata_path}")
    
    # Create symlink to latest model
    latest_link = "models/fraud_detection_latest"
    if os.path.islink(latest_link):
        os.unlink(latest_link)
    os.symlink(os.path.basename(model_dir), latest_link)
    print(f"Latest model link: {latest_link}")
    
    return model_dir

def main():
    """Main training pipeline with MLflow tracking."""
    print("="*60)
    print("FRAUD DETECTION MODEL TRAINING")
    print("="*60)
    
    # Set MLflow tracking URI
    mlflow.set_tracking_uri("http://localhost:5000")
    mlflow.set_experiment("fraud-detection")
    
    try:
        # Fetch data
        df = fetch_training_data(days_back=7, min_samples=500)
        
        if df['label'].sum() == 0:
            print("\nWARNING: No fraud cases in training data!")
            print("The model will not be able to learn fraud patterns.")
            print("Consider:")
            print("  1. Collecting more data over time")
            print("  2. Using synthetic fraud cases")
            print("  3. Adjusting the processor's fraud detection threshold")
            return
        
        # Prepare features
        # X, y, feature_names = prepare_features(df)
        result = train_pipeline(df, save_path="artifacts/pipeline_artifacts.pkl")
        X = result['X']
        y= result['y']
        feature_names = X.columns.tolist()
        
        # Start MLflow run
        with mlflow.start_run(run_name=f"fraud_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
            # Train model
            model, metrics, params, feature_importance = train_model(X, y, feature_names)
            
            # Separate model_type from metrics (it's a string, should be param)
            model_type = metrics.pop('model_type', 'regression')
            
            # Log parameters
            mlflow.log_params(params)
            mlflow.log_param("num_features", len(feature_names))
            mlflow.log_param("total_samples", len(df))
            mlflow.log_param("model_type", model_type)
            
            # Log metrics (all numeric values)
            mlflow.log_metrics(metrics)
            
            # Log model
            mlflow.xgboost.log_model(
                model, 
                "model",
                registered_model_name="fraud-detection-model"
            )
            
            # Log feature importance as artifact
            feature_importance.to_csv("feature_importance.csv", index=False)
            mlflow.log_artifact("feature_importance.csv")
            os.remove("feature_importance.csv")
            
            # Log feature names
            with open("features.json", 'w') as f:
                json.dump(feature_names, f, indent=2)
            mlflow.log_artifact("features.json")
            os.remove("features.json")
            
            # Get run info
            run = mlflow.active_run()
            print(f"\n✓ MLflow Run ID: {run.info.run_id}")
            print(f"✓ Experiment ID: {run.info.experiment_id}")
            
            # Save model locally as well (backward compatibility)
            model_dir = save_model(model, feature_names, feature_importance)
            
            print("\n" + "="*60)
            print("TRAINING COMPLETE!")
            print("="*60)
            print(f"\nModel directory: {model_dir}")
            print(f"MLflow UI: http://localhost:5000")
            print("\nNext steps:")
            print("  1. Review the model in MLflow UI")
            print("  2. Compare with previous versions")
            print("  3. Promote the model to production if metrics improve")
            print("  4. Monitor model performance in production")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
