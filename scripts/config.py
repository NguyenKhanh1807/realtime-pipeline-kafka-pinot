import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def _get_str(name: str, default: str = "") -> str:
    value = os.getenv(name)
    return value.strip() if value is not None else default


def _get_optional_str(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    DB_URL: str = _get_str("DB_URL")
    MODEL_DIR_TRAIN: str = _get_str("MODEL_DIR_TRAIN", "models")
    MODEL_DIR_USE: str = _get_str("MODEL_DIR_USE", _get_str("MODEL_DIR", "models/current"))
    ARTIFACTS_DIR_TRAIN: str = _get_str("ARTIFACTS_DIR_TRAIN", "artifacts")
    ARTIFACTS_DIR_USE: str = _get_str("ARTIFACTS_USE", _get_str("ARTIFACTS_DIR", "artifacts/current"))
    MLFLOW_TRACKING_URI: Optional[str] = _get_optional_str("MLFLOW_TRACKING_URI")
    MLFLOW_MODEL_NAME: Optional[str] = _get_optional_str("MLFLOW_MODEL_NAME")
    MLFLOW_MODEL_ALIAS: str = _get_str("MLFLOW_MODEL_ALIAS", "production")
    AZURE_TENANT_ID: Optional[str] = _get_optional_str("AZURE_TENANT_ID")
    AZURE_CLIENT_ID: Optional[str] = _get_optional_str("AZURE_CLIENT_ID")
    AZURE_CLIENT_SECRET: Optional[str] = _get_optional_str("AZURE_CLIENT_SECRET")
    JWT_SECRET_KEY: Optional[str] = _get_optional_str("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = _get_str("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_EXPIRE_MINUTES: int = _get_int("JWT_ACCESS_EXPIRE_MINUTES", 60)
    PORT: int = _get_int("PORT", 8080)
    BATCH_LOOKBACK_MINUTES: int = _get_int("BATCH_LOOKBACK_MINUTES", 15)
    BATCH_INTERVAL_SECONDS: int = _get_int("BATCH_INTERVAL_SECONDS", 900)
    RETRAIN_EVERY_N_BATCHES: int = _get_int("RETRAIN_EVERY_N_BATCHES", 1)
    FPR_CAP: float = _get_float("FPR_CAP", 0.0)
    RECALL_TGT: float = _get_float("RECALL_TGT", 0.0)
    TEST_RATIO: float = _get_float("TEST_RATIO", 0.0)
    WINDOW_MONTHS: int = _get_int("WINDOW_MONTHS", 1)
    LIMIT_NONFRAUD: int = _get_int("LIMIT_NONFRAUD", 0)
    USE_FRAUD_TABLE: bool = _get_bool("USE_FRAUD_TABLE", False)
    NONFRAUD_CSV_NAME_USE: str = _get_str("NONFRAUD_CSV_NAME_USE", "")
    FRAUD_CSV_NAME_USE: str = _get_str("FRAUD_CSV_NAME_USE", "")
    HOLDOUT_SAVE_NAME: str = _get_str("HOLDOUT_SAVE_NAME", "")
    NONFRAUD_CSV_NAME_OUT: str = _get_str("NONFRAUD_CSV_NAME_OUT", "")
    FRAUD_CSV_NAME_OUT: str = _get_str("FRAUD_CSV_NAME_OUT", "")
    FRAUD_SEQS_CSV: str = _get_str("FRAUD_SEQS_CSV", "")
    MLFLOW_EXPERIMENT_NAME: str = _get_str("MLFLOW_EXPERIMENT_NAME", "default")
    MLFLOW_TAGS: Optional[str] = _get_optional_str("MLFLOW_TAGS")


settings = Settings()
