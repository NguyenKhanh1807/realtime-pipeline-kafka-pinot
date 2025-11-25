import json, os, time, random, logging, sys
from datetime import datetime, timedelta, date
from typing import Dict, Tuple, List
from faker import Faker
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db_session
from app.models_transaction_user import TransactionUser

TOPIC_RAW   = os.getenv("TOPIC_RAW", "transactions_raw")  # Producer sends to raw, processor cleans to transactions_rt
BOOTSTRAP   = os.getenv("BOOTSTRAP_SERVERS", "localhost:9092")  # Use localhost for external access
INTERVAL    = int(os.getenv("INTERVAL_SEC", "5"))
START_SEQ   = int(os.getenv("START_SEQ", "1"))
SIMULATION_MODE = os.getenv("SIMULATION_MODE", "auto")  # auto, peak, normal, low, night
HISTORICAL_DAYS = int(os.getenv("HISTORICAL_DAYS", "0"))  # Generate data for N days in past (0=realtime only)
GENERATE_WITH_SCORES = os.getenv("GENERATE_WITH_SCORES", "False").lower() in ("true", "1", "yes")  # Generate with predefined scores
SCORE_MIN   = int(os.getenv("SCORE_MIN", "0"))  # Minimum fraud score (0-100)
SCORE_MAX   = int(os.getenv("SCORE_MAX", "100"))  # Maximum fraud score (0-100)
SEED        = os.getenv("SEED")

# Status file for tracking progress
BASE_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUS_FILE = os.path.join(BASE_PATH, "logs", "producer_status.json")

def _update_status_file(seq: int, total_count: int, fraud_count: int):
    """Update status file with current progress."""
    try:
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        status_data = {
            "pid": os.getpid(),
            "last_sequence": seq,
            "records_generated": total_count,
            "fraud_count": fraud_count,
            "updated_at": datetime.utcnow().isoformat(),
            "simulation_mode": SIMULATION_MODE,
            "interval_seconds": INTERVAL,
            "generate_with_scores": GENERATE_WITH_SCORES,
            "score_min": SCORE_MIN,
            "score_max": SCORE_MAX
        }
        with open(STATUS_FILE, 'w') as f:
            json.dump(status_data, f)
    except Exception as e:
        logging.warning(f"Failed to update status file: {e}")

if SEED: random.seed(int(SEED))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
fake = Faker()

COUNTRIES = ["US", "GB", "VN", "JP", "KR", "SG", "CN", "IN", "AU", "CA", 
             "DE", "FR", "IT", "ES", "BR", "MX", "TH", "ID", "MY", "PH"]
ID_TYPES  = ["ID", "PASSPORT", "DL"]
PAYMENT_METHODS = ["CASH", "CARD", "BANK", "WALLET", "CRYPTO"]

# Cache for users loaded from database
_USER_CACHE = []

def _load_users_from_db() -> List[Dict]:
    """Load all users from PostgreSQL database."""
    global _USER_CACHE
    if _USER_CACHE:
        return _USER_CACHE
    
    try:
        with db_session() as session:
            users = session.query(TransactionUser).all()
            _USER_CACHE = [user.to_dict() for user in users]
            logging.info(f"Loaded {len(_USER_CACHE)} users from database")
            return _USER_CACHE
    except Exception as e:
        logging.error(f"Failed to load users from database: {e}")
        logging.warning("Falling back to random user generation")
        return []

def _get_random_user() -> Dict:
    """Get a random user from the cached user list."""
    if not _USER_CACHE:
        _load_users_from_db()
    
    if _USER_CACHE:
        return random.choice(_USER_CACHE)
    else:
        # Fallback to random generation if database is not available
        return {
            'user_seq': random.randint(1_000_000, 9_999_999),
            'user_name': fake.name(),
            'country_code': random.choice(COUNTRIES),
            'id_type': random.choice(ID_TYPES),
            'birth_date': _rand_date(date(1960,1,1), date(2005,12,31)),
            'register_date': _rand_date(date(1990,1,1), date.today()),
            'first_transaction_date': _rand_date(date(1990,1,1), date.today())
        }

