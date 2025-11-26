# FILE: src/feature_engineering.py
import logging
import os
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from typing import Optional, List, Dict, Any, Tuple
import unicodedata

# Cấu hình Logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
LOGGER = logging.getLogger(__name__)

# --- CÁC HÀM HELPER (Private - dùng nội bộ) ---

def _df_to_date(df: pd.DataFrame, col: str, compute_time_features: bool = False) -> pd.DataFrame:
    if col not in df.columns: return df
    if not pd.api.types.is_datetime64_any_dtype(df[col]):
        df[col] = pd.to_datetime(df[col], errors='coerce')
    df[f"{col}_year"] = df[col].dt.year
    df[f"{col}_month"] = df[col].dt.month
    df[f"{col}_day"] = df[col].dt.day
    df[f"{col}_dayofweek"] = df[col].dt.dayofweek
    m = df[col].dt.month.astype(float)
    df[f"{col}_month_sin"] = np.sin(2 * np.pi * m / 12)
    df[f"{col}_month_cos"] = np.cos(2 * np.pi * m / 12)
    if compute_time_features:
        df[f"{col}_hour"] = df[col].dt.hour
        df[f"{col}_is_night"] = ((df[f"{col}_hour"] < 6) | (df[f"{col}_hour"] > 22)).astype("Int64")
    return df.drop(columns=[col])

def _normalize_text(text):
    if pd.isna(text): return ""
    return unicodedata.normalize('NFKC', str(text)).upper().strip()

