import os, json, time, logging, re
from datetime import datetime
from collections import deque
from typing import Dict, Any, Tuple, Optional
from kafka import KafkaConsumer, KafkaProducer

# Try to import ML fraud detector
try:
    from ml_fraud_detector import get_detector
    ML_AVAILABLE = True
    logging.info("ML fraud detector loaded successfully")
except ImportError as e:
    ML_AVAILABLE = False
    logging.warning(f"ML fraud detector not available: {e}. Using rule-based only.")

# ==== Env / Config ====
BOOTSTRAP       = os.getenv("BOOTSTRAP_SERVERS", "kafka-rt:19092")
TOPIC_RAW       = os.getenv("TOPIC_RAW", "transactions_raw")
TOPIC_CLEAN     = os.getenv("TOPIC_CLEAN", "transactions_rt")
GROUP_ID        = os.getenv("GROUP_ID", "rt-processor-v1")
FLUSH_INTERVAL  = float(os.getenv("FLUSH_INTERVAL_SEC", "2.0"))   # flush định kỳ (giây)
DEDUP_MAX_KEYS  = int(os.getenv("DEDUP_MAX_KEYS", "50000"))        # dedup theo (user_seq, minute)
HEARTBEAT_EVERY = int(os.getenv("HEARTBEAT_EVERY", "200"))         # log sau mỗi N bản ghi
USE_ML_SCORING  = os.getenv("USE_ML_SCORING", "True").lower() in ("true", "1", "yes")  # Use ML fraud detection

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ====== Helpers ======
PINOT_DT_FMT = "%Y-%m-%d %H:%M:%S"

def _parse_dt(s: str) -> str:
    """Chuẩn hoá create_dt về format Pinot (YYYY-MM-DD HH:mm:ss)."""
    if not s:
        return datetime.utcnow().strftime(PINOT_DT_FMT)

    for fmt in (PINOT_DT_FMT, "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S",
                "%d/%m/%Y %H:%M:%S", "%Y/%m/%d %H:%M:%S"):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime(PINOT_DT_FMT)
        except Exception:
            pass

    # Cắt ISO nếu có timezone
    m = re.match(r"(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})", str(s))
    if m:
        try:
            dt = datetime.strptime(f"{m.group(1)} {m.group(2)}", PINOT_DT_FMT)
            return dt.strftime(PINOT_DT_FMT)
        except Exception:
            pass

    return datetime.utcnow().strftime(PINOT_DT_FMT)

def _as_int(v, default=0) -> int:
    try:
        return int(v)
    except Exception:
        return default

def _as_float(v, default=0.0) -> float:
    try:
        return float(v)
    except Exception:
        return default

def _fallback(val, default):
    return val if val not in (None, "", []) else default

# === Hybrid fraud detection: ML + Rule-based ===
def _risk_and_label(rec: Dict[str, Any]) -> Tuple[float, int]:
    """
    Hybrid fraud detection using ML model (if available) with rule-based fallback.
    
    Approach:
    1. Check USE_ML_SCORING config - if False, skip ML entirely
    2. Try ML model first (trained on historical patterns)
    3. If ML not available or fails, use rule-based scoring
    4. For borderline cases (0.4-0.6), apply rule-based boost
    
    Score >= 0.6 = fraud (label=1), otherwise normal (label=0)
    
    Returns:
        Tuple of (fraud_score, label)
    """
    ml_score: Optional[float] = None
    ml_label: Optional[int] = None
    
    # Try ML model first (only if enabled and available)
    if USE_ML_SCORING and ML_AVAILABLE:
        try:
            detector = get_detector()
            ml_score, ml_label = detector.predict_fraud_score(rec)
            
            # If ML is confident (very low or very high), trust it
            if ml_score < 0.3 or ml_score > 0.7:
                return ml_score, ml_label
                
        except Exception as e:
            logging.warning(f"ML prediction failed: {e}, falling back to rules")
    
    # Rule-based scoring (used as fallback or for borderline cases)
    rule_score = _rule_based_score(rec)
    
    # If ML gave borderline result, blend with rules
    if ml_score is not None and 0.3 <= ml_score <= 0.7:
        # Weight: 70% ML, 30% rules for borderline cases
        final_score = 0.7 * ml_score + 0.3 * rule_score
        final_label = 1 if final_score >= 0.6 else 0
        return final_score, final_label
    
    # Pure rule-based fallback
    return rule_score, (1 if rule_score >= 0.6 else 0)

