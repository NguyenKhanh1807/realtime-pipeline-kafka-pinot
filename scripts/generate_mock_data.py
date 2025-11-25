#!/usr/bin/env python3
"""
Generate realistic mock transaction data with temporal spending patterns
- Weekends: Higher spending (20-30% more)
- Weekdays: Normal spending
- Time-based patterns:
  - Night (0-6 AM): Very low activity, small amounts
  - Morning (6-9 AM): Low activity, medium amounts
  - Business hours (9-17): High activity, varied amounts
  - Evening (17-22): Peak activity, higher amounts
  - Late night (22-24): Low activity, small amounts
"""

import json
import random
from datetime import datetime, timedelta
from kafka import KafkaProducer
import time

# Configuration
KAFKA_BROKER = 'localhost:9092'
KAFKA_TOPIC = 'transactions_rt'
DAYS_TO_GENERATE = 14  # 2 weeks of data
FRAUD_RATE = 0.15  # 15% fraud rate

# Time-based transaction patterns (transactions per hour ranges)
TIME_PATTERNS = {
    'night': {'hours': range(0, 6), 'tx_min': 5, 'tx_max': 15, 'amount_multiplier': 0.6},
    'early_morning': {'hours': range(6, 9), 'tx_min': 20, 'tx_max': 40, 'amount_multiplier': 0.8},
    'business': {'hours': range(9, 17), 'tx_min': 80, 'tx_max': 150, 'amount_multiplier': 1.0},
    'evening': {'hours': range(17, 22), 'tx_min': 100, 'tx_max': 200, 'amount_multiplier': 1.3},
    'late_night': {'hours': range(22, 24), 'tx_min': 15, 'tx_max': 30, 'amount_multiplier': 0.7}
}

# Day-based patterns
DAY_MULTIPLIERS = {
    0: 0.9,   # Monday
    1: 0.95,  # Tuesday
    2: 1.0,   # Wednesday
    3: 1.05,  # Thursday
    4: 1.15,  # Friday
    5: 1.3,   # Saturday
    6: 1.25   # Sunday
}

# Countries and payment methods
COUNTRIES = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'SG', 'CN', 'IN']
PAYMENT_METHODS = ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'crypto']
ID_TYPES = ['passport', 'driver_license', 'national_id']

def get_time_pattern(hour):
    """Get transaction pattern for given hour"""
    for pattern_name, pattern in TIME_PATTERNS.items():
        if hour in pattern['hours']:
            return pattern
    return TIME_PATTERNS['business']

def generate_transaction(user_seq, timestamp):
    """Generate a single transaction with realistic patterns"""
    hour = timestamp.hour
    day_of_week = timestamp.weekday()
    
    # Get time pattern
    pattern = get_time_pattern(hour)
    
    # Calculate amount based on time and day
    base_amount = random.uniform(10, 500)
    time_multiplier = pattern['amount_multiplier']
    day_multiplier = DAY_MULTIPLIERS[day_of_week]
    
    # Weekend spending tends to be on different categories (entertainment, dining)
    if day_of_week >= 5:  # Weekend
        if random.random() > 0.3:
            base_amount = random.uniform(50, 800)  # Higher amounts on weekends
    
    # Late night transactions tend to be smaller (convenience stores, fast food)
    if hour in range(22, 24) or hour in range(0, 6):
        base_amount = min(base_amount, random.uniform(10, 100))
    
    amount_24h = base_amount * time_multiplier * day_multiplier
    
    # Generate related amounts for different time windows
    amount_1w = amount_24h * random.uniform(5, 8)
    amount_1m = amount_24h * random.uniform(20, 30)
    
    # Transaction counts (more activity during peak times)
    tx_count_24h = random.randint(1, 10) if hour in range(9, 22) else random.randint(1, 3)
    tx_count_1w = tx_count_24h * random.randint(5, 10)
    tx_count_1m = tx_count_1w * random.randint(4, 6)
    
    # Fraud detection (higher at night, weekends)
    fraud_probability = FRAUD_RATE
    if hour in range(0, 6) or hour in range(22, 24):
        fraud_probability *= 1.5  # 50% more fraud at night
    if day_of_week >= 5:
        fraud_probability *= 1.2  # 20% more fraud on weekends
    
    is_fraud = random.random() < fraud_probability
    fraud_score = random.uniform(0.7, 0.95) if is_fraud else random.uniform(0.05, 0.45)
    
    # Generate transaction
    transaction = {
        'transaction_seq': random.randint(1000000, 9999999),
        'user_seq': user_seq,
        'receiving_country': random.choice(COUNTRIES),
        'country_code': random.choice(COUNTRIES),
        'id_type': random.choice(ID_TYPES),
        'stay_qualify': random.choice(['yes', 'no']),
        'visa_expire_date': (timestamp + timedelta(days=random.randint(30, 365))).strftime('%Y-%m-%d'),
        'user_name': f'user_{user_seq}',
        'payment_method': random.choice(PAYMENT_METHODS),
        'register_date': (timestamp - timedelta(days=random.randint(30, 365))).strftime('%Y-%m-%d'),
        'first_transaction_date': (timestamp - timedelta(days=random.randint(1, 180))).strftime('%Y-%m-%d'),
        'birth_date': (timestamp - timedelta(days=random.randint(6570, 21900))).strftime('%Y-%m-%d'),
        'create_dt': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        'transaction_amount_24hour': round(amount_24h, 2),
        'transaction_amount_1week': round(amount_1w, 2),
        'transaction_amount_1month': round(amount_1m, 2),
        'transaction_count_24hour': tx_count_24h,
        'transaction_count_1week': tx_count_1w,
        'transaction_count_1month': tx_count_1m,
        'label': 1 if is_fraud else 0,
        'fraud_score': round(fraud_score, 4)
    }
    
    return transaction

