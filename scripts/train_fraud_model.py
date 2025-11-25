#!/usr/bin/env python3
"""
Train fraud detection model using data from Pinot.
Uses XGBoost REGRESSION to predict fraud scores (0-100).
Logs experiments to MLflow for version control and tracking.
Fixes: Read-only file system error on macOS.
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
# Clean unused imports
from sklearn.metrics import classification_report
import xgboost as xgb
import joblib
import mlflow
import mlflow.xgboost
import mlflow.sklearn
import shutil

def fetch_training_data(days_back=7, min_samples=1000):
    """Fetch labeled transaction data from Pinot for training."""
    pinot_url = "http://localhost:8099/query/sql"
    
    cutoff_time = datetime.now() - timedelta(days=days_back)
    cutoff_str = cutoff_time.strftime("%Y-%m-%d %H:%M:%S")
    
    query = {
        "sql": f"""
            SELECT 
                user_seq, deposit_amount,
                transaction_count_24hour, transaction_amount_24hour,
                transaction_count_1week, transaction_amount_1week,
                transaction_count_1month, transaction_amount_1month,
                payment_method, receiving_country, country_code,
                stay_qualify, id_type, fraud_score, label
            FROM transactions
            WHERE create_dt >= '{cutoff_str}'
            AND fraud_score IS NOT NULL
            LIMIT 100000
        """
    }
    
    print(f"Fetching training data from Pinot (last {days_back} days)...")
    try:
        response = requests.post(pinot_url, json=query, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Pinot: {e}")
        # Return empty dataframe to handle gracefully in main
        return pd.DataFrame()
    
    result = response.json()
    if not result.get('resultTable', {}).get('rows'):
        print("No data returned from Pinot")
        return pd.DataFrame()
    
    columns = result['resultTable']['dataSchema']['columnNames']
    rows = result['resultTable']['rows']
    df = pd.DataFrame(rows, columns=columns)
    
    print(f"Fetched {len(df)} transactions")
    # Convert types ensures safety
    df['fraud_score'] = pd.to_numeric(df['fraud_score'], errors='coerce')
    df['label'] = pd.to_numeric(df['label'], errors='coerce')
    
    if len(df) < min_samples:
        print(f"WARNING: Only {len(df)} samples, recommended minimum is {min_samples}")
    
    return df

def prepare_features(df):
    """Feature engineering for fraud detection."""
    df = df.copy()
    
    # Numeric features
    numeric_features = [
        'deposit_amount',
        'transaction_count_24hour', 'transaction_amount_24hour',
        'transaction_count_1week', 'transaction_amount_1week',
        'transaction_count_1month', 'transaction_amount_1month',
    ]
    
    # Velocity features
    df['amount_per_tx_24h'] = df['transaction_amount_24hour'] / (df['transaction_count_24hour'] + 1)
    df['amount_per_tx_1week'] = df['transaction_amount_1week'] / (df['transaction_count_1week'] + 1)
    df['amount_per_tx_1month'] = df['transaction_amount_1month'] / (df['transaction_count_1month'] + 1)
    
    df['tx_accel_week'] = df['transaction_count_1week'] / 7.0
    df['tx_accel_month'] = df['transaction_count_1month'] / 30.0
    
    df['amount_ratio_week_day'] = df['transaction_amount_1week'] / (df['transaction_amount_24hour'] + 1)
    df['amount_ratio_month_week'] = df['transaction_amount_1month'] / (df['transaction_amount_1week'] + 1)
    
    df['is_cross_border'] = (df['receiving_country'] != df['country_code']).astype(int)
    
    # One-hot encoding
    payment_dummies = pd.get_dummies(df['payment_method'], prefix='payment')
    df = pd.concat([df, payment_dummies], axis=1)
    
    country_dummies = pd.get_dummies(df['receiving_country'], prefix='country')
    df = pd.concat([df, country_dummies], axis=1)
    
    id_dummies = pd.get_dummies(df['id_type'], prefix='id_type')
    df = pd.concat([df, id_dummies], axis=1)
    
    df['stay_qualify_YES'] = (df['stay_qualify'] == 'YES').astype(int)
    
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
    
    X = df[feature_cols].fillna(0)
    
    # Ensure all columns are numeric (drop any remaining object columns)
    X = X.select_dtypes(include=[np.number])
    feature_cols = list(X.columns)
    
    y = df['fraud_score'].astype(float)
    
    return X, y, feature_cols

def train_model(X, y, feature_names):
    """Train XGBoost REGRESSION model."""
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Model parameters
    params = {
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1,
        'random_state': 42,
        'objective': 'reg:squarederror',
        'eval_metric': 'rmse'
    }
    
    print("\nTraining XGBoost Regression model...")
    model = xgb.XGBRegressor(**params)
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Evaluation
    y_pred = model.predict(X_test)
    y_pred = np.clip(y_pred, 0, 100)
    
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, accuracy_score
    
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Threshold classification for metrics
    y_test_labels = np.zeros(len(y_test))
    y_test_labels[y_test >= 60] = 1
    y_test_labels[y_test >= 90] = 2
    
    y_pred_labels = np.zeros(len(y_pred))
    y_pred_labels[y_pred >= 60] = 1
    y_pred_labels[y_pred >= 90] = 2
    
    threshold_accuracy = accuracy_score(y_test_labels, y_pred_labels)
    
    metrics = {
        'rmse': float(rmse),
        'mae': float(mae),
        'r2_score': float(r2),
        'threshold_accuracy': float(threshold_accuracy),
        'model_type': 'regression'
    }
    
    print(f"  RMSE: {rmse:.4f}, MAE: {mae:.4f}, R2: {r2:.4f}")
    
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    return model, metrics, params, feature_importance

def save_model(model, feature_names, feature_importance):
    """Save trained model locally."""
    current_dir = os.getcwd()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Ensure 'models' directory exists in current path
    model_dir = os.path.join(current_dir, "models", f"fraud_detection_{timestamp}")
    os.makedirs(model_dir, exist_ok=True)
    
    # Save model
    model_path = os.path.join(model_dir, "model.pkl")
    joblib.dump(model, model_path)
    
    # Save metadata
    with open(os.path.join(model_dir, "features.json"), 'w') as f:
        json.dump(feature_names, f, indent=2)
        
    feature_importance.to_csv(os.path.join(model_dir, "feature_importance.csv"), index=False)
    
    print(f"\n[LOCAL] Model saved to: {model_path}")
    
    # Symlink logic
    latest_link = os.path.join(current_dir, "models", "fraud_detection_latest")
    if os.path.exists(latest_link) or os.path.islink(latest_link):
        try:
            os.remove(latest_link) # Better than unlink for compatibility
        except:
            pass
            
    try:
        os.symlink(model_dir, latest_link)
        print(f"[LOCAL] Latest link updated: {latest_link}")
    except OSError:
        pass # Ignore symlink errors on Windows or restricted permissions
    
    return model_dir

def main():
    print("="*60)
    print("FRAUD DETECTION MODEL TRAINING")
    print("="*60)
    
    mlflow.set_tracking_uri("http://localhost:5000")
    mlflow.set_experiment("fraud-detection")
    
    try:
        df = fetch_training_data(days_back=7, min_samples=500)
        
        if df.empty or len(df) < 10:
            print("Not enough data to train.")
            return

        if df['label'].sum() == 0:
            print("WARNING: No fraud cases in training data.")
        
        X, y, feature_names = prepare_features(df)
        
        # Start MLflow run
        run_name = f"fraud_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with mlflow.start_run(run_name=run_name) as run:
            
            # Train
            model, metrics, params, feature_importance = train_model(X, y, feature_names)
            
            # --- SAFE MLFLOW LOGGING ---
            # We wrap this in try/except so if MLflow artifacts fail (due to /mlflow path issue),
            # the script DOES NOT crash and proceeds to save the model locally.
            try:
                # Log params (remove internal flags)
                model_type_log = metrics.pop('model_type', 'regression')
                mlflow.log_params(params)
                mlflow.log_param("num_features", len(feature_names))
                mlflow.log_param("model_type", model_type_log)
                
                # Log metrics
                mlflow.log_metrics(metrics)
                
                print("Logging artifacts to MLflow...")
                # 1. Log Model (handle potential path issues)
                mlflow.xgboost.log_model(model, artifact_path="model")
                
                # 2. Log Files
                feature_importance.to_csv("temp_feat_imp.csv", index=False)
                mlflow.log_artifact("temp_feat_imp.csv", artifact_path="analysis")
                os.remove("temp_feat_imp.csv")
                
                print(f"✓ MLflow Success. Run ID: {run.info.run_id}")
                
            except Exception as e:
                print("\n" + "!"*60)
                print(f"WARNING: MLflow Artifact Logging Failed.")
                print(f"Error: {e}")
                print("Likely cause: The MLflow server is pointing to a path (e.g., /mlflow) that is Read-Only on this Mac.")
                print("ACTION: Skipping MLflow artifact upload, but continuing to save LOCAL model.")
                print("!"*60 + "\n")
            
            # --- ALWAYS SAVE LOCAL MODEL ---
            model_dir = save_model(model, feature_names, feature_importance)
            
            print("\n" + "="*60)
            print("TRAINING COMPLETE!")
            print(f"Model directory: {model_dir}")
            print("="*60)

    except KeyboardInterrupt:
        print("\nTraining interrupted by user.")
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()