def _rule_based_score(rec: Dict[str, Any]) -> float:
    """
    Rule-based fraud scoring based on transaction patterns.
    Realistic thresholds for $0-$1000 transaction amounts.
    
    Returns:
        Fraud score between 0.0 and 1.0
    """
    score = 0.0

    # Extreme transaction velocity (very suspicious amounts)
    if rec["transaction_amount_24hour"] > 20000:  # More than $20K/day
        score += 0.30
    elif rec["transaction_amount_24hour"] > 10000:  # More than $10K/day
        score += 0.15

    if rec["transaction_amount_1week"] > 50000:  # More than $50K/week
        score += 0.25
    elif rec["transaction_amount_1week"] > 30000:  # More than $30K/week
        score += 0.10

    if rec["transaction_amount_1month"] > 150000:  # More than $150K/month
        score += 0.20

    # Very high transaction frequency
    if rec["transaction_count_24hour"] > 80:  # More than 80 transactions/day
        score += 0.25
    elif rec["transaction_count_24hour"] > 60:  # More than 60 transactions/day
        score += 0.10

    # High-risk payment methods
    if rec.get("payment_method") in ("CRYPTO"):  # CRYPTO is highest risk
        score += 0.20
    elif rec.get("payment_method") in ("WALLET"):  # WALLET is medium risk
        score += 0.10

    # Cross-border transactions (different sending/receiving countries)
    if rec.get("receiving_country") and rec.get("country_code") and rec["receiving_country"] != rec["country_code"]:
        score += 0.15

    # Very large single transaction (top 5%)
    if rec["deposit_amount"] > 950:  # Transactions over $950
        score += 0.15
    elif rec["deposit_amount"] > 900:  # Transactions over $900
        score += 0.05

    # Very high overall transaction counts
    if rec["transaction_count_1week"] > 150:
        score += 0.15
    if rec["transaction_count_1month"] > 250:
        score += 0.10

    return min(score, 1.0)

