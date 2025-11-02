import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    DB_URL: str = os.getenv("DB_URL", "")
    MODEL_DIR: str = os.getenv("MODEL_DIR", "models/current")
    ARTIFACTS_DIR: str = os.getenv("ARTIFACTS_DIR", "artifacts/current")
    MLFLOW_TRACKING_URI: Optional[str] = os.getenv("MLFLOW_TRACKING_URI") or None
    MLFLOW_MODEL_NAME: Optional[str] = os.getenv("MLFLOW_MODEL_NAME") or None
    MLFLOW_MODEL_ALIAS: str = os.getenv("MLFLOW_MODEL_ALIAS", "production")
    AZURE_TENANT_ID: Optional[str] = os.getenv("AZURE_TENANT_ID") or None
    AZURE_CLIENT_ID: Optional[str] = os.getenv("AZURE_CLIENT_ID") or None
    AZURE_CLIENT_SECRET: Optional[str] = os.getenv("AZURE_CLIENT_SECRET") or None
    JWT_SECRET_KEY: Optional[str] = os.getenv("JWT_SECRET_KEY") or None
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "60"))
    PORT: int = int(os.getenv("PORT", "8080"))
    BATCH_LOOKBACK_MINUTES: int = int(os.getenv("BATCH_LOOKBACK_MINUTES", "15"))

settings = Settings()
