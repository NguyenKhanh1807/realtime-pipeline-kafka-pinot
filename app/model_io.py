import logging
import yaml, pandas as pd, os, tempfile
import mlflow
from mlflow.tracking import MlflowClient
from mlflow.store.artifact.azure_blob_artifact_repo import AzureBlobArtifactRepository
from app.config import settings

LOGGER = logging.getLogger(__name__)

# Load thresholds from local artifacts
def load_thresholds():
    return load_thresholds_from_file(os.path.join(settings.ARTIFACTS_DIR_USE, "thresholds.yaml"))

# Load model and artifacts from MLflow Registry
def _load_from_mlflow():
    mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
    alias = settings.MLFLOW_MODEL_ALIAS or "Production"
    model_uri = f"models:/{settings.MLFLOW_MODEL_NAME}@{alias}"
    LOGGER.info("Loading model URI: %s", model_uri)

    pyfunc_model = mlflow.pyfunc.load_model(model_uri)
    if not pyfunc_model:
        raise RuntimeError(f"Failed to load model from URI: {model_uri}")
    LOGGER.info("Loaded pyfunc model successfully from MLflow.")

    client = MlflowClient()
    mv = client.get_model_version_by_alias(settings.MLFLOW_MODEL_NAME, alias)
    LOGGER.info("Loaded model version: %s, run_id: %s", mv.version, mv.run_id)
    run = client.get_run(mv.run_id)
   
    # Tải thresholdsl
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

    # Trích xuất đối tượng PythonModel (FraudYDFPythonModel)
    py_model = getattr(pyfunc_model, "_model_impl", None)
    if py_model and hasattr(py_model, "python_model"):
        py_model = py_model.python_model
        LOGGER.info("Loaded python_model: %s", type(py_model))
    else:
        py_model = None

    # tải trong FraudYDFPythonModel.load_context()
    model = getattr(py_model, "model", pyfunc_model) 
    encoders = getattr(py_model, "encoders", None) 
    medians = getattr(py_model, "medians", {}) 
    clipping_bounds = getattr(py_model, "clipping_bounds", None)
    feat_cols = getattr(py_model, "feat_cols", [])

    # Logic dự phòng (nếu feat_cols không được gán trực tiếp trong py_model)
    if not feat_cols:
        LOGGER.warning("Could not find 'feat_cols' attribute, falling back to 'schema' blob...")
        schema_blob = getattr(py_model, "schema", {})
        if isinstance(schema_blob, dict):
            feat_cols = schema_blob.get("feature_columns") or schema_blob.get("schema") or []
        elif isinstance(schema_blob, list):
             feat_cols = schema_blob

    # Tái tạo một DataFrame mẫu (có thể dùng để khởi tạo hoặc kiểm tra)
    train_like = pd.DataFrame({c: [medians.get(c, 0.0)] for c in feat_cols})

    schema_pack = (feat_cols, medians, clipping_bounds, train_like)
    return model, encoders, schema_pack, thresholds, run.data.metrics

   
# Load thresholds from a YAML file
def load_thresholds_from_file(path: str):
    with open(path, "r") as f:
        return yaml.safe_load(f)

# Load model and artifacts (either from MLflow or use mock for testing)
def load_model_and_artifacts():
    LOGGER.info("load_model_and_artifacts() called")
    if settings.MLFLOW_MODEL_NAME and settings.MLFLOW_TRACKING_URI:
        try:
            model, encoders, schema_pack, thresholds, metrics = _load_from_mlflow()
            if thresholds.get("threshold_low") is None and metrics:
                thresholds["threshold_low"] = metrics.get("th_low")
            if thresholds.get("threshold_high") is None and metrics:
                thresholds["threshold_high"] = metrics.get("th_high")
            if thresholds.get("fpr_cap") is None and metrics:
                thresholds["fpr_cap"] = metrics.get("fpr_cap")

            LOGGER.info("Loaded thresholds: %s", thresholds)

            clipping_keys_count = len(schema_pack[2]) if schema_pack[2] else 0
            LOGGER.info("Loaded schema pack: feat_cols=%s, medians_keys_sample=%s, clipping_bounds_count=%s",
                        len(schema_pack[0]), list(schema_pack[1].keys())[:5], clipping_keys_count)

            LOGGER.info("Loaded encoders: %s", type(encoders))
            LOGGER.info("Loaded model: %s", type(model))
            return model, encoders, schema_pack, thresholds
        except Exception as e:
            LOGGER.warning(f"Failed to load from MLflow: {e}. Falling back to mock model.")
            return _load_mock_model()
    else:
        LOGGER.info("No MLflow configuration found, using mock model for testing")
        return _load_mock_model()


def _load_mock_model():
    """Load a mock model for testing when MLflow is not available or fails"""
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    import pickle

    LOGGER.info("Loading mock model for testing...")

    # Create mock feature columns (based on your Tx model)
    feat_cols = [
        'deposit_amount', 'receiving_country', 'country_code', 'id_type',
        'stay_qualify', 'payment_method', 'create_dt', 'register_date',
        'first_transaction_date', 'birth_date', 'recheck_date', 'face_pin_date',
        'transaction_count_24hour', 'transaction_amount_24hour', 'transaction_count_1week',
        'transaction_amount_1week', 'transaction_count_1month', 'transaction_amount_1month'
    ]

    # Create mock medians
    medians = {col: 0.0 for col in feat_cols}

    # Create mock clipping bounds
    clipping_bounds = {col: (0.0, 1000000.0) for col in feat_cols if 'amount' in col}
    clipping_bounds.update({col: (0, 1000) for col in feat_cols if 'count' in col})

    # Create a simple mock model
    mock_model = RandomForestClassifier(n_estimators=10, random_state=42)

    # Train on dummy data
    dummy_X = pd.DataFrame({col: [0.0] * 100 for col in feat_cols})
    dummy_y = [0] * 50 + [1] * 50
    mock_model.fit(dummy_X, dummy_y)

    # Mock thresholds
    thresholds = {
        "threshold_low": 0.3,
        "threshold_high": 0.7,
        "model_version": "mock-v1.0",
        "registry_version": "mock-v1.0"
    }

    # Mock encoders (empty for simplicity)
    encoders = {}

    # Create schema pack
    train_like = pd.DataFrame({c: [medians.get(c, 0.0)] for c in feat_cols})
    schema_pack = (feat_cols, medians, clipping_bounds, train_like)

    LOGGER.info("Mock model loaded successfully")
    return mock_model, encoders, schema_pack, thresholds

