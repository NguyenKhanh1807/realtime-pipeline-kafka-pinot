# util/medians.py
import logging
import os, json, numpy as np, pandas as pd

LOGGER = logging.getLogger(__name__)

def export_medians_and_schema(train_ds: pd.DataFrame,
                              out_dir: str = "artifacts",
                              label_col: str = "is_fraud", name: str = "medians"):
    """
    Ghi artifacts/medians.json và TRẢ VỀ:
      - feature_columns: list[str] đúng thứ tự khi train (loại nhãn)
      - medians: dict[col -> float] median đã encode
    """
    os.makedirs(out_dir, exist_ok=True)

    feature_columns = [c for c in train_ds.columns if c != label_col]

    X = train_ds[feature_columns].apply(pd.to_numeric, errors="coerce")
    medians = {}
    for c in feature_columns:
        m = np.nanmedian(X[c].to_numpy())
        if not np.isfinite(m):
            m = 0.0
        medians[c] = float(m)

    out_path = os.path.join(out_dir, "{name}.json").format(name=name)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"feature_columns": feature_columns, "medians": medians},
                  f, ensure_ascii=False, indent=2)
    LOGGER.info("Wrote %s with %s feature columns.", out_path, len(feature_columns))
    return feature_columns, medians
