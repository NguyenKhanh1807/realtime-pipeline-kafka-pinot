import logging
import os, joblib

LOGGER = logging.getLogger(__name__)

def export_encoders(encoders, out_dir: str = "artifacts", name: str = "encoders") -> str:
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "{name}.pkl").format(name=name)
    joblib.dump(encoders, path)
    # LOGGER.info("Wrote %s", path)
    return path