def _rand_date(start: date, end: date) -> str:
    days = max((end - start).days, 0)
    d = start + timedelta(days=random.randint(0, days))
    return d.strftime("%Y-%m-%d")

def _maybe_bad_timestamp(custom_datetime=None) -> str:
    """Cố ý dùng vài format khác nhau để Processor phải chuẩn hoá."""
    now = custom_datetime if custom_datetime else datetime.utcnow()
    choice = random.random()
    if choice < 0.6:
        return now.strftime("%Y-%m-%d %H:%M:%S")      # format chuẩn Pinot
    elif choice < 0.8:
        return now.isoformat()                        # ISO 8601
    else:
        return now.strftime("%d/%m/%Y %H:%M:%S")      # dd/MM/yyyy HH:mm:ss

def _generate_fraud_case(user: Dict, seq: int, custom_datetime=None) -> Dict:
    """Generate a realistic fraud transaction with high-risk patterns."""
    # Fraud patterns: high velocity, cross-border, large amounts, crypto
    fraud_patterns = random.choice([
        'high_velocity',      # Many transactions in short time
        'cross_border',       # International transfers
        'large_amount',       # Unusually large transaction
        'crypto_suspicious',  # Crypto payment with high velocity
        'mixed_pattern'       # Combination of patterns
    ])
    
    receiving_country = user['country_code']
    payment_method = random.choice(PAYMENT_METHODS)
    deposit_amount = round(random.uniform(0, 1000), 2)
    
    # Base normal patterns
    tx_count_24h = random.randint(1, 10)
    tx_amount_24h = random.randint(100, 5000)
    tx_count_week = random.randint(5, 40)
    tx_amount_week = random.randint(500, 15000)
    tx_count_month = random.randint(20, 110)
    tx_amount_month = random.randint(2000, 40000)
    
    # Apply fraud patterns
    if fraud_patterns == 'high_velocity':
        # High transaction frequency
        tx_count_24h = random.randint(50, 120)  # 50-120 tx/day (very high)
        tx_amount_24h = random.randint(20000, 50000)  # $20K-$50K/day
        tx_count_week = random.randint(200, 500)
        tx_amount_week = random.randint(100000, 250000)
        deposit_amount = round(random.uniform(800, 1000), 2)  # Large individual amount
        
    elif fraud_patterns == 'cross_border':
        # Cross-border to high-risk country
        receiving_country = random.choice([c for c in COUNTRIES if c != user['country_code']])
        deposit_amount = round(random.uniform(700, 1000), 2)
        tx_count_24h = random.randint(30, 80)
        tx_amount_24h = random.randint(15000, 35000)
        
    elif fraud_patterns == 'large_amount':
        # Unusually large amounts
        deposit_amount = round(random.uniform(950, 1000), 2)  # Near max limit
        tx_amount_24h = random.randint(30000, 60000)
        tx_amount_week = random.randint(150000, 300000)
        tx_amount_month = random.randint(500000, 1000000)
        
    elif fraud_patterns == 'crypto_suspicious':
        # Crypto with high velocity
        payment_method = 'CRYPTO'
        tx_count_24h = random.randint(40, 90)
        tx_amount_24h = random.randint(25000, 45000)
        deposit_amount = round(random.uniform(600, 1000), 2)
        receiving_country = random.choice([c for c in COUNTRIES if c != user['country_code']])
        
    else:  # mixed_pattern
        # Combination of suspicious patterns
        payment_method = random.choice(['CRYPTO', 'WALLET'])
        receiving_country = random.choice([c for c in COUNTRIES if c != user['country_code']])
        tx_count_24h = random.randint(60, 100)
        tx_amount_24h = random.randint(35000, 55000)
        tx_count_week = random.randint(250, 400)
        tx_amount_week = random.randint(150000, 280000)
        deposit_amount = round(random.uniform(850, 1000), 2)
    
    return {
        "transaction_seq": seq,
        "user_seq": user['user_seq'],
        "receiving_country": receiving_country,
        "country_code": user['country_code'],
        "id_type": user['id_type'],
        "stay_qualify": random.choice(["YES", "NO"]),
        "visa_expire_date": _rand_date(date.today(), date.today() + timedelta(days=365)),
        "user_name": user['user_name'],
        "payment_method": payment_method,
        "autodebit_account": round(random.uniform(0.0, 1.0), 6),
        "register_date": user['register_date'],
        "first_transaction_date": user['first_transaction_date'],
        "birth_date": user['birth_date'],
        "recheck_date": _rand_date(date(1990,1,1), date.today()),
        "invite_code": fake.bothify(text="INV-####"),
        "face_pin_date": _rand_date(date(1990,1,1), date.today()),
        "transaction_count_24hour": tx_count_24h,
        "transaction_amount_24hour": tx_amount_24h,
        "transaction_count_1week": tx_count_week,
        "transaction_amount_1week": tx_amount_week,
        "transaction_count_1month": tx_count_month,
        "transaction_amount_1month": tx_amount_month,
        "label": 0,  # Processor will assign based on risk score (should be 1)
        "create_dt": _maybe_bad_timestamp(custom_datetime),
        "deposit_amount": deposit_amount,
        "_fraud_pattern": fraud_patterns  # For debugging, will be ignored by Pinot
    }

