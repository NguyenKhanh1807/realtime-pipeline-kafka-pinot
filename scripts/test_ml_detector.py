#!/usr/bin/env python3
"""
Test script for ML fraud detector.
Tests both ML-based and rule-based fraud detection.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawl_data.ml_fraud_detector import get_detector

def test_transactions():
    """Test fraud detection on sample transactions."""
    
    detector = get_detector()
    
    print("="*60)
    print("ML FRAUD DETECTOR TEST")
    print("="*60)
    print(f"\nModel loaded: {detector.model_loaded}")
    if detector.model_loaded:
        print(f"Number of features: {len(detector.feature_names)}")
    print()
    
    # Test cases
    test_cases = [
        {
            "name": "Normal transaction",
            "transaction": {
                "deposit_amount": 250.00,
                "transaction_count_24hour": 3,
                "transaction_amount_24hour": 500,
                "transaction_count_1week": 15,
                "transaction_amount_1week": 2000,
                "transaction_count_1month": 50,
                "transaction_amount_1month": 8000,
                "payment_method": "CARD",
                "receiving_country": "VN",
                "country_code": "VN",
                "stay_qualify": "YES",
                "id_type": "ID"
            },
            "expected": "NORMAL"
        },
        {
            "name": "High velocity fraud",
            "transaction": {
                "deposit_amount": 950.00,
                "transaction_count_24hour": 85,
                "transaction_amount_24hour": 25000,
                "transaction_count_1week": 160,
                "transaction_amount_1week": 60000,
                "transaction_count_1month": 280,
                "transaction_amount_1month": 180000,
                "payment_method": "CRYPTO",
                "receiving_country": "US",
                "country_code": "VN",
                "stay_qualify": "NO",
                "id_type": "PASSPORT"
            },
            "expected": "FRAUD"
        },
        {
            "name": "Cross-border transaction",
            "transaction": {
                "deposit_amount": 750.00,
                "transaction_count_24hour": 5,
                "transaction_amount_24hour": 2000,
                "transaction_count_1week": 25,
                "transaction_amount_1week": 8000,
                "transaction_count_1month": 80,
                "transaction_amount_1month": 25000,
                "payment_method": "WALLET",
                "receiving_country": "SG",
                "country_code": "VN",
                "stay_qualify": "YES",
                "id_type": "ID"
            },
            "expected": "SUSPICIOUS"
        },
        {
            "name": "Large amount transaction",
            "transaction": {
                "deposit_amount": 980.00,
                "transaction_count_24hour": 2,
                "transaction_amount_24hour": 1500,
                "transaction_count_1week": 10,
                "transaction_amount_1week": 6000,
                "transaction_count_1month": 35,
                "transaction_amount_1month": 18000,
                "payment_method": "BANK",
                "receiving_country": "VN",
                "country_code": "VN",
                "stay_qualify": "YES",
                "id_type": "ID"
            },
            "expected": "SUSPICIOUS"
        },
        {
            "name": "CRYPTO payment",
            "transaction": {
                "deposit_amount": 500.00,
                "transaction_count_24hour": 8,
                "transaction_amount_24hour": 3000,
                "transaction_count_1week": 30,
                "transaction_amount_1week": 12000,
                "transaction_count_1month": 90,
                "transaction_amount_1month": 35000,
                "payment_method": "CRYPTO",
                "receiving_country": "VN",
                "country_code": "VN",
                "stay_qualify": "YES",
                "id_type": "ID"
            },
            "expected": "SUSPICIOUS"
        }
    ]
    
    # Run tests
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test_case['name']}")
        print("-" * 60)
        
        transaction = test_case['transaction']
        expected = test_case['expected']
        
        # Get prediction
        fraud_score, label = detector.predict_fraud_score(transaction)
        
        # Determine category
        if label == 0:
            category = "NORMAL"
        elif fraud_score >= 0.8:
            category = "FRAUD (HIGH)"
        elif fraud_score >= 0.5:
            category = "FRAUD (MEDIUM)"
        else:
            category = "SUSPICIOUS"
        
        # Print results
        print(f"Fraud Score: {fraud_score:.4f}")
        print(f"Label: {label} ({'FRAUD' if label == 1 else 'NORMAL'})")
        print(f"Category: {category}")
        print(f"Expected: {expected}")
        
        # Key risk factors
        print("\nKey Factors:")
        if transaction['payment_method'] == 'CRYPTO':
            print("  • High-risk payment method (CRYPTO)")
        if transaction['receiving_country'] != transaction['country_code']:
            print(f"  • Cross-border ({transaction['country_code']} → {transaction['receiving_country']})")
        if transaction['deposit_amount'] > 900:
            print(f"  • Large amount (${transaction['deposit_amount']:.2f})")
        if transaction['transaction_count_24hour'] > 50:
            print(f"  • High frequency ({transaction['transaction_count_24hour']} tx/day)")
        if transaction['transaction_amount_24hour'] > 10000:
            print(f"  • High daily volume (${transaction['transaction_amount_24hour']:,.2f}/day)")
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)
    print("\nNote: Scores may vary if ML model is loaded vs rule-based fallback")
    print("Train a model first using: python scripts/train_fraud_model.py")

if __name__ == "__main__":
    test_transactions()
