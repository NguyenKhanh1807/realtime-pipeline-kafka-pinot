"""
ML-based fraud detection module for real-time transaction processing.
Loads trained model and provides fraud scoring.
"""
import os
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLFraudDetector:
    """ML-based fraud detector using trained XGBoost model."""
    
    def __init__(self, model_dir: str = None):
        """
        Initialize ML fraud detector.
        
        Args:
            model_dir: Path to model directory (defaults to ../models/fraud_detection_latest)
        """
        self.model = None
        self.feature_names = []
        self.model_loaded = False
        
        # Default to models directory relative to this file
        if model_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_dir = os.path.join(base_dir, "models", "fraud_detection_latest")
        
        # Try to load model
        try:
            self._load_model(model_dir)
        except Exception as e:
            logger.warning(f"Could not load ML model: {e}")
            logger.warning("Falling back to rule-based detection")
    
    def _load_model(self, model_dir: str):
        """Load model and metadata from disk."""
        import joblib
        
        model_path = os.path.join(model_dir, "model.pkl")
        features_path = os.path.join(model_dir, "features.json")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        if not os.path.exists(features_path):
            raise FileNotFoundError(f"Features not found: {features_path}")
        
        # Load model
        self.model = joblib.load(model_path)
        logger.info(f"Loaded model from {model_path}")
        
        # Load feature names
        with open(features_path, 'r') as f:
            self.feature_names = json.load(f)
        logger.info(f"Loaded {len(self.feature_names)} features")
        
        self.model_loaded = True
    
    def _prepare_features(self, transaction: Dict[str, Any]) -> Dict[str, float]:
        """
        Extract and engineer features from transaction.
        
        Args:
            transaction: Transaction dictionary
        
        Returns:
            Dictionary of features
        """
        features = {}
        
        # Numeric features (direct)
        features['deposit_amount'] = float(transaction.get('deposit_amount', 0))
        features['transaction_count_24hour'] = float(transaction.get('transaction_count_24hour', 0))
        features['transaction_amount_24hour'] = float(transaction.get('transaction_amount_24hour', 0))
        features['transaction_count_1week'] = float(transaction.get('transaction_count_1week', 0))
        features['transaction_amount_1week'] = float(transaction.get('transaction_amount_1week', 0))
        features['transaction_count_1month'] = float(transaction.get('transaction_count_1month', 0))
        features['transaction_amount_1month'] = float(transaction.get('transaction_amount_1month', 0))
        
        # Engineered features
        tx_24h = max(features['transaction_count_24hour'], 1)
        tx_week = max(features['transaction_count_1week'], 1)
        tx_month = max(features['transaction_count_1month'], 1)
        
        features['amount_per_tx_24h'] = features['transaction_amount_24hour'] / tx_24h
        features['amount_per_tx_1week'] = features['transaction_amount_1week'] / tx_week
        features['amount_per_tx_1month'] = features['transaction_amount_1month'] / tx_month
        
        features['tx_accel_week'] = features['transaction_count_1week'] / 7.0
        features['tx_accel_month'] = features['transaction_count_1month'] / 30.0
        
        amt_24h = max(features['transaction_amount_24hour'], 1)
        amt_week = max(features['transaction_amount_1week'], 1)
        
        features['amount_ratio_week_day'] = features['transaction_amount_1week'] / amt_24h
        features['amount_ratio_month_week'] = features['transaction_amount_1month'] / amt_week
        
        # Cross-border
        receiving = transaction.get('receiving_country', '')
        country = transaction.get('country_code', '')
        features['is_cross_border'] = 1.0 if receiving != country else 0.0
        
        # Stay qualify
        features['stay_qualify_YES'] = 1.0 if transaction.get('stay_qualify') == 'YES' else 0.0
        
        # Payment method (one-hot)
        payment_method = transaction.get('payment_method', 'UNKNOWN')
        for pm in ['CASH', 'CARD', 'BANK', 'WALLET', 'CRYPTO']:
            features[f'payment_{pm}'] = 1.0 if payment_method == pm else 0.0
        
        # Country (one-hot for common countries)
        for country_code in ['VN', 'KR', 'JP', 'SG', 'US', 'CN']:
            features[f'country_{country_code}'] = 1.0 if receiving == country_code else 0.0
        
        # ID type (one-hot)
        id_type = transaction.get('id_type', 'UNKNOWN')
        for it in ['ID', 'PASSPORT', 'DL']:
            features[f'id_type_{it}'] = 1.0 if id_type == it else 0.0
        
        return features
    
    def predict_fraud_score(self, transaction: Dict[str, Any]) -> Tuple[float, int]:
        """
        Predict fraud probability for a transaction.
        
        Args:
            transaction: Transaction dictionary
        
        Returns:
            Tuple of (fraud_score, label) where score is 0-1 and label is 0 or 1
        """
        if not self.model_loaded:
            # Fall back to rule-based if model not loaded
            return self._rule_based_score(transaction)
        
        try:
            # Prepare features
            feature_dict = self._prepare_features(transaction)
            
            # Create feature vector (ensure all features present)
            feature_vector = []
            for feat_name in self.feature_names:
                feature_vector.append(feature_dict.get(feat_name, 0.0))
            
            # Convert to DataFrame for prediction
            X = pd.DataFrame([feature_vector], columns=self.feature_names)
            
            # Predict fraud score (regression model outputs 0-100 score, normalized to 0-1)
            fraud_score = self.model.predict(X)[0]
            # Ensure score is in 0-1 range (model outputs 0-100, normalize it)
            fraud_score_normalized = fraud_score / 100.0 if fraud_score > 1.0 else fraud_score
            
            # Apply thresholds to determine label
            # 0-60: Normal (0), 60-90: Warning (1), 90+: Banned (2)
            if fraud_score < 60:
                label = 0
            elif fraud_score < 90:
                label = 1
            else:
                label = 2
            
            return float(fraud_score_normalized), int(label)
            
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            # Fall back to rule-based
            return self._rule_based_score(transaction)
    
    def _rule_based_score(self, transaction: Dict[str, Any]) -> Tuple[float, int]:
        """
        Fallback rule-based fraud scoring.
        
        Args:
            transaction: Transaction dictionary
        
        Returns:
            Tuple of (fraud_score, label)
        """
        score = 0.0
        
        # High velocity
        if transaction.get('transaction_amount_24hour', 0) > 20000:
            score += 0.30
        elif transaction.get('transaction_amount_24hour', 0) > 10000:
            score += 0.15
        
        if transaction.get('transaction_amount_1week', 0) > 50000:
            score += 0.25
        elif transaction.get('transaction_amount_1week', 0) > 30000:
            score += 0.10
        
        if transaction.get('transaction_amount_1month', 0) > 150000:
            score += 0.20
        
        # High frequency
        if transaction.get('transaction_count_24hour', 0) > 80:
            score += 0.25
        elif transaction.get('transaction_count_24hour', 0) > 60:
            score += 0.10
        
        # Payment method
        payment = transaction.get('payment_method', '')
        if payment == 'CRYPTO':
            score += 0.20
        elif payment == 'WALLET':
            score += 0.10
        
        # Cross-border
        if transaction.get('receiving_country') != transaction.get('country_code'):
            score += 0.15
        
        # Large amount
        amount = transaction.get('deposit_amount', 0)
        if amount > 950:
            score += 0.15
        elif amount > 900:
            score += 0.05
        
        # High overall counts
        if transaction.get('transaction_count_1week', 0) > 150:
            score += 0.15
        if transaction.get('transaction_count_1month', 0) > 250:
            score += 0.10
        
        score = min(score, 1.0)
        label = 1 if score >= 0.6 else 0
        
        return score, label

# Global instance
_detector = None

def get_detector() -> MLFraudDetector:
    """Get or create global ML fraud detector instance."""
    global _detector
    if _detector is None:
        _detector = MLFraudDetector()
    return _detector