def main():
    print("=" * 60)
    print("Generating Mock Transaction Data with Realistic Patterns")
    print("=" * 60)
    print(f"Days to generate: {DAYS_TO_GENERATE}")
    print(f"Fraud rate: {FRAUD_RATE * 100}%")
    print()
    
    # Initialize Kafka producer
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    
    # Start from 14 days ago at midnight
    now = datetime.now()
    start_time = (now - timedelta(days=DAYS_TO_GENERATE)).replace(hour=0, minute=0, second=0, microsecond=0)
    current_time = start_time
    
    # End at 23:59:59 yesterday to ensure we have complete 24-hour data for all days
    yesterday_end = (now - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=0)
    end_time = yesterday_end
    
    total_transactions = 0
    fraud_count = 0
    day_stats = {}
    
    print("Generating transactions...")
    print(f"Time range: {start_time} to {end_time}")
    print()
    
    while current_time <= end_time:
        hour = current_time.hour
        day_of_week = current_time.weekday()
        day_name = current_time.strftime('%A')
        
        # Get pattern for this hour
        pattern = get_time_pattern(hour)
        day_multiplier = DAY_MULTIPLIERS[day_of_week]
        
        # Calculate number of transactions for this hour
        tx_count = int((random.randint(pattern['tx_min'], pattern['tx_max']) * day_multiplier))
        
        # Generate transactions for this hour
        for _ in range(tx_count):
            user_seq = random.randint(1, 100)  # 100 unique users
            
            # Random timestamp within this hour
            minute_offset = random.randint(0, 59)
            second_offset = random.randint(0, 59)
            tx_time = current_time + timedelta(minutes=minute_offset, seconds=second_offset)
            
            # Skip if transaction time exceeds end_time
            if tx_time > end_time:
                continue
            
            transaction = generate_transaction(user_seq, tx_time)
            
            # Send to Kafka
            producer.send(KAFKA_TOPIC, value=transaction)
            
            total_transactions += 1
            if transaction['label'] == 1:
                fraud_count += 1
            
            # Track daily stats
            date_key = tx_time.strftime('%Y-%m-%d')
            if date_key not in day_stats:
                day_stats[date_key] = {'count': 0, 'amount': 0, 'fraud': 0}
            day_stats[date_key]['count'] += 1
            day_stats[date_key]['amount'] += transaction['transaction_amount_24hour']
            day_stats[date_key]['fraud'] += transaction['label']
        
        # Progress update
        if current_time.hour == 0:
            print(f"Generated {day_name} {current_time.strftime('%Y-%m-%d')}: {tx_count} tx/hour (avg)")
        
        # Move to next hour
        current_time += timedelta(hours=1)
        
        # Small delay to avoid overwhelming Kafka
        if total_transactions % 1000 == 0:
            producer.flush()
            time.sleep(0.1)
    
    # Final flush
    producer.flush()
    producer.close()
    
    print()
    print("=" * 60)
    print("Generation Complete!")
    print("=" * 60)
    print(f"Total transactions: {total_transactions:,}")
    print(f"Fraud transactions: {fraud_count:,} ({fraud_count/total_transactions*100:.1f}%)")
    print()
    
    print("Daily Summary:")
    print("-" * 60)
    print(f"{'Date':<12} {'Day':<10} {'Count':>8} {'Avg Amount':>12} {'Fraud':>8}")
    print("-" * 60)
    
    for date_key in sorted(day_stats.keys()):
        stats = day_stats[date_key]
        dt = datetime.strptime(date_key, '%Y-%m-%d')
        day_name = dt.strftime('%A')
        avg_amount = stats['amount'] / stats['count']
        print(f"{date_key:<12} {day_name:<10} {stats['count']:>8,} ${avg_amount:>11.2f} {stats['fraud']:>8}")
    
    print("-" * 60)
    print()
    print("Data has been sent to Kafka topic:", KAFKA_TOPIC)
    print("Wait a few moments for Pinot to ingest the data.")
    print()

if __name__ == '__main__':
    main()
