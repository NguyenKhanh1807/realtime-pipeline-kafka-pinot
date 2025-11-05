import logging
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import os, json, argparse, pickle, glob, joblib
from datetime import datetime
import numpy as np, pandas as pd, ydf
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc
from typing import Optional

import mlflow
import mlflow.pyfunc
from mlflow.models import infer_signature

from app.preprocess import df_align, encode_categoricals, prepare_features_for_inference
from utils.encoders import export_encoders
from utils.medians import export_medians_and_schema
from utils.thresholds import write_thresholds_yaml
from utils.common import split_oot, fraud_prob_from_model, compute_thresholds
from utils.azure import (
    configure_azure_credentials_from_settings,
    ensure_azure_identity_env,
)
from app.config import settings
from utils.logging_utils import configure_logging
from scripts.pinot_timewindow_fetch import (
    PinotFetchConfig,
    configure as configure_pinot_fetch,
    fetch_by_end_date as pinot_fetch_by_end_date,
)

configure_azure_credentials_from_settings()
LOGGER = logging.getLogger(__name__)

def load_training_dataframe(data_path: Optional[str], pinot_cfg: Optional[dict]) -> pd.DataFrame:
    if pinot_cfg:
        cfg = PinotFetchConfig(
            host=pinot_cfg["host"],
            port=pinot_cfg["port"],
            scheme=pinot_cfg["scheme"],
            path=pinot_cfg["path"],
            table=pinot_cfg["table"],
            mode=pinot_cfg["mode"],
            timeout=pinot_cfg["timeout"],
            verify=pinot_cfg["verify"],
        )
        configure_pinot_fetch(cfg)
        df = pinot_fetch_by_end_date(
            pinot_cfg["end_date"],
            pinot_cfg["window_months"],
            pinot_cfg["limit"],
        )
        if df is None:
            raise RuntimeError("Pinot fetch returned no data.")
        if df.empty:
            raise RuntimeError("Pinot fetch returned an empty DataFrame.")
        LOGGER.info(
            "Fetched %s rows from Pinot table %s (end_date=%s, window_months=%s, limit=%s)",
            f"{len(df):,}",
            pinot_cfg["table"],
            pinot_cfg["end_date"] or "<now>",
            pinot_cfg["window_months"],
            pinot_cfg["limit"],
        )
        return df
    if data_path is None:
        raise ValueError("data_path must be provided when Pinot config is not supplied.")
    LOGGER.info("Loading training data from CSV: %s", data_path)
    return pd.read_csv(data_path)

