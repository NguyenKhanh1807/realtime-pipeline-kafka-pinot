import logging
import os
import json
import tempfile
import numpy as np
import pandas as pd
import ydf
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc
from mlflow.tracking import MlflowClient
from mlflow.exceptions import MlflowException
from mlflow.store.artifact.azure_blob_artifact_repo import AzureBlobArtifactRepository
from utils.azure import (
    configure_azure_credentials_from_settings,
)

from app.preprocess import prepare_features_for_inference
from utils.artifact_loaders import load_encoders_flexible, load_medians_and_schema_flexible

# Cấu hình xác thực Azure từ cài đặt
configure_azure_credentials_from_settings()
LOGGER = logging.getLogger(__name__)

# Tải xuống thư mục artifact từ MLflow
def _download_artifact_dir(client: MlflowClient, run_id: str, artifact_path: str) -> str:

    tmp_root = tempfile.mkdtemp()
    try:
        client.download_artifacts(run_id, artifact_path, tmp_root)
    except MlflowException as exc:
        run = client.get_run(run_id)
        repo = AzureBlobArtifactRepository(run.info.artifact_uri)
        try:
            repo.download_artifacts(artifact_path, tmp_root)
        except Exception:
            raise exc
    return os.path.join(tmp_root, os.path.basename(artifact_path))

# Tải xuống tệp artifact từ MLflow
def _download_artifact_file(client: MlflowClient, run_id: str, artifact_path: str) -> str:

    tmp_root = tempfile.mkdtemp()
    try:
        return client.download_artifacts(run_id, artifact_path, tmp_root)
    except MlflowException as exc:
        run = client.get_run(run_id)
        repo = AzureBlobArtifactRepository(run.info.artifact_uri)
        try:
            return repo.download_artifacts(artifact_path, tmp_root)
        except Exception:
            raise exc

# Đánh giá mô hình thông qua artifacts trong registry
def _score_via_registry_artifacts(client: MlflowClient, run_id: str, eval_raw: pd.DataFrame):
    y = (eval_raw["label"].map({1: 1, 0: 0}).astype(int)).to_numpy()
    if len(np.unique(y)) < 2:
        raise SystemExit("Only one class present in eval slice; ROC/PR undefined.")

    print("LOADING artifacts from run_id =", run_id)
    ydf_dir = _download_artifact_dir(client, run_id, "ydf_model") # Tải mô hình YDF
    arts_dir = _download_artifact_dir(client, run_id, "artifacts") # Tải artifacts khác

    print("Preparing evaluation data...")
    # Tải tất cả artifacts 
    try:
        encoders = load_encoders_flexible(arts_dir)
        schema, medians, clipping_bounds = load_medians_and_schema_flexible(arts_dir)
        feat_cols = schema
        if isinstance(schema, dict):
            feat_cols = schema.get("feature_columns") or schema.get("schema")
        if not isinstance(feat_cols, list):
             raise ValueError("Could not extract feature_columns list from schema.")  
    except Exception as e:
        raise RuntimeError(f"Failed to load artifacts from {arts_dir}: {e}")
    
    # Pipeline tiền xử lý
    X = prepare_features_for_inference(
        df_raw=eval_raw,
        feat_cols=feat_cols,
        encoders=encoders,
        medians=medians,
        maybe_cats=["receiving_country","country_code","id_type","stay_qualify","payment_method"],
        clipping_bounds=clipping_bounds
    )

    print("Scoring via YDF model...")
    m = ydf.load_model(ydf_dir)
    p_no = m.predict(X).astype(float)
    s = 1.0 - p_no  # P(FRAUD)

    print("Computing metrics...")
    prec, rec, _ = precision_recall_curve(y, s)
    return float(auc(rec, prec)), float(roc_auc_score(y, s)), len(y)

