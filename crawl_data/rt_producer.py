import json, os, time, random, logging
from datetime import datetime, timedelta
from faker import Faker
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

TOPIC = os.getenv("TOPIC", "transactions_rt")
BOOTSTRAP = os.getenv("BOOTSTRAP_SERVERS", "kafka-rt:19092")
INTERVAL = int(os.getenv("INTERVAL_SEC", "60"))
START_SEQ = int(os.getenv("START_SEQ", "1"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
fake = Faker()

def make_record(seq: int) -> dict:
    # Tạo record theo schema “transactions” bạn đã dùng (đơn giản hoá vài field)
    return {
        "transaction_seq": seq,
        "user_seq": random.randint(1_000_000, 9_999_999),
        "receiving_country": random.choice(["VN", "KR", "JP", "SG"]),
        "country_code": random.choice(["VN", "KR", "JP", "SG"]),
        "id_type": random.choice(["ID", "PASSPORT", "DL"]),
        "stay_qualify": random.choice(["YES", "NO"]),
        "visa_expire_date": (datetime.utcnow()+timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d"),
        "user_name": fake.name(),
        "payment_method": random.choice(["CASH", "CARD", "BANK"]),
        "autodebit_account": round(random.uniform(0, 1), 6),
        "register_date": fake.date(),
        "first_transaction_date": fake.date(),
        "birth_date": fake.date(),
        "recheck_date": fake.date(),
        "invite_code": fake.bothify(text="INV-####"),
        "face_pin_date": fake.date(),
        "transaction_count_24hour": random.randint(0, 50),
        "transaction_amount_24hour": random.randint(0, 10_000_000),
        "transaction_count_1week": random.randint(0, 100),
        "transaction_amount_1week": random.randint(0, 50_000_000),
        "transaction_count_1month": random.randint(0, 200),
        "transaction_amount_1month": random.randint(0, 100_000_000),
        "label": random.randint(0, 1),
        "create_dt": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "deposit_amount": round(random.uniform(10_000, 10_000_000), 2),
    }

def main():
    logging.info(f"Starting producer → bootstrap={BOOTSTRAP}, topic={TOPIC}, interval={INTERVAL}s")
    # chờ Kafka sẵn sàng
    for attempt in range(30):
        try:
            producer = KafkaProducer(
                bootstrap_servers=BOOTSTRAP,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                linger_ms=0,
                acks="all",
                retries=3,
            )
            break
        except NoBrokersAvailable as e:
            logging.warning(f"Kafka not ready ({e}), retry {attempt+1}/30 ...")
            time.sleep(2)
    else:
        logging.error("Kafka still not ready after retries. Exit.")
        return

    seq = START_SEQ
    while True:
        rec = make_record(seq)
        future = producer.send(TOPIC, value=rec)
        metadata = future.get(timeout=10)
        logging.info(f"sent seq={seq} → partition={metadata.partition}, offset={metadata.offset} | {rec}")
        producer.flush()
        seq += 1
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