# ====== Processor ======
def main():
    logging.info(f"Booting rt-processor … BOOTSTRAP={BOOTSTRAP}")
    consumer = KafkaConsumer(
        TOPIC_RAW,
        bootstrap_servers=BOOTSTRAP,
        group_id=GROUP_ID,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
        # KHÔNG đặt consumer_timeout_ms=0, để loop duy trì
    )
    producer = KafkaProducer(
        bootstrap_servers=BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        acks="all",
        retries=3,
        linger_ms=0
    )

    # dedup theo (user_seq, yyyy-MM-dd HH:mm) để tránh spam bản sao trong cùng phút
    seen_keys = deque(maxlen=DEDUP_MAX_KEYS)
    seen_set  = set()

    logging.info(f"Processor started → raw={TOPIC_RAW} → clean={TOPIC_CLEAN}")

    processed = 0
    last_flush = time.time()

    try:
        for msg in consumer:
            try:
                raw = msg.value if isinstance(msg.value, dict) else {}
                # --- Chuẩn hoá schema khớp Pinot ---
                rec = {
                    "transaction_seq": _as_int(raw.get("transaction_seq")),
                    "user_seq": _as_int(raw.get("user_seq")),
                    "receiving_country": _fallback(raw.get("receiving_country"), raw.get("country_code") or "VN"),
                    "country_code": _fallback(raw.get("country_code"), raw.get("receiving_country") or "VN"),
                    "id_type": _fallback(raw.get("id_type"), "ID"),
                    "stay_qualify": _fallback(raw.get("stay_qualify"), "YES"),
                    "visa_expire_date": _fallback(raw.get("visa_expire_date"), datetime.utcnow().strftime("%Y-%m-%d")),
                    "user_name": _fallback(raw.get("user_name"), "Unknown"),
                    "payment_method": _fallback(raw.get("payment_method"), "CASH"),
                    "autodebit_account": _as_float(raw.get("autodebit_account"), 0.0),
                    "register_date": _fallback(raw.get("register_date"), datetime.utcnow().strftime("%Y-%m-%d")),
                    "first_transaction_date": _fallback(raw.get("first_transaction_date"), datetime.utcnow().strftime("%Y-%m-%d")),
                    "birth_date": _fallback(raw.get("birth_date"), "1980-01-01"),
                    "recheck_date": _fallback(raw.get("recheck_date"), datetime.utcnow().strftime("%Y-%m-%d")),
                    "invite_code": _fallback(raw.get("invite_code"), "INV-0000"),
                    "face_pin_date": _fallback(raw.get("face_pin_date"), datetime.utcnow().strftime("%Y-%m-%d")),
                    "transaction_count_24hour": _as_int(raw.get("transaction_count_24hour")),
                    "transaction_amount_24hour": _as_int(raw.get("transaction_amount_24hour")),
                    "transaction_count_1week": _as_int(raw.get("transaction_count_1week")),
                    "transaction_amount_1week": _as_int(raw.get("transaction_amount_1week")),
                    "transaction_count_1month": _as_int(raw.get("transaction_count_1month")),
                    "transaction_amount_1month": _as_int(raw.get("transaction_amount_1month")),
                    "label": _as_int(raw.get("label"), 0),
                    "create_dt": _parse_dt(raw.get("create_dt")),
                    "deposit_amount": _as_float(raw.get("deposit_amount")),
                }

                # --- Dedup đơn giản (theo phút) ---
                dedup_key = (rec["user_seq"], rec["create_dt"][:16])
                if dedup_key in seen_set:
                    continue
                # append vào deque có maxlen; nếu bị rơi phần tử cũ thì đồng bộ lại set
                prev_len = len(seen_keys)
                seen_keys.append(dedup_key)
                seen_set.add(dedup_key)
                if len(seen_keys) == seen_keys.maxlen and prev_len == seen_keys.maxlen:
                    # đã đầy từ trước; append vừa drop 1 phần tử trái nhưng ta không biết là gì
                    # đồng bộ lại set với deque (O(n), chấp nhận được cho MAX_KEYS vừa phải)
                    seen_set.intersection_update(seen_keys)

                # --- Tính risk score & (re)label ---
                # If transaction already has fraud_score, use it (predefined scores)
                if "fraud_score" in raw and isinstance(raw["fraud_score"], (int, float)):
                    # Use predefined fraud_score and label from producer
                    risk = float(raw["fraud_score"])
                    # Preserve the label from producer (0=normal, 1=warning, 2=banned)
                    label = _as_int(raw.get("label"), 0)
                    logging.debug(f"Using predefined score: {risk:.2f}, label: {label}")
                else:
                    # Calculate fraud score using ML or rules
                    risk, label = _risk_and_label(rec)
                
                rec["label"] = label
                rec["fraud_score"] = risk

                # --- Gửi CLEAN ---
                meta = producer.send(TOPIC_CLEAN, value=rec).get(timeout=10)
                processed += 1
                logging.info(
                    f"CLEAN <- RAW off={msg.offset} → p={meta.partition}, off={meta.offset} | "
                    f"label={label} risk={risk:.2f}"
                )

                # Flush định kỳ
                now = time.time()
                if FLUSH_INTERVAL > 0 and (now - last_flush) >= FLUSH_INTERVAL:
                    producer.flush()
                    last_flush = now

                # Heartbeat log
                if processed % HEARTBEAT_EVERY == 0:
                    logging.info(f"Heartbeat: processed={processed}")

            except Exception as e:
                # log lỗi record cụ thể nhưng không dừng pipeline
                logging.exception(f"Record processing error at raw offset {getattr(msg, 'offset', 'NA')}: {e}")

    finally:
        try:
            producer.flush()
        except Exception:
            pass
        producer.close()
        consumer.close()
        logging.info("Processor shutdown complete.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.info("Shutting down (KeyboardInterrupt)")