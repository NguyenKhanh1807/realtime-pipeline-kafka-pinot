import logging
import os, json, numpy as np, pandas as pd
from typing import List, Dict, Tuple, Any
LOGGER = logging.getLogger(__name__)

def export_medians_and_schema(train_ds: pd.DataFrame,
                              out_dir: str = "artifacts",
                              label_col: str = "is_fraud", name: str = "medians",
                              clipping_bounds: Dict[str, Tuple[float, float]] = None) -> Tuple[List[str], Dict[str, float]]:
    """
    Ghi artifacts/medians_schema.json, bao gồm feature_columns, medians, 
    và clipping_bounds đã học từ dữ liệu huấn luyện.

    Args:
        train_ds (pd.DataFrame): Dữ liệu huấn luyện đã được FE và Encode.
        out_dir (str): Thư mục để lưu artifacts.
        label_col (str): Tên cột nhãn.
        name (str): Tên file JSON (mặc định: medians_schema).
        clipping_bounds (Dict): Từ điển chứa các ngưỡng cắt ngoại lệ (cột -> [lower, upper]).

    Returns:
        Tuple[List[str], Dict[str, float]]: Danh sách cột đặc trưng và từ điển medians.
    """
    os.makedirs(out_dir, exist_ok=True)

    feature_columns = [c for c in train_ds.columns if c != label_col]

    # Tính Medians (Giữ lại logic cũ)
    X = train_ds[feature_columns].apply(pd.to_numeric, errors="coerce")
    medians = {}
    for c in feature_columns:
        m = np.nanmedian(X[c].to_numpy())
        if not np.isfinite(m):
            m = 0.0
        medians[c] = float(m)

    # Đóng gói tất cả tham số vào đối tượng duy nhất
    output_data: Dict[str, Any] = {
        "feature_columns": feature_columns,
        "medians": medians
    }

    # Thêm clipping_bounds vào dữ liệu xuất
    if clipping_bounds is not None:
        # Chuyển đổi tuple bounds thành list để đảm bảo tương thích JSON
        safe_bounds = {k: list(v) for k, v in clipping_bounds.items()}
        output_data["clipping_bounds"] = safe_bounds
    
    out_path = os.path.join(out_dir, f"{name}.json") # Sử dụng f-string cho tên file

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    # LOGGER.info("Wrote %s with %s feature columns.", out_path, len(feature_columns))
    return feature_columns, medians