def _base_raw(seq: int, custom_datetime=None) -> Dict:
    """Generate a transaction - can be normal or fraud based on probability."""
    # Get a real user from the database
    user = _get_random_user()
    
    # If generating with predefined scores, create transaction with random score
    if GENERATE_WITH_SCORES:
        # Random fraud score within configured range
        fraud_score = random.randint(SCORE_MIN, SCORE_MAX)
        fraud_score_normalized = fraud_score / 100.0  # Convert to 0.0-1.0 range
        
        # Label based on score thresholds:
        # 2 = BANNED (score > 90)
        # 1 = WARNING (score 60-90)
        # 0 = NORMAL (score < 60)
        if fraud_score > 90:
            label = 2  # Banned
        elif fraud_score >= 60:
            label = 1  # Warning
        else:
            label = 0  # Normal
        
        logging.info(f"Generated predefined score: {fraud_score} (range: {SCORE_MIN}-{SCORE_MAX}) -> label: {label}")
        
        # Generate transaction amounts and patterns based on score
        if fraud_score >= 80:  # Very high risk
            deposit_amount = round(random.uniform(800, 1000), 2)
            tx_count_24h = random.randint(50, 100)
            tx_amount_24h = random.randint(15000, 30000)
        elif fraud_score >= 60:  # High risk
            deposit_amount = round(random.uniform(600, 900), 2)
            tx_count_24h = random.randint(30, 60)
            tx_amount_24h = random.randint(10000, 20000)
        elif fraud_score >= 40:  # Medium risk
            deposit_amount = round(random.uniform(300, 700), 2)
            tx_count_24h = random.randint(15, 40)
            tx_amount_24h = random.randint(5000, 12000)
        else:  # Low risk
            deposit_amount = round(random.uniform(0, 400), 2)
            tx_count_24h = random.randint(1, 20)
            tx_amount_24h = random.randint(100, 8000)
        
        rec = {
            "transaction_seq": seq,
            "user_seq": user['user_seq'],
            "receiving_country": random.choice(COUNTRIES),
            "country_code": user['country_code'],
            "id_type": user['id_type'],
            "stay_qualify": random.choice(["YES", "NO"]),
            "visa_expire_date": _rand_date(date.today(), date.today() + timedelta(days=365)),
            "user_name": user['user_name'],
            "payment_method": random.choice(PAYMENT_METHODS),
            "autodebit_account": round(random.uniform(0.0, 1.0), 6),
            "register_date": user['register_date'],
            "first_transaction_date": user['first_transaction_date'],
            "birth_date": user['birth_date'],
            "recheck_date": _rand_date(date(1990,1,1), date.today()),
            "invite_code": fake.bothify(text="INV-####"),
            "face_pin_date": _rand_date(date(1990,1,1), date.today()),
            "transaction_count_24hour": tx_count_24h,
            "transaction_amount_24hour": tx_amount_24h,
            "transaction_count_1week": tx_count_24h * 5,
            "transaction_amount_1week": tx_amount_24h * 4,
            "transaction_count_1month": tx_count_24h * 20,
            "transaction_amount_1month": tx_amount_24h * 15,
            "label": label,
            "fraud_score": fraud_score_normalized,  # Predefined score 0.0-1.0
            "create_dt": _maybe_bad_timestamp(custom_datetime),
            "deposit_amount": deposit_amount,
        }
        return rec
    
    # 15% chance of generating a fraud case
    if random.random() < 0.15:
        return _generate_fraud_case(user, seq, custom_datetime)
    
    # Normal transaction
    deposit_amount = round(random.uniform(0, 1000), 2)
    
    # đôi khi cố ý để thiếu/trật type vài field để Kafka Processor sửa
    rec = {
        "transaction_seq": seq,
        "user_seq": user['user_seq'],
        "receiving_country": random.choice(COUNTRIES),
        "country_code": user['country_code'],
        "id_type": user['id_type'],
        "stay_qualify": random.choice(["YES", "NO"]),
        "visa_expire_date": _rand_date(date.today(), date.today() + timedelta(days=365)),
        "user_name": user['user_name'],
        "payment_method": random.choice(PAYMENT_METHODS),
        "autodebit_account": round(random.uniform(0.0, 1.0), 6),
        "register_date": user['register_date'],
        "first_transaction_date": user['first_transaction_date'],
        "birth_date": user['birth_date'],
        "recheck_date": _rand_date(date(1990,1,1), date.today()),
        "invite_code": fake.bothify(text="INV-####"),
        "face_pin_date": _rand_date(date(1990,1,1), date.today()),
        # Normal transaction patterns for $0-$1000 transactions
        "transaction_count_24hour": random.randint(1, 15),  # 1-15 transactions/day (normal)
        "transaction_amount_24hour": random.randint(100, 8000),  # $100-$8K/day
        "transaction_count_1week": random.randint(5, 60),  # 5-60 transactions/week
        "transaction_amount_1week": random.randint(500, 25000),  # $500-$25K/week
        "transaction_count_1month": random.randint(20, 150),  # 20-150 transactions/month
        "transaction_amount_1month": random.randint(2000, 70000),  # $2K-$70K/month
        "label": 0,  # Processor will assign based on risk score
        "create_dt": _maybe_bad_timestamp(custom_datetime),  # format lẫn lộn để Processor chuẩn hoá
        "deposit_amount": deposit_amount,  # Amount between $0-$1000
    }

    # 10% cố ý làm bẩn: thiếu field, type sai
    r = random.random()
    if r < 0.05:
        rec.pop("country_code", None)  # thiếu field
    elif r < 0.10:
        rec["transaction_amount_24hour"] = str(rec["transaction_amount_24hour"])  # sai type

    return rec

