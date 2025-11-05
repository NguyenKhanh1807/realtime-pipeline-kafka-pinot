import logging
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import argparse
from datetime import datetime, timezone

from scripts.train_and_export_mlflow import train_once, SkipTraining
from scripts.compare_versions_mlflow import compare_and_get_winner 

import mlflow 
from mlflow.tracking import MlflowClient 

from utils.logging_utils import configure_logging
from utils.azure import (
    configure_azure_credentials_from_settings,
    ensure_azure_identity_env,
)
from scripts.config import settings

configure_azure_credentials_from_settings()
LOGGER = logging.getLogger(__name__)

def main():
    configure_logging()
    ap = argparse.ArgumentParser(description="Rolling 6-month retrain orchestrator (MLflow + alias)")
    ap.add_argument("--data", default="data/data.csv")
    ap.add_argument("--use-pinot", dest="use_pinot", action="store_true", help="Lấy dữ liệu huấn luyện trực tiếp từ Pinot.")
    ap.add_argument("--no-pinot", dest="use_pinot", action="store_false", help="Tắt lấy dữ liệu từ Pinot, dùng CSV.")
    ap.set_defaults(use_pinot=True)
    ap.add_argument("--pinot-host", default="93.115.172.151")
    ap.add_argument("--pinot-port", type=int, default=8099)
    ap.add_argument("--pinot-scheme", default="http", choices=["http", "https"])
    ap.add_argument("--pinot-path", default="/query/sql")
    ap.add_argument("--pinot-table", default="transactions")
    ap.add_argument("--pinot-mode", choices=["dbapi", "rest"], default="dbapi")
    ap.add_argument("--pinot-timeout", type=int, default=60)
    ap.add_argument("--pinot-verify", action="store_true")
    ap.add_argument("--pinot-end-date", default=None, help="YYYY-MM-DD; bỏ trống dùng thời gian hiện tại.")
    ap.add_argument("--pinot-window-months", type=int, default=6, help="Số tháng lùi lại từ end-date.")
    ap.add_argument("--pinot-limit", type=int, default=None, help="Giới hạn số dòng trả về.")

    ap.add_argument("--model-root", default=settings.MODEL_DIR_TRAIN)
    ap.add_argument("--artifacts-root", default=settings.ARTIFACTS_DIR_TRAIN)
    ap.add_argument("--model-name", default=settings.MLFLOW_MODEL_NAME)
    ap.add_argument("--test-ratio", type=float, default=settings.TEST_RATIO)
    ap.add_argument("--fpr-cap", type=float, default=settings.FPR_CAP)
    ap.add_argument("--recall-tgt", type=float, default=settings.RECALL_TGT)

    ap.add_argument("--auto-promote", action="store_true", help="Bật auto-compare và cập nhật alias trong Registry.")

    ap.add_argument("--mlflow-uri", default=settings.MLFLOW_TRACKING_URI, help="MLflow Tracking URI")
    ap.add_argument("--mlflow-exp", default=settings.MLFLOW_EXPERIMENT_NAME, help="MLflow Experiment Name")
    ap.add_argument("--mlflow-tags", default=settings.MLFLOW_TAGS)
    ap.add_argument("--registered-model-name", default=settings.MLFLOW_MODEL_NAME)
    ap.add_argument("--registry-alias", default=settings.MLFLOW_MODEL_ALIAS, help="Alias trong Model Registry để cập nhật")
    ap.add_argument("--prefer-stages", nargs="*", default=None, help="Ưu tiên stage khi chọn 2 bản so sánh (vd: Staging None)")
    ap.set_defaults(auto_promote=True)

    args = ap.parse_args()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    data_dir = "data"
    os.makedirs(data_dir, exist_ok=True)
 
    mlflow_uri = args.mlflow_uri 
    if mlflow_uri:
        mlflow.set_tracking_uri(mlflow_uri)
        LOGGER.info("MLflow tracking_uri = %s", mlflow_uri)
    else:
        LOGGER.info("Using default MLflow tracking URI.")
        return
    
    ensure_azure_identity_env()
    client = MlflowClient() 
    try:
        pinot_cfg = None
        data_source = args.data
        print("use_pinot:", args.use_pinot)
        if args.use_pinot:
            pinot_cfg = {
                "host": args.pinot_host,
                "port": args.pinot_port,
                "scheme": args.pinot_scheme,
                "path": args.pinot_path,
                "table": args.pinot_table,
                "mode": args.pinot_mode,
                "timeout": args.pinot_timeout,
                "verify": args.pinot_verify,
                "end_date": args.pinot_end_date,
                "window_months": args.pinot_window_months,
                "limit": args.pinot_limit,
            }
            data_source = None
        LOGGER.info("-----------Starting training...-------------")
        _ = train_once(
            data_path=data_source,
            artifacts_dir=args.artifacts_root,
            model_dir=args.model_root,
            test_ratio=args.test_ratio,
            fpr_cap=args.fpr_cap,
            recall_tgt=args.recall_tgt,
            save_holdout=settings.HOLDOUT_SAVE_NAME,
            stamp=stamp,
            mlflow_exp=args.mlflow_exp,
            mlflow_tags=args.mlflow_tags,
            registered_model_name=args.registered_model_name,
            pinot_cfg=pinot_cfg,
        )
        LOGGER.info("Training completed.")
    except SkipTraining as e:
        LOGGER.warning("%s. Rolling job continues without training a new model.", e)
        return
    except Exception as e:
        LOGGER.error("Training failed: %s", e)
        return

    if args.auto_promote:
        LOGGER.info("--- Comparing models in Registry and updating alias... ---")
        
        try:
            winner_version = compare_and_get_winner(
                client=client,
                registered_model_name=args.registered_model_name,
            )
        except Exception as e:
            LOGGER.error("Comparison failed: %s", e)
            return

        if not winner_version.isdigit():
            LOGGER.error("Invalid winner version returned: '%s'", winner_version)
            return

        LOGGER.info("Winner Registry Version: %s", winner_version)

        # Logic cập nhật Alias
        name = args.registered_model_name 
        alias = args.registry_alias 
        prev_version = None
        try:
            prev = client.get_model_version_by_alias(name, alias)
            prev_version = prev.version 
            LOGGER.info("Current alias '%s' points to %s:%s", alias, name, prev_version)
        except Exception:
            pass

        client.set_registered_model_alias(name, alias, int(winner_version))
        if prev_version and str(prev_version) != winner_version: 
            LOGGER.info("Alias '%s' moved %s:%s → %s", alias, name, prev_version, winner_version)
        else:
            LOGGER.info("Alias '%s' now points to %s:%s", alias, name, winner_version) 
        LOGGER.info("--- Auto-promotion completed. ---")
    else:
        LOGGER.info("--- Auto-promotion skipped as per arguments. ---") 

if __name__ == "__main__":
    main()