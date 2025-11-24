import logging
import os
import os, json
from datetime import datetime
import numpy as np, pandas as pd, ydf
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc
from sklearn.preprocessing import StandardScaler
import mlflow
import mlflow.pyfunc
from mlflow.models import infer_signature
from app.preprocess import df_align, encode_categoricals, prepare_features_for_inference,sanitize_for_model
from utils.encoders import export_encoders
from utils.medians import export_medians_and_schema
from utils.thresholds import write_thresholds_yaml
from utils.common import split_oot, fraud_prob_from_model, compute_thresholds
from utils.azure import (
    configure_azure_credentials_from_settings,
    ensure_azure_identity_env,
)
from utils.artifact_loaders import load_encoders_flexible, load_medians_and_schema_flexible
from scripts.config import settings
from utils.logging_utils import configure_logging
from typing import Optional
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


# Định nghĩa lớp mô hình MLflow pyfunc
class FraudYDFPythonModel(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
  
        self.model_dir = context.artifacts["ydf_model"]
        self.artifacts_dir = context.artifacts["artifacts"]

        self.model = ydf.load_model(self.model_dir)

        try:
            self.encoders = load_encoders_flexible(self.artifacts_dir)
        except Exception as e:
            raise RuntimeError(f"Cannot load encoders: {e}")

        self.schema, self.medians, self.clipping_bounds = load_medians_and_schema_flexible(self.artifacts_dir)

        self.maybe_cats = ["receiving_country","country_code","id_type","stay_qualify","payment_method"]
        self.feat_cols = self.schema 
        
        if not isinstance(self.feat_cols, list):
             if isinstance(self.schema, dict):
                 self.feat_cols = self.schema.get("feature_columns") or self.schema.get("schema")
             else:
                 raise ValueError("Could not extract feature_columns list from schema.")

    def predict(self, context, model_input: pd.DataFrame):
        """
        Tiền xử lý dữ liệu đầu vào mới (model_input) và dự đoán xác suất gian lận.
        """
        X_ready = prepare_features_for_inference(
            df_raw=model_input,
            feat_cols=self.feat_cols,  # Danh sách cột cuối cùng
            encoders=self.encoders,
            medians=self.medians,
            maybe_cats=self.maybe_cats,
            clipping_bounds=self.clipping_bounds # ÁP DỤNG NGƯỠNG ĐÃ HỌC
        )
        if X_ready.shape[1] != len(self.feat_cols):
             raise ValueError(f"Feature mismatch: Expected {len(self.feat_cols)} cols, got {X_ready.shape[1]}")
        # Dự đoán xác suất
        probs = fraud_prob_from_model(self.model, X_ready)
        return probs
    
# Định nghĩa ngoại lệ để bỏ qua huấn luyện
class SkipTraining(RuntimeError):
   """Raised to signal that this window should skip training (e.g., label issues)."""
   pass
# Hàm huấn luyện một lần
def train_once(data_path: Optional[str],
               artifacts_dir: str, model_dir: str,
               test_ratio: float = 0.20, fpr_cap: float = 0.01, recall_tgt: float = 0.80,
               save_holdout: str = None,
               stamp: str = None,
               nest_version: bool = True,
               # MLflow
               mlflow_exp: str = "KTDL-fraud-detection",
               mlflow_tags: dict = None,
               registered_model_name: str = "KTDL-fraud-ydf",
               pinot_cfg: Optional[dict] = None
               ):
    data_source_desc = data_path if pinot_cfg is None else f"Pinot table={pinot_cfg['table']}"
    LOGGER.info("Starting training with data source=%s", data_source_desc)
    LOGGER.info("Artifacts dir: %s, Model dir: %s", artifacts_dir, model_dir)
    LOGGER.info("Test ratio: %s, FPR cap: %s, Recall target: %s", test_ratio, fpr_cap, recall_tgt)
    LOGGER.info("Experiment: %s, Registered model name: %s",  mlflow_exp, registered_model_name)
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

    # load
  # load data
    df = load_training_dataframe(data_path, pinot_cfg)

    prep_df = df.copy()
    # Điền giá trị thiếu cho cột chuỗi bằng 'Unknown' để encode ổn định
    string_cols = prep_df.select_dtypes(include=['object']).columns
    for col in string_cols:
        prep_df[col] = prep_df[col].fillna('Unknown')#Nếu giá trị thiếu thì điền 'Unknown'

    # Cắt ngoại lệ bằng IQR cho các cột amount. Giới hạn giá trị trong khoảng [lower, upper]
    amount_cols = [c for c in prep_df.columns if 'deposit_amount' in c] 
    clipping_bounds = {}
    for col in amount_cols:
        series = pd.to_numeric(prep_df[col], errors='coerce')
        q1, q3 = series.quantile([0.25, 0.75])# [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], thì Q1 = 3.25 và Q3 = 7.75
        iqr = q3 - q1 #Tính IQR. ví dụ IQR = Q3 - Q1 = 7.75 - 3.25 = 4.5
        upper = q3 + 1.5 * iqr 
        lower = max(q1 - 1.5 * iqr, 0) 
        prep_df[col] = series.clip(lower=lower, upper=upper)# lower = 0 và upper = 14.5, giá trị < 0 -> 0, giá trị > 14.5 -> 14.5
        clipping_bounds[col] = [float(lower), float(upper)]

    # split
    train_raw, test_raw, cutoff = split_oot(prep_df, test_ratio=test_ratio)
    LOGGER.info("Cutoff time: %s | Train=%s Test=%s", cutoff, f"{len(train_raw):,}", f"{len(test_raw):,}")
    LOGGER.info("Train label counts: %s", train_raw["label"].value_counts().to_dict())
    LOGGER.info("Test  label counts: %s", test_raw["label"].value_counts().to_dict())

    # FE
    drop_cols = ["label", "transaction_seq"]
    Xtr = df_align(train_raw.drop(columns=[c for c in drop_cols if c in train_raw.columns], errors="ignore"))
    Xte = df_align(test_raw .drop(columns=[c for c in drop_cols if c in test_raw.columns],  errors="ignore"))

    # encode
    maybe_cats = ["receiving_country","country_code","id_type","stay_qualify","payment_method", "payment_method_filled"]
    cat_cols = [c for c in maybe_cats if c in Xtr.columns]
    Xtr_enc, encoders = encode_categoricals(Xtr, cat_cols, encoders=None)
    Xte_enc, _ = encode_categoricals(Xte, cat_cols, encoders=encoders)

    # label
    ytr = train_raw["label"].map({0:"NO_FRAUD", 1:"FRAUD"})
    yte = test_raw ["label"].map({0:"NO_FRAUD", 1:"FRAUD"})
   
    # sanitize_for_model
    feat_cols, med = export_medians_and_schema(Xtr_enc, out_dir=artifacts_dir, clipping_bounds=clipping_bounds)
    Xtr_sanitize = sanitize_for_model(Xtr_enc, feat_cols, med)
    Xte_sanitize = sanitize_for_model(Xte_enc, feat_cols, med)

    # numeric_cols = Xtr_enc.select_dtypes(include=['number']).columns # chọn các cột số
    # scaler = StandardScaler() # Chuẩn hoá dữ liệu về phân phối chuẩn (mean=0, std=1) để cho huấn luyện mô hình được tốt hơn bởi vì nhiều thuật toán ML nhạy cảm với thang đo của dữ liệu(KNN)
    # Xtr_scaled = Xtr_sanitize.copy()
    # Xtr_scaled[numeric_cols] = scaler.fit_transform(Xtr_scaled[numeric_cols])
    # Xte_scaled = Xte_sanitize.copy()
    # Xte_scaled[numeric_cols] = scaler.transform(Xte_scaled[numeric_cols])

    train_ds = Xtr_sanitize.copy(); train_ds["is_fraud"] = ytr.values
    test_ds  = Xte_sanitize.copy(); test_ds ["is_fraud"] = yte.values

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
    y_true = (test_ds["is_fraud"].to_numpy()=="FRAUD").astype(int)
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
    write_thresholds_yaml(th_low, th_high, model_version=os.path.basename(model_dir),
                          out_dir=artifacts_dir, fpr_cap=fpr_cap)
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
            "train_size": int(len(train_raw)),
            "test_size": int(len(test_raw)),
            "clipping_bounds": json.dumps(clipping_bounds),
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
        mlflow.log_artifacts(artifacts_dir, artifact_path="artifacts")
        mlflow.log_artifacts(model_dir,     artifact_path="ydf_model")

        raw_cols = [c for c in train_raw.columns if c not in ("is_fraud", "transaction_seq")]
        input_example = train_raw[raw_cols].head(5).copy() 

        Xe = prepare_features_for_inference(input_example, feat_cols, encoders, med, maybe_cats,clipping_bounds)
        probs_example = fraud_prob_from_model(model, Xe)

        try:
            signature = infer_signature(input_example, probs_example)
        except Exception:
            signature = None

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