def _init_producer():
    for i in range(30):
        try:
            return KafkaProducer(
                bootstrap_servers=BOOTSTRAP,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                acks="all", retries=3, linger_ms=0
            )
        except NoBrokersAvailable as e:
            logging.warning(f"Kafka not ready ({e}), retry {i+1}/30 ...")
            time.sleep(2)
    raise RuntimeError("Kafka not ready")

def _get_time_based_transaction_rate() -> Tuple[int, int, float]:
    """
    Calculate realistic transaction generation rate based on current hour or simulation mode.
    Returns: (min_batch, max_batch, sleep_time)
    
    Simulation modes:
    - auto: Use actual time-based patterns
    - peak: Simulate peak business hours (9-5 pattern)
    - normal: Moderate consistent activity
    - low: Low consistent activity
    - night: Night-time low activity
    
    Time patterns (auto mode):
    - Night (0-5): Very low activity (1-2 tx/batch, 2-3s sleep)
    - Early morning (6-8): Low activity (2-4 tx/batch, 1.5s sleep)
    - Business hours (9-17): High activity (5-15 tx/batch, 0.5s sleep)
    - Evening (18-22): Medium activity (3-8 tx/batch, 1s sleep)
    - Late night (23): Low activity (1-3 tx/batch, 2s sleep)
    """
    # Check for manual simulation mode override
    if SIMULATION_MODE == "peak":
        # Simulate peak business hours
        return (8, 15, 0.5)
    elif SIMULATION_MODE == "normal":
        # Moderate consistent activity
        return (4, 8, 1.0)
    elif SIMULATION_MODE == "low":
        # Low consistent activity
        return (2, 4, 1.5)
    elif SIMULATION_MODE == "night":
        # Night-time low activity
        return (1, 2, 2.5)
    
    # Default: auto mode - use actual time
    current_hour = datetime.now().hour
    
    if 0 <= current_hour < 6:
        # Night: Very low activity
        return (1, 2, 2.5)
    elif 6 <= current_hour < 9:
        # Early morning: Gradually increasing
        return (2, 5, 1.5)
    elif 9 <= current_hour < 12:
        # Morning business hours: Peak activity
        return (8, 15, 0.5)
    elif 12 <= current_hour < 14:
        # Lunch time: Slightly reduced
        return (5, 10, 0.8)
    elif 14 <= current_hour < 18:
        # Afternoon business hours: High activity
        return (7, 13, 0.6)
    elif 18 <= current_hour < 22:
        # Evening: Moderate activity
        return (3, 8, 1.0)
    else:  # 22-23
        # Late night: Decreasing activity
        return (1, 3, 2.0)

