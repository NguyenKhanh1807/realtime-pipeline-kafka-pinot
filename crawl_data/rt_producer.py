import json, os, time, random, logging
from datetime import datetime, timedelta, date
from typing import Dict, Tuple, List
from faker import Faker
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

TOPIC_RAW   = os.getenv("TOPIC_RAW", "transactions_raw")  # RAW topic
BOOTSTRAP   = os.getenv("BOOTSTRAP_SERVERS", "kafka-rt:19092")
INTERVAL    = int(os.getenv("INTERVAL_SEC", "5"))
START_SEQ   = int(os.getenv("START_SEQ", "1"))
SEED        = os.getenv("SEED")

if SEED: random.seed(int(SEED))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
fake = Faker()

COUNTRIES = ["VN", "KR", "JP", "SG"]
ID_TYPES  = ["ID", "PASSPORT", "DL"]
PAYMENT_METHODS = ["CASH", "CARD", "BANK", "WALLET", "CRYPTO"]

def _rand_date(start: date, end: date) -> str:
    days = max((end - start).days, 0)
    d = start + timedelta(days=random.randint(0, days))
    return d.strftime("%Y-%m-%d")

def _maybe_bad_timestamp() -> str:
    """Cố ý dùng vài format khác nhau để Processor phải chuẩn hoá."""
    now = datetime.utcnow()
    choice = random.random()
    if choice < 0.6:
        return now.strftime("%Y-%m-%d %H:%M:%S")      # format chuẩn Pinot
    elif choice < 0.8:
        return now.isoformat()                        # ISO 8601
    else:
        return now.strftime("%d/%m/%Y %H:%M:%S")      # dd/MM/yyyy HH:mm:ss

def _base_raw(seq: int) -> Dict:
    # đôi khi cố ý để thiếu/trật type vài field để Kafka Processor sửa
    rec = {
        "transaction_seq": seq,
        "user_seq": random.randint(1_000_000, 9_999_999),
        "receiving_country": random.choice(COUNTRIES),
        "country_code": random.choice(COUNTRIES),
        "id_type": random.choice(ID_TYPES),
        "stay_qualify": random.choice(["YES", "NO"]),
        "visa_expire_date": _rand_date(date.today(), date.today() + timedelta(days=365)),
        "user_name": fake.name(),
        "payment_method": random.choice(PAYMENT_METHODS),
        "autodebit_account": round(random.uniform(0.0, 1.0), 6),
        "register_date": _rand_date(date(1990,1,1), date.today()),
        "first_transaction_date": _rand_date(date(1990,1,1), date.today()),
        "birth_date": _rand_date(date(1960,1,1), date(2005,12,31)),
        "recheck_date": _rand_date(date(1990,1,1), date.today()),
        "invite_code": fake.bothify(text="INV-####"),
        "face_pin_date": _rand_date(date(1990,1,1), date.today()),
        "transaction_count_24hour": random.randint(0, 60),
        "transaction_amount_24hour": random.randint(0, 20_000_000),
        "transaction_count_1week": random.randint(0, 150),
        "transaction_amount_1week": random.randint(0, 80_000_000),
        "transaction_count_1month": random.randint(0, 260),
        "transaction_amount_1month": random.randint(0, 200_000_000),
        "label": random.randint(0, 1),  # tạm thời random; Processor sẽ tái gán theo rule
        "create_dt": _maybe_bad_timestamp(),  # format lẫn lộn để Processor chuẩn hoá
        "deposit_amount": round(random.uniform(10_000, 10_000_000), 2),
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

def main():
    p = _init_producer()
    seq = START_SEQ
    while True:
        rec = _base_raw(seq)
        md = p.send(TOPIC_RAW, value=rec).get(timeout=10)
        logging.info(f"RAW sent seq={seq} p={md.partition} off={md.offset} | {rec}")
        seq += 1
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