def _first_existing(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    return None

def load_encoders_flexible(artifacts_dir: str):
    cand = _first_existing([
        os.path.join(artifacts_dir, "encoders.pkl"),
        os.path.join(artifacts_dir, "encoders.pickle"),
        os.path.join(artifacts_dir, "encoders.json"),
    ])
    if cand is None:
        hits = glob.glob(os.path.join(artifacts_dir, "encoders*"))
        if hits:
            cand = hits[0]
    if cand is None:
        raise FileNotFoundError(f"Cannot find encoders in {artifacts_dir}")

    if cand.endswith((".pkl", ".pickle")):
        try:
            LOGGER.info("1Loading encoders from joblib file: %s", cand)
            return joblib.load(cand)
        except Exception:
            with open(cand, "rb") as f:
                LOGGER.info("Loading encoders from pickle file: %s", cand)
                return pickle.load(f)
    elif cand.endswith(".json"):
        with open(cand, "r", encoding="utf-8") as f:
            data = json.load(f)
            LOGGER.info("Loading encoders from JSON file: %s", cand)
        return data
    else:
        raise ValueError(f"Unsupported encoders file: {cand}")

def load_medians_and_schema_flexible(artifacts_dir: str):
    cand_main = _first_existing([
        os.path.join(artifacts_dir, "medians_schema.json"),
        os.path.join(artifacts_dir, "schema_medians.json"),
    ])
    if cand_main and os.path.exists(cand_main):
        with open(cand_main, "r", encoding="utf-8") as f:
            obj = json.load(f)
        schema = obj.get("schema") or obj.get("feature_schema")
        medians = obj.get("medians") or obj.get("feature_medians")
        LOGGER.info("1Loaded medians and schema from %s", cand_main)
        return schema, medians

    cand_medians = _first_existing([
        os.path.join(artifacts_dir, "medians.json"),
        os.path.join(artifacts_dir, "feature_medians.json"),
    ])
    cand_schema = _first_existing([
        os.path.join(artifacts_dir, "schema.json"),
        os.path.join(artifacts_dir, "feature_schema.json"),
    ])
    medians = None
    schema = None
    if cand_medians:
        with open(cand_medians, "r", encoding="utf-8") as f:
            medians = json.load(f)
    if cand_schema:
        with open(cand_schema, "r", encoding="utf-8") as f:
            schema = json.load(f)
    if (schema is None) and (medians is None):# kiểm tra manifest.json
        cand_manifest = os.path.join(artifacts_dir, "manifest.json")# kiểm tra trong manifest.json
        if os.path.exists(cand_manifest):
            with open(cand_manifest, "r", encoding="utf-8") as f:
                _ = json.load(f)
    LOGGER.info("Loaded medians and schema from %s and %s", cand_schema, cand_medians)
    return schema, medians

class FraudYDFPythonModel(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
  
        self.model_dir = context.artifacts["ydf_model"]
        self.artifacts_dir = context.artifacts["artifacts"]

        self.model = ydf.load_model(self.model_dir)

        try:
            self.encoders = load_encoders_flexible(self.artifacts_dir)
        except Exception as e:
            raise RuntimeError(f"Cannot load encoders: {e}")

        self.schema, self.medians = load_medians_and_schema_flexible(self.artifacts_dir)

        self.maybe_cats = ["receiving_country","country_code","id_type","stay_qualify","payment_method"]

    def predict(self, context, model_input: pd.DataFrame):
        X = df_align(model_input)
        cat_cols = [c for c in self.maybe_cats if c in X.columns]
        X_enc, _ = encode_categoricals(X, cat_cols, encoders=self.encoders)
        probs = fraud_prob_from_model(self.model, X_enc)
        return probs

class SkipTraining(RuntimeError):
   """Raised to signal that this window should skip training (e.g., label issues)."""
   pass

def train_once(data_path: Optional[str],
               artifacts_dir: str, model_dir: str,
               test_ratio: float = 0.20, fpr_cap: float = 0.01, recall_tgt: float = 0.80,
               save_holdout: str = None,
               stamp: str = None,
               nest_version: bool = True,
               # MLflow
               mlflow_uri: str = None,
               mlflow_exp: str = "KTDL-fraud-detection",
               mlflow_tags: dict = None,
               registered_model_name: str = "KTDL-fraud-ydf",
               pinot_cfg: Optional[dict] = None
               ):
    data_source_desc = data_path if pinot_cfg is None else f"Pinot table={pinot_cfg['table']}"
    LOGGER.info("Starting training with data source=%s", data_source_desc)
    LOGGER.info("Artifacts dir: %s, Model dir: %s", artifacts_dir, model_dir)
    LOGGER.info("Test ratio: %s, FPR cap: %s, Recall target: %s", test_ratio, fpr_cap, recall_tgt)
    LOGGER.info("MLflow URI: %s, Experiment: %s, Registered model name: %s", mlflow_uri, mlflow_exp, registered_model_name)
    LOGGER.info("-" * 53)
    if stamp:
        if nest_version:
            model_dir  = os.path.join(model_dir, stamp)
            artifacts_dir = os.path.join(artifacts_dir, stamp) 
        else:
            model_dir     = f"{model_dir}_{stamp}"
            artifacts_dir = f"{artifacts_dir}_{stamp}"
        if not save_holdout:
            save_holdout = os.path.join(artifacts_dir, "holdout.csv")

    # load data
    df = load_training_dataframe(data_path, pinot_cfg)

    # split
    train_raw, test_raw, cutoff = split_oot(df, test_ratio=test_ratio)
    LOGGER.info("Cutoff time: %s | Train=%s Test=%s", cutoff, f"{len(train_raw):,}", f"{len(test_raw):,}")
    LOGGER.info("Train label counts: %s", train_raw["label"].value_counts().to_dict())
    LOGGER.info("Test  label counts: %s", test_raw["label"].value_counts().to_dict())

    # FE
    drop_cols = ["label", "transaction_seq"]
    Xtr = df_align(train_raw.drop(columns=[c for c in drop_cols if c in train_raw.columns], errors="ignore"))
    Xte = df_align(test_raw .drop(columns=[c for c in drop_cols if c in test_raw.columns],  errors="ignore"))

    # encode, lưu lại bộ encoder
    maybe_cats = ["receiving_country","country_code","id_type","stay_qualify","payment_method"]
    cat_cols = [c for c in maybe_cats if c in Xtr.columns]
    Xtr_enc, encoders = encode_categoricals(Xtr, cat_cols, encoders=None)
    Xte_enc, _ = encode_categoricals(Xte, cat_cols, encoders=encoders)

    # label
    ytr = train_raw["label"].map({0:"NO_FRAUD", 1:"FRAUD"})
    yte = test_raw ["label"].map({0:"NO_FRAUD", 1:"FRAUD"})
    train_ds = Xtr_enc.copy(); train_ds["is_fraud"] = ytr.values
    test_ds  = Xte_enc.copy(); test_ds ["is_fraud"] = yte.values

    # class_weight
    pos = int((train_raw["label"]==1).sum())
    neg = int((train_raw["label"]==0).sum())
    w_pos = neg / max(1, pos)

    if pos == 0:
        LOGGER.warning("Training set has NO FRAUD; skip training this window.")
        raise SkipTraining("No positive class in training set.")

    # train RF
    learner = ydf.RandomForestLearner(
        label="is_fraud",
        class_weights={"NO_FRAUD": 1.0, "FRAUD": float(w_pos)},
        num_trees=500, max_depth=16,
    )
    try:
        model = learner.train(train_ds)
    except Exception as e:
        msg = str(e)
        if "categorical weight value \"FRAUD\" is not defined" in msg or "INVALID_ARGUMENT" in msg:
            LOGGER.warning("Learner cannot apply class_weights for FRAUD; skip training this window.")
            raise SkipTraining("YDF dataspec has single class for label.")
        raise

    # eval + thresholds
    y_true = (test_ds["is_fraud"].to_numpy()=="FRAUD").astype(int) # 1 if FRAUD else 0. ví dụ như [0,0,1,0,1,...]
    scores = fraud_prob_from_model(model, test_ds.drop(columns=["is_fraud"]))
    if len(np.unique(y_true)) < 2:
        LOGGER.warning("Test set has a single class; ROC/PR undefined. Skip this window.")
        raise SkipTraining("Only one class present in test set.")
    
    prec, rec, _ = precision_recall_curve(y_true, scores)
    pr_auc = float(auc(rec, prec))
    roc = float(roc_auc_score(y_true, scores))
    ths = compute_thresholds(y_true, scores, fpr_cap=fpr_cap, recall_tgt=recall_tgt)
    th_low, th_high = float(ths["th_recall"]), float(ths["th_fpr_cap"])

    # save model & artifacts
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(artifacts_dir, exist_ok=True) 
    model.save(model_dir) 

    export_encoders(encoders, out_dir=artifacts_dir)
    feat_cols, med = export_medians_and_schema(train_ds, out_dir=artifacts_dir)
    write_thresholds_yaml(th_low, th_high, model_version=os.path.basename(model_dir),out_dir=artifacts_dir, fpr_cap=fpr_cap)

    manifest = {
        "model_version": os.path.basename(model_dir),
        "trained_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "cutoff_time": str(cutoff),
        "train_size": int(len(train_raw)),
        "test_size": int(len(test_raw)),
        "class_weight_pos": float(w_pos),
        "metrics": {"pr_auc": pr_auc, "roc_auc": roc},
        "thresholds": {"low": th_low, "high": th_high, "fpr_cap": float(fpr_cap)},
        "feature_count": len(feat_cols),
    }
    with open(os.path.join(artifacts_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2) 

    holdout_raw_path = os.path.join(artifacts_dir, "holdout_raw.csv")
    test_raw.to_csv(holdout_raw_path, index=False)

    LOGGER.info("PR-AUC=%.3f | ROC-AUC=%.3f | th_low=%.3f | th_high=%.3f", pr_auc, roc, th_low, th_high)
    LOGGER.info("-" * 53)


    if mlflow_uri:
        mlflow.set_tracking_uri(mlflow_uri)
        LOGGER.info("MLflow tracking_uri = %s", mlflow_uri)

    mlflow.set_experiment(mlflow_exp)
    run_name = os.path.basename(model_dir)
    with mlflow.start_run(run_name=run_name):
        # Params/metrics
        mlflow.log_params({
            "model_type": "YDF.RandomForestLearner",
            "num_trees": 500,
            "max_depth": 16,
            "class_weight_pos": w_pos,
            "test_ratio": float(test_ratio),
            "fpr_cap": float(fpr_cap),
            "recall_tgt": float(recall_tgt),
            "feature_count": len(feat_cols),
        })
        mlflow.log_metrics({
            "pr_auc": pr_auc,
            "roc_auc": roc,
            "th_low": th_low,
            "th_high": th_high,
        })

        # Tags
        base_tags = {
            "stage": "training",
            "cutoff_time": str(cutoff),
            "model_version": os.path.basename(model_dir),
        }

        mlflow_tags_dict = None
        if mlflow_tags:
            try:
                mlflow_tags_dict = json.loads(mlflow_tags)
            except Exception as e:
                LOGGER.warning("Cannot parse --mlflow-tags JSON: %s", e)

        if mlflow_tags and isinstance(mlflow_tags_dict, dict):
            base_tags.update(mlflow_tags_dict)
        mlflow.set_tags(base_tags)

        ensure_azure_identity_env()
        # Log artifacts and model
        mlflow.log_artifacts(artifacts_dir, artifact_path="artifacts")
        mlflow.log_artifacts(model_dir,     artifact_path="ydf_model")

        #Chuẩn bị input_example và signature
        raw_cols = [c for c in train_raw.columns if c not in ("is_fraud", "transaction_seq")]
        input_example = train_raw[raw_cols].head(5).copy() # nên lấy 5 dòng để có đủ biến phân loại của tập huấn luyện
        Xe = prepare_features_for_inference(input_example, feat_cols, encoders, med, maybe_cats)
        probs_example = fraud_prob_from_model(model, Xe) # đầu ra tương ứng của input_example

        try:
            signature = infer_signature(input_example, probs_example)
        except Exception:
            signature = None

        # Log MLflow PyFunc model
        model_info = mlflow.pyfunc.log_model(
            artifact_path="model",
            python_model=FraudYDFPythonModel(),
            artifacts={"ydf_model": model_dir, "artifacts": artifacts_dir},
            signature=signature,
            input_example=input_example, 
            registered_model_name=registered_model_name 
        )

        try:
            mlflow.set_logged_model_tags(
                model_info.model_id,
                {"Training Info": "YDF fraud model via pyfunc", "cutoff_time": str(cutoff)}
            )
        except Exception as _:
    
            pass

        LOGGER.info("MLflow Logged run: %s", mlflow.active_run().info.run_id)
        LOGGER.info("MLflow Model URI: %s", model_info.model_uri)
        LOGGER.info("MLflow Registered name: %s", registered_model_name)

    return True  

def main():
    configure_logging()
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/data.csv")
    ap.add_argument("--artifacts-dir", default="artifacts")
    ap.add_argument("--model-dir",     default="models")
    ap.add_argument("--test-ratio", type=float, default=0.20)
    ap.add_argument("--fpr-cap",   type=float, default=0.01)
    ap.add_argument("--recall-tgt",type=float, default=0.80)
    ap.add_argument("--save-holdout", default="artifacts/holdout.csv")
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

    # ===== MLflow args =====
    ap.add_argument("--mlflow-uri",  default=settings.MLFLOW_TRACKING_URI, help="MLflow Tracking URI")
    ap.add_argument("--mlflow-exp",  default="KTDL-fraud-detection",help="Tên Experiment trong MLflow") 
    ap.add_argument("--mlflow-tags", default=None,help='JSON tags, VD: {"project":"KTDL-fraud_service","owner":"Group 9"}')
    ap.add_argument("--registered-model-name", default="KTDL-fraud-ydf",help="Tên model trong Model Registry")

    args = ap.parse_args()

    mlflow_uri = args.mlflow_uri or settings.MLFLOW_TRACKING_URI
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

    train_once(data_source,
               artifacts_dir=args.artifacts_dir, model_dir=args.model_dir,
               test_ratio=args.test_ratio, fpr_cap=args.fpr_cap, recall_tgt=args.recall_tgt,
               save_holdout=None, stamp=datetime.now().strftime("%Y%m%d-%H%M%S"),
               nest_version=True,
               mlflow_uri=mlflow_uri,
               mlflow_exp=args.mlflow_exp,
               mlflow_tags=args.mlflow_tags,
               registered_model_name=args.registered_model_name,
               pinot_cfg=pinot_cfg)

if __name__ == "__main__":
    main()
