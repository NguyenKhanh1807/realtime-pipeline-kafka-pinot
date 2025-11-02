import logging
import json, yaml, joblib, pandas as pd, os, tempfile
import ydf
import mlflow
from mlflow.tracking import MlflowClient
from mlflow.exceptions import MlflowException
from mlflow.store.artifact.azure_blob_artifact_repo import AzureBlobArtifactRepository
from app.config import settings

LOGGER = logging.getLogger(__name__)

def load_thresholds():
    return load_thresholds_from_file(os.path.join(settings.ARTIFACTS_DIR, "thresholds.yaml"))


def load_medians_and_schema():
    with open(os.path.join(settings.ARTIFACTS_DIR, "medians.json"), "r") as f:
        blob = json.load(f)
    return blob["feature_columns"], blob["medians"]

def load_encoders():
    return joblib.load(os.path.join(settings.ARTIFACTS_DIR, "encoders.pkl"))

def _load_from_mlflow():
    LOGGER.info("Loading model from MLflow Registry...")
    if not settings.MLFLOW_MODEL_NAME:
        raise RuntimeError("MLFLOW_MODEL_NAME is not configured.")
    LOGGER.info("Model name: %s, alias: %s", settings.MLFLOW_MODEL_NAME, settings.MLFLOW_MODEL_ALIAS or "production")
    if settings.MLFLOW_TRACKING_URI:
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    LOGGER.info("MLflow tracking URI: %s", settings.MLFLOW_TRACKING_URI)

    alias = settings.MLFLOW_MODEL_ALIAS or "production"
    model_uri = f"models:/{settings.MLFLOW_MODEL_NAME}@{alias}"
    LOGGER.info("Loading model URI: %s", model_uri)
    pyfunc_model = mlflow.pyfunc.load_model(model_uri)
    if not pyfunc_model:
        raise RuntimeError(f"Failed to load model from URI: {model_uri}")

    client = MlflowClient()
    mv = client.get_model_version_by_alias(settings.MLFLOW_MODEL_NAME, alias)
    LOGGER.info("Loaded model version: %s, run_id: %s", mv.version, mv.run_id)
    run = client.get_run(mv.run_id)
  
    with tempfile.TemporaryDirectory() as tmp:
        try:
            th_path = client.download_artifacts(mv.run_id, "artifacts/thresholds.yaml", tmp)
        except mlflow.exceptions.MlflowException:
            repo = mlflow.store.artifact.azure_blob_artifact_repo.AzureBlobArtifactRepository(run.info.artifact_uri)
            th_path = repo.download_artifacts("artifacts/thresholds.yaml", tmp)
        thresholds = load_thresholds_from_file(th_path)

    thresholds.setdefault("registry_version", mv.version)
    thresholds.setdefault("run_id", mv.run_id)
    thresholds["model_version_registry"] = str(mv.version)

    py_model = getattr(pyfunc_model, "_model_impl", None)
    if py_model and hasattr(py_model, "python_model"):
        py_model = py_model.python_model
        LOGGER.info("Loaded python_model: %s", type(py_model))
    else:
        py_model = None

    if py_model and hasattr(py_model, "model"):
        model = py_model.model
    else:
        model = pyfunc_model

    encoders = getattr(py_model, "encoders", None)
    med_blob = getattr(py_model, "medians", None)
    schema_blob = getattr(py_model, "schema", None)

    feat_cols = []
    medians = {}
    if isinstance(med_blob, dict):
        if "feature_columns" in med_blob and "medians" in med_blob:
            feat_cols = list(med_blob["feature_columns"])
            medians = dict(med_blob["medians"])
        else:
            medians = dict(med_blob)
    if not feat_cols:
        if isinstance(schema_blob, list):
            feat_cols = list(schema_blob)
        elif isinstance(schema_blob, dict) and "feature_columns" in schema_blob:
            feat_cols = list(schema_blob["feature_columns"])

    train_like = pd.DataFrame({c: [medians.get(c, 0.0)] for c in feat_cols})
    return model, encoders, (feat_cols, medians, train_like), thresholds, run.data.metrics


def load_thresholds_from_file(path: str):
    with open(path, "r") as f:
        return yaml.safe_load(f)


def load_model_and_artifacts():
    LOGGER.info("load_model_and_artifacts() called")
    LOGGER.info("MLFLOW_MODEL_NAME: %s", settings.MLFLOW_MODEL_NAME)
    if settings.MLFLOW_MODEL_NAME:
        LOGGER.info("Loading model and artifacts from MLflow Registry...")
        model, encoders, schema_pack, thresholds, metrics = _load_from_mlflow()
        if thresholds.get("threshold_low") is None and metrics:
            thresholds["threshold_low"] = metrics.get("th_low")
        if thresholds.get("threshold_high") is None and metrics:
            thresholds["threshold_high"] = metrics.get("th_high")
        if thresholds.get("fpr_cap") is None and metrics:
            thresholds["fpr_cap"] = metrics.get("fpr_cap")
            
        LOGGER.info("Loaded thresholds: %s", thresholds)
        LOGGER.info("Loaded schema pack: feat_cols=%s, medians_keys_sample=%s", len(schema_pack[0]), list(schema_pack[1].keys())[:5])
        LOGGER.info("Loaded encoders: %s", type(encoders))
        LOGGER.info("Loaded model: %s", type(model))
        return model, encoders, schema_pack, thresholds

    LOGGER.info("Loading model and artifacts from local disk...")
    model = ydf.load_model(settings.MODEL_DIR)
    encoders = load_encoders()
    feat_cols, medians = load_medians_and_schema()
    thresholds = load_thresholds()
    train_like = pd.DataFrame({c: [medians.get(c, 0.0)] for c in feat_cols})
    return model, encoders, (feat_cols, medians, train_like), thresholds