def _generate_historical_data(producer, start_seq: int, days: int):
    """Generate historical data for the past N days."""
    logging.info(f"📅 Generating historical data for the past {days} days...")
    
    seq = start_seq
    fraud_count = 0
    total_count = 0
    
    # Generate data for each day in the past
    for day_offset in range(days, 0, -1):
        target_date = datetime.now() - timedelta(days=day_offset)
        day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        logging.info(f"📆 Generating day {days - day_offset + 1}/{days}: {target_date.strftime('%Y-%m-%d')}")
        
        # Generate transactions for each hour of the day
        for hour in range(24):
            current_datetime = day_start + timedelta(hours=hour)
            
            # Determine transaction rate for this hour
            min_batch, max_batch, _ = _get_time_based_transaction_rate_for_hour(hour)
            
            # Generate multiple batches for this hour (simulate realistic distribution)
            batches_per_hour = random.randint(2, 4)  # 2-4 batches per hour (reduced for stability)
            
            for _ in range(batches_per_hour):
                batch_size = random.randint(min_batch, max_batch)
                
                for _ in range(batch_size):
                    # Add random minutes/seconds within the hour
                    tx_datetime = current_datetime + timedelta(
                        minutes=random.randint(0, 59),
                        seconds=random.randint(0, 59)
                    )
                    
                    rec = _base_raw(seq, tx_datetime)
                    try:
                        producer.send(TOPIC_RAW, value=rec).get(timeout=5)
                    except Exception as e:
                        logging.error(f"Failed to send record {seq}: {e}")
                        time.sleep(0.5)  # Brief pause on error
                        continue
                    
                    # Count fraud based on label (if using predefined scores)
                    if GENERATE_WITH_SCORES and rec.get('label', 0) >= 1:
                        fraud_count += 1
                    elif '_fraud_pattern' in rec:
                        fraud_count += 1
                    
                    total_count += 1
                    seq += 1
        
        fraud_rate = (fraud_count / total_count * 100) if total_count > 0 else 0
        logging.info(f"✅ Day {days - day_offset + 1} complete: {total_count} transactions, {fraud_count} fraud ({fraud_rate:.1f}%)")
        
        # Update status file after each day
        _update_status_file(seq, total_count, fraud_count)
    
    logging.info(f"🎉 Historical data generation complete: {total_count} total transactions across {days} days")
    return seq