def _df_align(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Normalize Text
    if 'user_name' in df.columns: df['user_name'] = df['user_name'].apply(_normalize_text)
    
    # Date Parsing
    date_cols = ['create_dt', 'register_date', 'first_transaction_date', 'birth_date', 'visa_expire_date']
    for col in date_cols:
        if col in df.columns:
            s = df[col].astype(str).str.replace('/', '-', regex=False)
            s = s.replace(["9999-01-01", "nan", "None", ""], pd.NaT)
            df[col] = pd.to_datetime(s, format='mixed', dayfirst=False, errors='coerce')

    # Feature Extraction
    create_dt = df.get('create_dt', pd.Series([pd.NaT]*len(df)))
    register_date = df.get('register_date', pd.Series([pd.NaT]*len(df)))
    first_transaction_date = df.get('first_transaction_date', pd.Series([pd.NaT]*len(df)))
    
    df['account_age'] = (create_dt - register_date).dt.days
    df['user_seniority'] = (create_dt - first_transaction_date).dt.days
    df['time_to_activate'] = (first_transaction_date - register_date).dt.days
    
    for c in ['account_age', 'user_seniority', 'time_to_activate']:
        df[c] = df[c].fillna(-1).clip(lower=-1)

    # Trap Features
    amt = df.get("deposit_amount", pd.Series([0]*len(df))).fillna(0)
    df['is_new_high_risk'] = ((df['user_seniority'] <= 7) & (amt >= 3_000_000)).astype(int)
    df['is_fast_actor'] = (df['time_to_activate'] <= 1).astype(int)
    
    # Velocity Features
    if 'transaction_count_24hour' in df.columns:
        df['amount_per_tx_24h'] = df['transaction_amount_24hour'] / (df['transaction_count_24hour'] + 1)

    # Explode Date
    if 'create_dt' in df.columns: df = _df_to_date(df, "create_dt", compute_time_features=True)
    for c in ["register_date", "visa_expire_date", "first_transaction_date", "birth_date"]:
        if c in df.columns: df = _df_to_date(df, c)

    # Drop PII
    pii = ["user_name", "recipient_name", "autodebit_account", "invite_code", "user_seq"]
    df.drop(columns=[c for c in pii if c in df.columns], inplace=True, errors="ignore")
    return df

def _encode_categoricals(df, cat_cols, encoders=None):
    df = df.copy()
    cat_cols = [c for c in cat_cols if c in df.columns]
    if not cat_cols: return df, encoders
    for c in cat_cols: df[c] = df[c].astype("string").fillna("Unknown")

    if encoders: # Inference mode
        meta = encoders.get("ordinal")
        if meta:
            cols, enc = meta["cols"], meta["enc"]
            for c in cols: 
                if c not in df.columns: df[c] = "Unknown"
            try: df[cols] = enc.transform(df[cols])
            except: pass 
        return df, encoders
    else: # Train mode
        enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        df[cat_cols] = enc.fit_transform(df[cat_cols])
        return df, {"ordinal": {"cols": cat_cols, "enc": enc}}

# --- CÁC HÀM PUBLIC (Gọi từ bên ngoài) ---

def train_pipeline(df: pd.DataFrame, save_path: str = "artifacts/pipeline_artifacts.pkl") -> Dict[str, Any]:
    """
    Hàm dùng để TRAIN pipeline và lưu lại artifacts.
    """
    LOGGER.info(">>> Starting Training Pipeline...")
    
    # 1. Tách Label
    data = {}
    if 'label' in df.columns:
        df = df.drop(columns=['label'])
    if 'fraud_score' in df.columns:
        df['label'] = df['fraud_score'].apply(lambda x: 2 if x > 0.9 else (1 if x > 0.5 else 0))
        df = df.drop(columns=['fraud_score'])
    label_candidates = ["label"]
    label_col = next((c for c in label_candidates if c in df.columns), None)
    if label_col:
        data['y'] = df[label_col].copy()
        df = df.drop(columns=[label_col])
    else:
        data['y'] = None

    prep_df = df.copy()

    # 2. Clipping (Learn)
    amount_cols = [c for c in prep_df.columns if 'deposit_amount' in c]
    clipping_bounds = {}
    for col in amount_cols:
        series = pd.to_numeric(prep_df[col], errors='coerce')
        q1, q3 = series.quantile([0.25, 0.75])
        iqr = q3 - q1
        lower, upper = max(q1 - 1.5 * iqr, 0), q3 + 1.5 * iqr
        prep_df[col] = series.clip(lower=lower, upper=upper)
        clipping_bounds[col] = [float(lower), float(upper)]

    # 3. FE (Align)
    prep_df = _df_align(prep_df)

    # 4. Encoding (Learn)
    maybe_cats = ["receiving_country", "country_code", "id_type", "payment_method", "stay_qualify"]
    cat_cols = [c for c in maybe_cats if c in prep_df.columns]
    prep_df_enc, encoder_meta = _encode_categoricals(prep_df, cat_cols)

    # 5. Imputation (Learn Median)
    feat_cols = prep_df_enc.select_dtypes(include=['number']).columns.tolist()
    medians = prep_df_enc[feat_cols].median()
    prep_df_filled = prep_df_enc.copy()
    for c in feat_cols: prep_df_filled[c] = prep_df_filled[c].fillna(medians[c])

    COLS_TO_SCALE = [
        'deposit_amount', 'transaction_count_24hour', 'transaction_amount_24hour',
        'transaction_count_1month', 'transaction_amount_1month',
        'account_age', 'user_seniority', 'time_to_activate', 'amount_type'
    ]
    if cols_to_scale_final:
        prep_df_scaled[cols_to_scale_final] = scaler.fit_transform(prep_df_filled[cols_to_scale_final])

    # 6. Scaling (Learn)
    scaler = StandardScaler()
    prep_df_scaled = prep_df_filled.copy()
    prep_df_scaled[feat_cols] = scaler.fit_transform(prep_df_filled[cols_to_scale_final])

    # 7. Save Artifacts
    artifacts = {
        'scaler': scaler,
        'encoders': encoder_meta,
        'medians': medians.to_dict(),
        'clipping_bounds': clipping_bounds,
        'feature_cols_median': feat_cols,
        'feature_cols': prep_df_scaled.columns.tolist(),
        'cat_cols': cat_cols,
        'cols_to_scale_final': cols_to_scale_final,
    }
    
    # Tự động tạo thư mục nếu chưa có
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    joblib.dump(artifacts, save_path)
    LOGGER.info(f"✅ Artifacts saved to: {save_path}")

    return {'X': prep_df_scaled, 'y': data['y'], 'artifacts': artifacts}

def process_transaction(transaction: Dict[str, Any], artifacts_path: str = "artifacts/pipeline_artifacts.pkl", _cache: dict = None) -> pd.DataFrame:
    """
    Hàm dùng để DỰ ĐOÁN (Inference) 1 giao dịch.
    """
    # Load Artifacts
    if _cache: artifacts = _cache
    else:
        if not os.path.exists(artifacts_path): raise FileNotFoundError("Artifacts not found. Train first!")
        artifacts = joblib.load(artifacts_path)

    # Pipeline
    df = pd.DataFrame([transaction])
    
    # Clip
    if artifacts['clipping_bounds']:
        for col, (l, u) in artifacts['clipping_bounds'].items():
            if col in df.columns: df[col] = pd.to_numeric(df[col], errors='coerce').clip(l, u)
    
    # FE & Encode
    df = _df_align(df)
    df, _ = _encode_categoricals(df, artifacts['cat_cols'], encoders={'ordinal': artifacts['encoders']})

    # Align Columns & Impute
    df_final = pd.DataFrame(index=df.index)
    for c in artifacts['feature_cols_median']:
        val = artifacts['medians'].get(c, 0.0)
        if c in df.columns: df_final[c] = pd.to_numeric(df[c], errors="coerce").fillna(val)
        else: df_final[c] = val

    # Scale
    scaler = artifacts['scaler']
    cols = [c for c in artifacts['cols_to_scale_final'] if c in scaler.feature_names_in_]
    df_final[cols] = scaler.transform(df_final[cols])
    
    return df_final[artifacts['feature_cols']]