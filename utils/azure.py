import os
from typing import Dict

from app.config import settings


def _settings_env_map() -> Dict[str, str]:
    return {
        "AZURE_TENANT_ID": settings.AZURE_TENANT_ID,
        "AZURE_CLIENT_ID": settings.AZURE_CLIENT_ID,
        "AZURE_CLIENT_SECRET": settings.AZURE_CLIENT_SECRET,
    }


def configure_azure_credentials_from_settings() -> None:
    """
    Populate process environment variables from settings if they are not already present.
    Ensures scripts launched from other entry points still inherit the configured Azure secrets.
    """
    for env_key, env_value in _settings_env_map().items():
        if env_value and not os.getenv(env_key): # nghĩa là có giá trị trong settings và chưa có trong env
            os.environ[env_key] = env_value # gán giá trị từ settings vào env


def ensure_azure_identity_env() -> None:
    """
    Validate that usable Azure authentication material is available before hitting MLflow's Azure artifact store.
    Accepts either a connection string/account key combo or the service principal triplet.
    """
    if os.getenv("AZURE_STORAGE_CONNECTION_STRING"): # nếu có connection string thì
        return
    if os.getenv("AZURE_STORAGE_ACCOUNT_NAME") and os.getenv("AZURE_STORAGE_ACCOUNT_KEY"): # hoặc có account name + account key thì
        return
    missing = [env_key for env_key in _settings_env_map() if not os.getenv(env_key)] # kiểm tra thiếu biến nào trong 3 biến tenant id, client id, client secret
    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(
            "Azure credential environment variables missing. "
            f"Set {joined} or provide AZURE_STORAGE_CONNECTION_STRING / "
            "AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY."
        )
