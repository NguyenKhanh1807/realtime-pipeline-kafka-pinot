import numpy as np, pandas as pd
from typing import List, Dict, Any, Tuple

# Hàm chuyển đổi cột ngày tháng và tạo các đặc trưng thời gian
def df_to_date(df, col, compute_time_features=False):
    df[col] = df[col].replace(["9999-01-01","9999-12-31"], pd.NaT)
    df[col] = pd.to_datetime(df[col], errors="coerce", utc=False)

    df[f"{col}_year"] = df[col].dt.year
    df[f"{col}_month"] = df[col].dt.month
    df[f"{col}_day"] = df[col].dt.day
    df[f"{col}_dayofweek"] = df[col].dt.dayofweek

    m = df[col].dt.month.astype(float)
    df[f"{col}_month_sin"] = np.sin(2*np.pi*m/12)
    df[f"{col}_month_cos"] = np.cos(2*np.pi*m/12)

    if compute_time_features:
        df[f"{col}_hour"] = df[col].dt.hour
        df[f"{col}_is_night"] = ((df[f"{col}_hour"] < 6) | (df[f"{col}_hour"] > 22)).astype("Int64")
    return df.drop(columns=[col])

# Hàm chuẩn hoá dataframe theo schema model đã train
def df_align(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # amount buckets
    amt = df["deposit_amount"].fillna(-1)
    df["amount_type"] = np.select([amt < 1_000_000, amt > 4_000_000],[1,3], default=2).astype(int)

    # dates
    df = df_to_date(df, "create_dt", compute_time_features=True)
    for c in ["register_date","visa_expire_date","first_transaction_date","birth_date","recheck_date","face_pin_date"]:
        if c in df.columns: df = df_to_date(df, c)

    # drop PII
    pii = ["user_name","sender_name","recipient_name","autodebit_account","invite_code","user_seq"]
    df.drop(columns=[c for c in pii if c in df.columns], inplace=True, errors="ignore")
    return df

# Hàm mã hoá các đặc trưng phân loại bằng Ordinal Encoding
def encode_categoricals(df: pd.DataFrame, cat_cols: List[str], encoders=None):
    df = df.copy()
    cat_cols = [c for c in cat_cols if c in df.columns]
    if not cat_cols:
        return df, encoders
    for c in cat_cols:
        df[c] = df[c].astype("string").fillna("Unknown")
    if encoders is not None:
        meta = encoders.get("ordinal")
        cols, enc = meta["cols"], meta["enc"]
        missing = [c for c in cols if c not in df.columns]
        for c in missing: df[c] = "Unknown"
        df = df.reindex(columns=[*(x for x in df.columns if x not in cols), *cols])
        df[cols] = enc.transform(df[cols])
        return df, encoders
    else:
        from sklearn.preprocessing import OrdinalEncoder
        enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        df[cat_cols] = enc.fit_transform(df[cat_cols])
        return df, {"ordinal": {"cols": cat_cols, "enc": enc}}

# Hàm chuẩn hoá dataframe cho việc dự đoán với model đã train: đảm bảo đúng cột, mã hoá, điền thiếu
def sanitize_for_model(df_like: pd.DataFrame, feat_cols: List[str], medians: Dict[str, float]):
    X = df_like.copy()
    for c in feat_cols:
        if c not in X.columns: X[c] = np.nan # thêm cột thiếu
    X = X[feat_cols]
    for c in feat_cols: 
        X[c] = pd.to_numeric(X[c], errors="coerce") # ép kiểu số
        X[c] = X[c].fillna(medians.get(c, 0.0)) # điền thiếu bằng median
    return X

def data_imputation_and_clipping(
    df: pd.DataFrame, 
    clipping_bounds: Dict[str, Tuple[float, float]] = None # Ngưỡng đã học
) -> pd.DataFrame:
    """Thực hiện điền giá trị thiếu cho cột chuỗi và cắt ngoại lệ (clipping)."""
    prep_df = df.copy()

    # Điền giá trị thiếu cho cột chuỗi ('Unknown')
    string_cols = prep_df.select_dtypes(include=['object']).columns
    for col in string_cols:
        prep_df[col] = prep_df[col].fillna('Unknown')
    
    # Cắt ngoại lệ bằng IQR (Chỉ áp dụng các ngưỡng đã học)
    if clipping_bounds:
        for col, (lower, upper) in clipping_bounds.items():
            if col in prep_df.columns:
                series = pd.to_numeric(prep_df[col], errors='coerce')
                prep_df[col] = series.clip(lower=lower, upper=upper)
    
    return prep_df

def prepare_features_for_inference(
    df_raw: pd.DataFrame,
    feat_cols: list[str],
    encoders: dict,
    medians: dict,
    maybe_cats: list[str],
    clipping_bounds: Dict[str, Tuple[float, float]] = None 
) -> pd.DataFrame:
    """FE + encode + align + fillna theo đúng schema đã train"""
    
    # Imputation và Clipping (Sử dụng hàm đã đóng gói)
    df_processed = data_imputation_and_clipping(df_raw, clipping_bounds)

    # Alignment và Encoding
    df = df_align(df_processed)
    cat_cols = [c for c in maybe_cats if c in df.columns]
    df_enc, _ = encode_categoricals(df, cat_cols, encoders=encoders)

    # Final Alignment (Thêm cột thiếu và sắp xếp)
    for c in feat_cols:
        if c not in df_enc.columns:
            df_enc[c] = np.nan
    df_enc = df_enc[feat_cols]

    # Final Imputation bằng MEDIANS đã học (cho các cột số)
    for c in feat_cols:
        df_enc[c] = pd.to_numeric(df_enc[c], errors="coerce").fillna(medians.get(c, 0.0))

    return df_enc
