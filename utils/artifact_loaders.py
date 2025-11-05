import os, sys
import json
import glob
import joblib
import pickle
import logging

LOGGER = logging.getLogger(__name__)

def _first_existing(paths):
    """Hàm tìm file đầu tiên tồn tại trong danh sách."""
    for p in paths:
        if os.path.exists(p):
            return p
    return None

def load_encoders_flexible(artifacts_dir: str):
    """Tải encoders từ nhiều định dạng khác nhau."""
    cand = _first_existing([
        os.path.join(artifacts_dir, "encoders.pkl")
    ])
    if cand is None:
        hits = glob.glob(os.path.join(artifacts_dir, "encoders*"))
        if hits:
            cand = hits[0]
    if cand is None:
        raise FileNotFoundError(f"Cannot find encoders in {artifacts_dir}")

    if cand.endswith((".pkl", ".pickle")):
        try:
            return joblib.load(cand)
        except Exception:
            with open(cand, "rb") as f:
                return pickle.load(f)
    elif cand.endswith(".json"):
        with open(cand, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    else:
        raise ValueError(f"Unsupported encoders file: {cand}")

def load_medians_and_schema_flexible(artifacts_dir: str):
    """
    Tải schema (danh sách cột), medians (trung vị), 
    và clipping_bounds (ngưỡng cắt) từ artifacts.
    """
    schema = None
    medians = None
    clipping_bounds = None
    
    cand_main = _first_existing([
        os.path.join(artifacts_dir, "medians.json"),
    ])
    
    if cand_main and os.path.exists(cand_main):
        with open(cand_main, "r", encoding="utf-8") as f:
            obj = json.load(f)
            
        schema = obj.get("schema") or obj.get("feature_schema") or obj.get("feature_columns")
        medians = obj.get("medians") or obj.get("feature_medians")
        clipping_bounds = obj.get("clipping_bounds") 
        LOGGER.info("Loaded artifacts from %s", cand_main)
        return schema, medians, clipping_bounds 
    else:
        raise FileNotFoundError(f"Cannot find medians/schema/clipping_bounds in {artifacts_dir}")