# Load manifest và holdout_raw từ run_id
def _load_manifest_and_holdout(client: MlflowClient, run_id: str):
    man_path = _download_artifact_file(client, run_id, "artifacts/manifest.json")
    with open(man_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    holdout_path = _download_artifact_file(client, run_id, "artifacts/holdout_raw.csv")
    holdout_raw = pd.read_csv(holdout_path)
    return manifest, holdout_raw

# SỬA: Biến hàm main() thành hàm có thể gọi
def compare_and_get_winner(
    client: MlflowClient, 
    registered_model_name: str, 
    versions: list = None, 
) -> str:
    """
    So sánh hai phiên bản mô hình và trả về version của người chiến thắng.
    """
    name = registered_model_name

    if versions:
        versions = [str(v) for v in versions]
    else:
        all_mv = client.search_model_versions(f"name='{name}'")
        if not all_mv or len(all_mv) < 2:
            raise SystemExit(f"Need >=2 versions in registry for {name}")
        all_mv.sort(key=lambda x: -int(x.creation_timestamp))
        versions = [all_mv[0].version, all_mv[1].version]

    v1, v2 = str(versions[0]), str(versions[1])

    mv1 = client.get_model_version(name, v1)
    mv2 = client.get_model_version(name, v2)
  
    man1, raw1 = _load_manifest_and_holdout(client, mv1.run_id)
    man2, raw2 = _load_manifest_and_holdout(client, mv2.run_id)

    LOGGER.info("Comparing versions: %s vs %s of model '%s'", v1, v2, name)
    LOGGER.info(" - Version %s: stage=%s, created_at=%s", v1, mv1.current_stage, mv1.creation_timestamp)
    LOGGER.info(" - Version %s: stage=%s, created_at=%s", v2, mv2.current_stage, mv2.creation_timestamp)
    LOGGER.info(" - Holdout sizes: v%s n=%s, v%s n=%s", v1, len(raw1), v2, len(raw2))
    LOGGER.info(" - manifest v%s cutoff=%s, v%s cutoff=%s", v1, man1.get("cutoff_time"), v2, man2.get("cutoff_time"))
    LOGGER.info("Preparing common evaluation slice after both cutoffs...")

    cut1 = pd.to_datetime(man1.get("cutoff_time"))
    cut2 = pd.to_datetime(man2.get("cutoff_time"))
    cutoff_global = max(cut1, cut2)

    for df in (raw1, raw2):
        df["create_dt"] = pd.to_datetime(df["create_dt"], errors="coerce")

    eval_raw = pd.concat([raw1, raw2], ignore_index=True)
    eval_raw = eval_raw[eval_raw["create_dt"] >= cutoff_global].copy()

    if "transaction_seq" in eval_raw.columns: 
        eval_raw = eval_raw.drop_duplicates(subset=["transaction_seq"]).reset_index(drop=True)

    if len(eval_raw) == 0:
        raise SystemExit("Empty evaluation slice after both cutoffs. Check windows/holdouts logging.")

    pr1, roc1, n = _score_via_registry_artifacts(client, mv1.run_id, eval_raw)
    pr2, roc2, _ = _score_via_registry_artifacts(client, mv2.run_id, eval_raw)

    df_out = pd.DataFrame(
        [
            {"version": v1, "PR_AUC": pr1, "ROC_AUC": roc1, "n_eval": n, "cutoff_used": cutoff_global},
            {"version": v2, "PR_AUC": pr2, "ROC_AUC": roc2, "n_eval": n, "cutoff_used": cutoff_global},
        ]
    )
    #ROC-AUC : Xác suất mẫu dương ngẫu nhiên được xếp hạng cao hơn mẫu âm ngẫu nhiên. đánh giá ai “đáng ngờ” chuẩn hơn
    #PR-AUC : Độ chính xác. Thể hiện thực tế “gắn cờ có sạch không” liên quan recall (tỷ lệ phát hiện đúng)
    LOGGER.info("\n%s", df_out.to_string(index=False))

    if np.isclose(pr1, pr2):
        if np.isclose(roc1, roc2):
            winner = str(max(int(v1), int(v2)))
        else:
            winner = v1 if roc1 >= roc2 else v2
    else:
        winner = v1 if pr1 >= pr2 else v2

    LOGGER.info("Winner version: %s", winner)
    return winner
