import logging
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import json
import argparse
import tempfile

import numpy as np
import pandas as pd
import joblib
import ydf
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc

import mlflow
from mlflow.tracking import MlflowClient
from mlflow.exceptions import MlflowException
from mlflow.store.artifact.azure_blob_artifact_repo import AzureBlobArtifactRepository
from app.config import settings

from app.preprocess import df_align
from utils.logging_utils import configure_logging
from utils.azure import (
    configure_azure_credentials_from_settings,
    ensure_azure_identity_env,
)

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
        # Fallback for MLflow versions where AzureBlobArtifactRepository receives the
        # tracking URI as the "client" positional argument, resulting in a str client.
        run = client.get_run(run_id)
        repo = AzureBlobArtifactRepository(run.info.artifact_uri)
        try:
            return repo.download_artifacts(artifact_path, tmp_root)
        except Exception:
            raise exc

# Tìm tệp đầu tiên phù hợp với tiền tố và phần mở rộng
def _find_first(root: str, prefixes, exts):

    if not os.path.isdir(root):
        return None
    cands = []
    for fn in os.listdir(root):
        if any(fn.startswith(p) for p in prefixes) and any(fn.endswith(e) for e in exts):
            cands.append(os.path.join(root, fn))
    if not cands:
        return None
    cands.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return cands[0]

# Load schema and medians từ thư mục artifact
def _load_schema_medians_from_dir(art_dir: str):
 
    both = _find_first(art_dir, ["medians_schema", "schema_medians"], [".json"])
    if both:
        with open(both, "r", encoding="utf-8") as f:
            obj = json.load(f)
        feat_cols = obj.get("feature_columns") or obj.get("schema") or obj.get("feature_schema")
        med = obj.get("medians") or obj.get("feature_medians")
        if feat_cols and med:
            print("1Loaded schema and medians from", both)
            return feat_cols, med


    med_p = _find_first(art_dir, ["medians", "feature_medians"], [".json"])
    sch_p = _find_first(art_dir, ["schema", "feature_schema"], [".json"])

    feat_cols = None
    med = None

    if med_p:
        with open(med_p, "r", encoding="utf-8") as f:
            obj = json.load(f)
        med = obj.get("medians") or obj  
        if "feature_columns" in obj:
            feat_cols = obj["feature_columns"]

    if sch_p and not feat_cols:
        with open(sch_p, "r", encoding="utf-8") as f:
            sch = json.load(f)
        feat_cols = sch.get("feature_columns") or sch
    print("2Loaded schema and medians from", med_p, sch_p)
    return feat_cols, med

# Load ordinal encoder từ thư mục artifact
def _load_ordinal_encoder_from_dir(art_dir: str):

    epath = _find_first(art_dir, ["encoders"], [".pkl", ".joblib"])
    if not epath:
        raise FileNotFoundError(f"Cannot find encoders*.pkl/.joblib in {art_dir}")
    encoders = joblib.load(epath)
    meta = encoders.get("ordinal")
    if not meta or "cols" not in meta or "enc" not in meta:
        raise ValueError(f"Bad encoders structure at {epath}")
    return meta["cols"], meta["enc"]

# Làm sạch dữ liệu số theo schema và medians
def _sanitize_numeric_by_schema(df_like: pd.DataFrame, feat_cols, medians):
    X = df_like.copy()
    for c in feat_cols:
        if c not in X.columns:
            X[c] = np.nan
    X = X[feat_cols]
    for c in feat_cols:
        X[c] = pd.to_numeric(X[c], errors="coerce").fillna(medians.get(c, 0.0))
    return X

# Mã hóa với bộ mã hóa đã cho
def _encode_with(enc, cols, df_fe):
    df = df_fe.copy()
    miss = [c for c in cols if c not in df.columns]
    for c in miss:
        df[c] = "Unknown"
    for c in cols:
        df[c] = df[c].astype("string").fillna("Unknown")
 
    others = [c for c in df.columns if c not in cols]
    df = df[others + cols]
    df[cols] = enc.transform(df[cols])
    return df