def _get_time_based_transaction_rate_for_hour(hour: int) -> Tuple[int, int, float]:
    """Get transaction rate parameters for a specific hour (used for historical generation)."""
    if 0 <= hour < 6:
        return (1, 2, 2.5)
    elif 6 <= hour < 9:
        return (2, 5, 1.5)
    elif 9 <= hour < 12:
        return (8, 15, 0.5)
    elif 12 <= hour < 14:
        return (5, 10, 0.8)
    elif 14 <= hour < 18:
        return (7, 13, 0.6)
    elif 18 <= hour < 22:
        return (3, 8, 1.0)
    else:  # 22-23
        return (1, 3, 2.0)

def main():
    # Load users from database at startup
    logging.info("Loading users from PostgreSQL database...")
    _load_users_from_db()
    
    if not _USER_CACHE:
        logging.warning("No users loaded from database. Transactions will use random user data.")
    else:
        logging.info(f"Successfully loaded {len(_USER_CACHE)} users. Ready to generate transactions.")
    
    # Log fraud scoring configuration
    if GENERATE_WITH_SCORES:
        logging.info(f"⚙️ PREDEFINED SCORES MODE: Generating fraud scores in range {SCORE_MIN}-{SCORE_MAX}")
    else:
        logging.info("Fraud generation enabled: ~15% of transactions will have fraud patterns")
    
    if SIMULATION_MODE == "auto":
        logging.info("Time-based transaction rate enabled: activity varies by hour (low at night, high during business hours)")
    else:
        logging.info(f"Simulation mode: {SIMULATION_MODE.upper()} - Fixed transaction rate regardless of time")
    
    p = _init_producer()
    seq = START_SEQ
    
    # Initialize status file
    _update_status_file(seq, 0, 0)
    
    # Generate historical data if requested
    if HISTORICAL_DAYS > 0:
        seq = _generate_historical_data(p, seq, HISTORICAL_DAYS)
        logging.info(f"🚀 Starting real-time generation from sequence {seq}")
    
    fraud_count = 0
    total_count = 0
    last_hour = -1
    
    while True:
        # Get time-based transaction rate
        current_hour = datetime.now().hour
        min_batch, max_batch, sleep_time = _get_time_based_transaction_rate()
        
        # Log when hour changes to show rate adjustment
        if current_hour != last_hour:
            if SIMULATION_MODE == "auto":
                logging.info(f"⏰ Hour changed to {current_hour:02d}:00 - Transaction rate: {min_batch}-{max_batch} tx/batch, {sleep_time}s sleep")
            else:
                logging.info(f"🎮 Simulation mode: {SIMULATION_MODE.upper()} - Rate: {min_batch}-{max_batch} tx/batch, {sleep_time}s sleep")
            last_hour = current_hour
        
        # Generate realistic batch size based on time of day
        batch_size = random.randint(min_batch, max_batch)
        for _ in range(batch_size):
            rec = _base_raw(seq)  # Real-time uses current time
            md = p.send(TOPIC_RAW, value=rec).get(timeout=10)
            
            # Check if this is a fraud case
            is_fraud_pattern = '_fraud_pattern' in rec
            if is_fraud_pattern:
                fraud_count += 1
                fraud_type = rec.get('_fraud_pattern', 'unknown')
                logging.info(f"🚨 FRAUD sent seq={seq} type={fraud_type} | user={rec['user_seq']} tx_24h={rec['transaction_count_24hour']} amt_24h=${rec['transaction_amount_24hour']} payment={rec['payment_method']}")
            else:
                logging.info(f"✓ RAW sent seq={seq} | user={rec['user_seq']} name={rec['user_name']} amount=${rec['deposit_amount']}")
            
            total_count += 1
            seq += 1
            
            # Update status file every 10 records
            if total_count % 10 == 0:
                _update_status_file(seq, total_count, fraud_count)
        
        # Log fraud statistics every 100 transactions
        if total_count % 100 == 0:
            fraud_rate = (fraud_count / total_count) * 100
            logging.info(f"📊 Stats: {total_count} total, {fraud_count} fraud ({fraud_rate:.1f}%)")
        
        # Sleep based on time of day
        time.sleep(sleep_time)

if __name__ == "__main__":
    main()
