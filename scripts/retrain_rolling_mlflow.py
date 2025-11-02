import logging
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import argparse, subprocess, shutil
from datetime import datetime, timezone
from utils.logging_utils import configure_logging

from scripts.train_and_export_mlflow import train_once, SkipTraining
from utils.azure import (
    configure_azure_credentials_from_settings,
    ensure_azure_identity_env,
)
from app.config import settings


configure_azure_credentials_from_settings()
LOGGER = logging.getLogger(__name__)

# Hàm để cập nhật symlink "current" tới thư mục mục tiêu
def promote_symlink(root_dir: str, target_dir: str):
    link = os.path.join(root_dir, "current")
    try:
        if os.path.islink(link) or os.path.exists(link):
            if os.path.islink(link):
                os.unlink(link)
            else:
                shutil.rmtree(link)
    except Exception as e:
        LOGGER.warning("Cannot remove %s: %s", link, e)
    os.symlink(os.path.abspath(target_dir), link)

# Hàm để liệt kê các version trong thư mục gốc, mới nhất trước
def list_versions(root: str, prefix: str = None):
    """Liệt kê các version (loại 'current'), mới nhất trước."""
    out = []
    for name in os.listdir(root):
        if name == "current":
            continue
        p = os.path.join(root, name)
        if os.path.isdir(p) and (not prefix or name.startswith(prefix)):
            out.append((name, os.path.getmtime(p)))
    out.sort(key=lambda x: x[1], reverse=True)
    return [n for n, _ in out]


def main():
    configure_logging()
    ap = argparse.ArgumentParser(description="Rolling 6-month retrain orchestrator (MLflow + alias)")
    ap.add_argument("--db-url", default=os.getenv("DB_URL", "postgresql+psycopg2://finshot_readonly:eP1ksm5aRQbXdf8GhNlp@175.193.239.90:35432/coinshot"))
    ap.add_argument("--window-months", type=int, default=6)

    ap.add_argument("--auto-promote", action="store_true", help="Bật auto-compare và cập nhật alias trong Registry.")

    # ===== MLflow args =====
    ap.add_argument("--mlflow-uri", default=settings.MLFLOW_TRACKING_URI)
    ap.add_argument("--mlflow-exp", default="KTDL-fraud-detection", help="Tên Experiment trong MLflow")
    ap.add_argument("--mlflow-tags", default=None)
    ap.add_argument("--registered-model-name", default=settings.MLFLOW_MODEL_NAME)
    ap.add_argument("--registry-alias", default="Production", help="Alias trong Registry sẽ trỏ tới bản thắng (vd: Production)")
    ap.add_argument("--prefer-stages", nargs="*", default=None, help="Ưu tiên stage khi chọn 2 bản so sánh (vd: Staging None)")

    ap.set_defaults(auto_promote=True)
    
    args = ap.parse_args()

    train_py = os.path.join(os.path.dirname(__file__), "train_and_export_mlflow.py")
    cmd = [sys.executable, train_py]
    LOGGER.info("Running training command: %s", " ".join(cmd))
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, check=True)
        LOGGER.info("Training output:\n%s", out.stdout)
    except subprocess.CalledProcessError as e:
        LOGGER.error("Training failed:")
        LOGGER.error("stdout: %s", e.stdout)
        LOGGER.error("stderr: %s", e.stderr)
        sys.exit(1)
        
 
    mlflow_uri = settings.MLFLOW_TRACKING_URI
    print("Compare ...")
    if args.auto_promote:
        from mlflow.tracking import MlflowClient
        import mlflow

        if mlflow_uri:
            mlflow.set_tracking_uri(mlflow_uri)

        ensure_azure_identity_env()

        compare_py = os.path.join(os.path.dirname(__file__), "compare_versions_mlflow.py") 
        cmd = [sys.executable, compare_py, "--registered-model-name", args.registered_model_name] 
        if mlflow_uri: 
            cmd += ["--mlflow-uri", mlflow_uri]
        if args.prefer_stages: 
            cmd += ["--prefer-stages"] + args.prefer_stages

        LOGGER.info("Running comparison command: %s", " ".join(cmd))
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, check=True)
            winner_version = out.stdout.strip().splitlines()[-1].strip()
        except subprocess.CalledProcessError as e:
            LOGGER.error("compare_versions_mlflow failed:")
            LOGGER.error("stdout: %s", e.stdout)
            LOGGER.error("stderr: %s", e.stderr)
            sys.exit(2)

        if not winner_version.isdigit():
            LOGGER.error("Invalid winner version returned: '%s'", winner_version)
            sys.exit(3)

        LOGGER.info("Winner Registry Version: %s", winner_version)

        client = MlflowClient()
        name = args.registered_model_name 
        alias = args.registry_alias 

        prev_version = None
        try:
            prev = client.get_model_version_by_alias(name, alias)
            prev_version = prev.version 
            LOGGER.info("Current alias '%s' points to %s:%s", alias, name, prev_version)
        except Exception:
            pass

        client.set_registered_model_alias(name, alias, int(winner_version))# Cập nhật alias trong Registry
        if prev_version and str(prev_version) != winner_version: # Gỡ alias khỏi version trước đó nếu khác
            LOGGER.info("Alias '%s' moved %s:%s → %s", alias, name, prev_version, winner_version)
        else:
            LOGGER.info("Alias '%s' now points to %s:%s", alias, name, winner_version) 

    else:
        LOGGER.info("--auto-promote is OFF; skipping compare and alias update.")

if __name__ == "__main__":
    main()