# Đánh giá mô hình thông qua artifacts trong registry
def _score_via_registry_artifacts(client: MlflowClient, run_id: str, eval_raw: pd.DataFrame):

    print("LOADING artifacts from run_id =", run_id)
    ydf_dir = _download_artifact_dir(client, run_id, "ydf_model") # Tải mô hình YDF
    arts_dir = _download_artifact_dir(client, run_id, "artifacts") # Tải artifacts khác

    print("Preparing evaluation data...")
    drop_cols = ["is_fraud", "transaction_seq"]
    X_raw = eval_raw.drop(columns=[c for c in drop_cols if c in eval_raw.columns], errors="ignore")
    X_fe = df_align(X_raw)

    cat_cols, enc = _load_ordinal_encoder_from_dir(arts_dir)
    X_enc = _encode_with(enc, cat_cols, X_fe)

    feat_cols, medians = _load_schema_medians_from_dir(arts_dir)
    if not feat_cols or not medians:
        raise RuntimeError(f"Missing feature schema/medians under {arts_dir}")
    X = _sanitize_numeric_by_schema(X_enc, feat_cols, medians)

    print("Scoring via YDF model...")
    m = ydf.load_model(ydf_dir)
    p_no = m.predict(X).astype(float)
    s = 1.0 - p_no  # P(FRAUD)

    y = (eval_raw["label"].map({1: 1, 0: 0}).astype(int)).to_numpy() # Lấy nhãn thực tế
    if len(np.unique(y)) < 2:
        raise SystemExit("Only one class present in eval slice; ROC/PR undefined.")
    
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


def main():
    configure_logging()
    ap = argparse.ArgumentParser(
        description="Compare two MLflow Registry versions on the common FUTURE slice (after both cutoffs). Prints ONLY the winner's version."
    )
    ap.add_argument("--mlflow-uri", default=settings.MLFLOW_TRACKING_URI)
    ap.add_argument("--registered-model-name", default=settings.MLFLOW_MODEL_NAME)
    ap.add_argument("--versions", nargs=2, default=None, help="Chỉ định 2 version cụ thể, ví dụ: 12 13")
    ap.add_argument("--prefer-stages",nargs="*",default=None,help="Ưu tiên theo stage khi chọn 2 bản (vd: Staging None). Nếu bỏ trống → lấy 2 bản mới nhất theo creation_time.",)
    args = ap.parse_args()

    mlflow_uri = args.mlflow_uri 

    if mlflow_uri:
        mlflow.set_tracking_uri(mlflow_uri)
        LOGGER.info("MLflow tracking_uri = %s", mlflow_uri)

    ensure_azure_identity_env()
    client = MlflowClient()
    name = args.registered_model_name

    if args.versions:
        versions = [str(v) for v in args.versions]
    else:
        all_mv = client.search_model_versions(f"name='{name}'")
        if not all_mv or len(all_mv) < 2:
            raise SystemExit(f"Need >=2 versions in registry for {name}")

        if args.prefer_stages:
            stage_rank = {st.upper(): i for i, st in enumerate([s.upper() for s in args.prefer_stages])}
            all_mv.sort(key=lambda x: (stage_rank.get(str(x.current_stage).upper(), 9999), -int(x.creation_timestamp)))
        else:
            all_mv.sort(key=lambda x: -int(x.creation_timestamp))

        versions = [all_mv[0].version, all_mv[1].version]

    v1, v2 = str(versions[0]), str(versions[1])
    LOGGER.info("Comparing versions: %s vs %s of model '%s'", v1, v2, name)
    mv1 = client.get_model_version(name, v1)
    mv2 = client.get_model_version(name, v2)
    LOGGER.info(" - Version %s: stage=%s, created_at=%s", v1, mv1.current_stage, mv1.creation_timestamp)
    LOGGER.info(" - Version %s: stage=%s, created_at=%s", v2, mv2.current_stage, mv2.creation_timestamp)

    man1, raw1 = _load_manifest_and_holdout(client, mv1.run_id)
    man2, raw2 = _load_manifest_and_holdout(client, mv2.run_id)

    LOGGER.info(" - Holdout sizes: v%s n=%s, v%s n=%s", v1, len(raw1), v2, len(raw2))
    LOGGER.info(" manifest v%s cutoff=%s, v%s cutoff=%s", v1, man1.get("cutoff_time"), v2, man2.get("cutoff_time"))
    LOGGER.info("Preparing common evaluation slice after both cutoffs...")

    cut1 = pd.to_datetime(man1.get("cutoff_time"))
    cut2 = pd.to_datetime(man2.get("cutoff_time"))
    cutoff_global = max(cut1, cut2)

    for df in (raw1, raw2):
        df["create_dt"] = pd.to_datetime(df["create_dt"], errors="coerce")# Chuyển đổi sang datetime

    eval_raw = pd.concat([raw1, raw2], ignore_index=True)
    eval_raw = eval_raw[eval_raw["create_dt"] >= cutoff_global].copy()# Lấy slice sau cutoff chung để tránh rò rỉ dữ liệu

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


if __name__ == "__main__":
    result = main()
    if result is not None:
        sys.stdout.write(f"{result}\n")
