import logging
import os, yaml

LOGGER = logging.getLogger(__name__)


def write_thresholds_yaml(th_low: float, th_high: float, model_version: str = "ydf_rf_fraud_v1", out_dir: str = "artifacts", fpr_cap: float = 0.01, name: str = "thresholds") -> str:
    os.makedirs(out_dir, exist_ok=True)
    blob = {
        "model_version": model_version,
        "threshold_low": float(th_low),
        "threshold_high": float(th_high),
        "fpr_cap": float(fpr_cap),
    }
    path = os.path.join(out_dir, "{name}.yaml").format(name=name)
    with open(path, "w") as f:
        yaml.safe_dump(blob, f, allow_unicode=True)
    # LOGGER.info("Wrote %s", path)
    return path
