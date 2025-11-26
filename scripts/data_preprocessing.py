import logging
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, OrdinalEncoder
from typing import Optional, List, Dict, Any, Tuple
import unicodedata

# Giả định các module này có sẵn trong project của bạn
try:
    from utils.logging_utils import configure_logging
    from scripts.pinot_timewindow_fetch import (
        PinotFetchConfig,
        configure as configure_pinot_fetch,
        fetch_by_end_date as pinot_fetch_by_end_date, 
        fetch_all as pinot_fetch_all
    )
except ImportError:
    # Fallback nếu chạy test độc lập thiếu file
    logging.basicConfig(level=logging.INFO)
    configure_logging = None

LOGGER = logging.getLogger(__name__)

# =============================================================================
# 1. HELPER FUNCTIONS (Hàm hỗ trợ Clean & Feature Engineering)
# =============================================================================

def df_to_date(df: pd.DataFrame, col: str, compute_time_features: bool = False) -> pd.DataFrame:
    """Chuyển đổi cột datetime thành các đặc trưng số học (Year, Month, Day, Sin/Cos Month...)."""
    if col not in df.columns:
        return df

    # Đảm bảo là datetime trước khi xử lý
    if not pd.api.types.is_datetime64_any_dtype(df[col]):
        df[col] = pd.to_datetime(df[col], errors='coerce')

    # Basic date features
    df[f"{col}_year"] = df[col].dt.year
    df[f"{col}_month"] = df[col].dt.month
    df[f"{col}_day"] = df[col].dt.day
    df[f"{col}_dayofweek"] = df[col].dt.dayofweek

    # Cyclical features for month
    m = df[col].dt.month.astype(float)
    df[f"{col}_month_sin"] = np.sin(2 * np.pi * m / 12)
    df[f"{col}_month_cos"] = np.cos(2 * np.pi * m / 12)

    # Time features (nếu cần)
    if compute_time_features:
        df[f"{col}_hour"] = df[col].dt.hour
        # 22h đêm đến 6h sáng là ban đêm
        df[f"{col}_is_night"] = ((df[f"{col}_hour"] < 6) | (df[f"{col}_hour"] > 22)).astype("Int64")
    
    # Xóa cột gốc sau khi đã extract features
    return df.drop(columns=[col])

def normalize_text(text):
    """Chuẩn hoá chuỗi: NFKC unicode, Uppercase, Strip."""
    if pd.isna(text): 
        return ""
    return unicodedata.normalize('NFKC', str(text)).upper().strip()

def df_align(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature Engineering Pipeline:
    - Chuẩn hóa text
    - Tạo feature so sánh (mismatch)
    - Tính toán khoảng cách thời gian (Account Age, User Seniority...)
    - Tạo các Trap Features (Bẫy gian lận)
    - Xử lý Date -> Features
    - Loại bỏ PII (Thông tin cá nhân)
    """
    df = df.copy()

    # 1. Text Normalization
    text_cols = ['user_name']
    #  text_cols = ["stay_qualify", 'user_name', 'sender_name']
    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].apply(normalize_text)

    # 2. Logic Mismatch
    # if 'user_name' in df.columns and 'sender_name' in df.columns:
    #     df['name_mismatch'] = ((df['user_name'] != "") & 
    #                            (df['sender_name'] != "") & 
    #                            (df['user_name'] != df['sender_name'])).astype(int)
        
    if 'country_code' in df.columns and 'receiving_country' in df.columns:
        cc = df['country_code'].fillna("Unknown")
        rc = df['receiving_country'].fillna("Unknown")
        df['country_mismatch'] = (cc != rc).astype(int)

    # 3. Date Parsing & Correction
    date_cols = ['create_dt', 'register_date', 'first_transaction_date', 'birth_date', 
                 'visa_expire_date', 'recheck_date', 'face_pin_date']
    
    for col in date_cols:
        if col in df.columns:
            # Clean string rác trước khi convert
            s = df[col].astype(str).str.replace('/', '-', regex=False)
            s = s.replace(["9999-01-01", "9999-12-31", "nan", "None", ""], pd.NaT)
            df[col] = pd.to_datetime(s, format='mixed', dayfirst=False, errors='coerce')
            
    # 4. Feature Extraction từ Date (Time diff)
    create_dt = df.get('create_dt', pd.Series([pd.NaT]*len(df)))
    register_date = df.get('register_date', pd.Series([pd.NaT]*len(df)))
    first_transaction_date = df.get('first_transaction_date', pd.Series([pd.NaT]*len(df)))
    visa_expire_date = df.get('visa_expire_date', pd.Series([pd.NaT]*len(df)))

    # Tuổi tài khoản (ngày)
    df['account_age'] = (create_dt - register_date).dt.days
    # Thâm niên giao dịch
    df['user_seniority'] = (create_dt - first_transaction_date).dt.days
    # Thời gian từ lúc đăng ký đến lúc giao dịch lần đầu
    df['time_to_activate'] = (first_transaction_date - register_date).dt.days

    # Clip các giá trị âm vô lý (do data rác) về -1
    cols_to_clip = ['account_age', 'user_seniority', 'time_to_activate']
    for c in cols_to_clip:
        df[c] = df[c].fillna(-1).clip(lower=-1)

    # 5. Advanced Fraud Logic (Trap Features)
    amt = df.get("deposit_amount", pd.Series([0]*len(df))).fillna(0) # các cột amount có thể bị NaN 
    txn_count_1m = df.get("transaction_count_1month", pd.Series([0]*len(df))).fillna(0)
    
    # Is New & High Risk: Giao dịch lớn trong tuần đầu tiên
    df['is_new_high_risk'] = ((df['user_seniority'] <= 7) & (amt >= 3_000_000)).astype(int)

    # Flash Account (Giao dịch ngay khi tạo)
    df['is_fast_actor'] = (df['time_to_activate'] <= 1).astype(int)

    # Limit Testing
    txn_24h = df.get("transaction_amount_24hour", pd.Series([0]*len(df))).fillna(amt) 
    df['is_near_limit'] = (txn_24h >= 9_500_000).astype(int)

    # Safe Visa but Suspicious Amount
    # safe_visas = ['특정활동(E-7)', '결혼이민(F-6)', '재외동포(F-4)']
    # visa_check = df.get('stay_qualify', pd.Series(["Unknown"]*len(df))).fillna("Unknown")
    # df['is_safe_visa_but_high_amt'] = (
    #     visa_check.isin(safe_visas) & (amt >= 5_000_000)
    # ).astype(int)

    # Visa Expired
    df['is_visa_expired'] = (visa_expire_date < create_dt).fillna(False).astype(int)

    # Zombie Account : Tài khoản lâu không dùng bỗng nhiên hoạt động lớn
    df['is_zombie_waking_up'] = (
        (df['account_age'] > 180) & 
        (txn_count_1m <= 1) & 
        (amt >= 2_000_000)
    ).astype(int)

    # Amount Buckets (Phân nhóm tiền)
    df["amount_type"] = np.select([amt < 1_000_000, amt > 4_000_000], [1, 3], default=2).astype(int)

    # 6. Explode Date Columns to Features
    # create_dt có tính giờ (hour)
    if 'create_dt' in df.columns:
        df = df_to_date(df, "create_dt", compute_time_features=True)
    
    # Các cột khác chỉ tính ngày tháng
    other_date_cols = ["register_date", "visa_expire_date", "first_transaction_date", 
                       "birth_date", "recheck_date", "face_pin_date"]
    for c in other_date_cols:
        if c in df.columns: 
            df = df_to_date(df, c)

    # 7. Drop PII (Thông tin nhạy cảm không đưa vào model)
    pii = ["user_name", "recipient_name", "autodebit_account", "invite_code", "user_seq"]
    df.drop(columns=[c for c in pii if c in df.columns], inplace=True, errors="ignore")
    
    return df

def encode_categoricals(df: pd.DataFrame, cat_cols: List[str], encoders=None) -> Tuple[pd.DataFrame, Dict]:
    """Mã hoá biến phân loại (Ordinal Encoding)."""
    df = df.copy()
    
    # Đảm bảo list cột tồn tại
    cat_cols = [c for c in cat_cols if c in df.columns]
    if not cat_cols:
        return df, encoders

    # Fillna string trước khi encode
    for c in cat_cols:
        df[c] = df[c].astype("string").fillna("Unknown")

    if encoders is not None:
        # --- MODE INFERENCE ---
        meta = encoders.get("ordinal")
        if meta:
            cols, enc = meta["cols"], meta["enc"]
            # Nếu cột nào thiếu trong dữ liệu mới thì tạo cột 'Unknown'
            for c in cols: 
                if c not in df.columns: df[c] = "Unknown"
            
            # Reorder cột cho khớp với Encoder
            df[cols] = enc.transform(df[cols])
        return df, encoders
    else:
        # --- MODE TRAINING ---
        enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        df[cat_cols] = enc.fit_transform(df[cat_cols])
        return df, {"ordinal": {"cols": cat_cols, "enc": enc}}

def data_imputation_and_clipping(
    df: pd.DataFrame, 
    clipping_bounds: Dict[str, Tuple[float, float]] = None
) -> pd.DataFrame:
    """Điền giá trị thiếu (String) và Cắt ngoại lệ (Clipping)."""
    df = df.copy()

    # Fillna cho Object/String
    string_cols = df.select_dtypes(include=['object']).columns
    for col in string_cols:
        df[col] = df[col].fillna('Unknown')
    
    # Clipping nếu có bounds (Mode Inference)
    if clipping_bounds:
        for col, (lower, upper) in clipping_bounds.items():
            if col in df.columns:
                series = pd.to_numeric(df[col], errors='coerce')
                df[col] = series.clip(lower=lower, upper=upper)
    
    return df

def load_training_dataframe(data_path: Optional[str], pinot_cfg: Optional[dict]) -> pd.DataFrame:
    """Load data từ CSV hoặc Pinot."""
    if pinot_cfg:
        cfg = PinotFetchConfig(**pinot_cfg)
        configure_pinot_fetch(cfg)
        df = pinot_fetch_all()
        if df is None or df.empty:
            raise RuntimeError("Pinot fetch returned empty data.")
        LOGGER.info(f"Fetched {len(df):,} rows from Pinot.")
        return df
    
    if data_path is None:
        raise ValueError("data_path must be provided if Pinot is not used.")
    
    LOGGER.info(f"Loading training data from CSV: {data_path}")
    return pd.read_csv(data_path)

# =============================================================================
# 2. MAIN PROCESSING FUNCTIONS
# =============================================================================

def preProcessing(data_path: Optional[str] = None, pinot_cfg: Optional[dict] = None) -> Dict[str, Any]:
    """
    Quy trình Training Preprocessing:
    Load -> Clip (Learn) -> Feature Engineering -> Encode (Learn) -> Impute (Learn Median) -> Scale (Learn)

    Args:
        data_path: Đường dẫn CSV fallback (dùng khi Pinot không truy cập được).
        pinot_cfg: Cấu hình Pinot; nếu None sẽ dùng cấu hình mặc định.
    """
    default_pinot_cfg = pinot_cfg or {
        "host": "localhost",
        "port": "8099",
        "scheme": "http",
        "path": "/query/sql",
        "table": "transactions",
        "mode": "dbapi",
        "timeout": 100,
        "verify": "store_true"
    }

    # Cho phép fallback CSV khi Pinot lỗi để UI/EDA vẫn hoạt động
    fallback_csv = data_path or os.path.join(os.path.dirname(__file__), "..", "data", "transaction_2025y30K_labeled1.csv")
    pinot_error = None
    data_source = f"Pinot table={default_pinot_cfg.get('table', 'unknown')}"
    LOGGER.info(f"Starting training pipeline with {data_source}")

    data = {} # Container chứa data và các object (scaler, encoder...)

    # 1. LOAD DATA
    df = None
    try:
        df = load_training_dataframe(None, default_pinot_cfg)
        #xóa cột label giả định nếu có
        if 'label' in df.columns:
            df = df.drop(columns=['label'])
        # Xây dựng cột label thực tế từ cột 'fraud_score' nếu có. nếu lớn hơn 0.9 thì là gian lận 2. Nếu nhỏ 0.9 > 0.5 thì nghi ngờ gian lận 1. Ngược lại label=0
        if 'fraud_score' in df.columns:
            df['label'] = df['fraud_score'].apply(lambda x: 2 if x > 0.9 else (1 if x > 0.5 else 0))
            df = df.drop(columns=['fraud_score'])
        LOGGER.info(f"Data loaded from Pinot with shape: {df.shape}")
    except Exception as exc:
        pinot_error = exc
        LOGGER.warning("Pinot fetch failed (%s); falling back to CSV: %s", exc, fallback_csv)

    if df is None:
        df = load_training_dataframe(fallback_csv, None)
        data_source = f"CSV file={os.path.basename(fallback_csv)}"

    LOGGER.info(f"Initial data shape: {df.shape}")
    # === [ĐIỂM TÁCH LABEL TỐT NHẤT TẠI ĐÂY] ===
    label_candidates = ["lable", "label"]
    label_col = next((c for c in label_candidates if c in df.columns), None)
    if label_col:
        # Tách riêng y
        y = df[label_col].copy()
        data['y_raw'] = y.copy()
        data['raw_with_label'] = df.copy()
        # Xoá label khỏi df để biến df thành X thuần tuý
        df = df.drop(columns=[label_col])
        
        LOGGER.info(f"Separated label '{label_col}'. Shape of X: {df.shape}, Shape of y: {y.shape}")
    else:
        y = None
        LOGGER.warning(f"Label column '{label_col}' not found in dataframe!")

    # Lưu label vào dictionary để dùng sau này (ví dụ đưa vào hàm train)
    data['y'] = y 
    
    # Tiếp tục xử lý với biến df (lúc này chỉ còn là X)
    data['raw'] = df.copy()
    prep_df = df.copy()

    # 2. INITIAL IMPUTATION & CLIPPING (LEARN BOUNDS)
    # Fillna String
    string_cols = prep_df.select_dtypes(include=['object']).columns
    for col in string_cols:
        prep_df[col] = prep_df[col].fillna('Unknown')

    # Clipping Logic (Amount)
    amount_cols = [c for c in prep_df.columns if 'deposit_amount' in c]
    clipping_bounds = {}
    
    data['clipping'] = {}
    data['clipping']['before'] = prep_df[amount_cols].copy() # Snapshot debug

    LOGGER.info("Learning clipping bounds (IQR)...")
    for col in amount_cols:
        series = pd.to_numeric(prep_df[col], errors='coerce')
        q1, q3 = series.quantile([0.25, 0.75])
        iqr = q3 - q1
        upper = q3 + 1.5 * iqr
        lower = max(q1 - 1.5 * iqr, 0)
        prep_df[col] = series.clip(lower=lower, upper=upper)
        clipping_bounds[col] = [float(lower), float(upper)]

    data['clipping']['bounds'] = clipping_bounds
    data['clipping']['after'] = prep_df[amount_cols].copy()

    # 3. FEATURE ENGINEERING (ALIGN)
    LOGGER.info("Aligning dataframe features...")
    data['aligned'] = {}
    data['aligned']['before'] = prep_df.copy()
    prep_df = df_align(prep_df)
    data['aligned']['after'] = prep_df.copy()

    # 4. ENCODING (LEARN ENCODER)
    data['encoded'] = {}
    data['encoded']['before'] = prep_df.copy()
    maybe_cats = ["receiving_country", "country_code", "id_type", 
                  "payment_method", "payment_method_filled"]
    categorical_cols = [c for c in maybe_cats if c in prep_df.columns]
    
    prep_df_enc, encoder_meta = encode_categoricals(prep_df, categorical_cols)
    
    data['encoded']['after'] = prep_df_enc.copy()
    data['encoders'] = {}
    data['encoders']['meta'] = encoder_meta
    data['encoders']['cols'] = categorical_cols

    # 5. NUMERIC IMPUTATION (LEARN MEDIAN)
    # Quan trọng: Phải fillna TRƯỚC khi scale
    feat_cols = prep_df_enc.select_dtypes(include=['number']).columns.tolist()
    medians = prep_df_enc[feat_cols].median()
    data['medians'] = {}
    data['medians']['values'] = medians.to_dict()
    data['medians']['feature_cols'] = feat_cols
    
    # Fill NaN bằng median vừa học
    prep_df_filled = prep_df_enc.copy()
    for c in feat_cols:
        prep_df_filled[c] = prep_df_filled[c].fillna(medians[c])

    # 6. SCALING (LEARN SCALER)
    data['scaled'] = {}
    data['scaled']['before'] = prep_df_filled.copy()
    COLS_TO_SCALE = [
        'deposit_amount', 'transaction_count_24hour', 'transaction_amount_24hour',
        'transaction_count_1month', 'transaction_amount_1month',
        'account_age', 'user_seniority', 'time_to_activate', 'amount_type'
    ]
    # Chỉ scale những cột thực tế có trong data
    cols_to_scale_final = [c for c in COLS_TO_SCALE if c in prep_df_filled.columns]

    scaler = StandardScaler()
    prep_df_scaled = prep_df_filled.copy()
    
    if cols_to_scale_final:
        prep_df_scaled[cols_to_scale_final] = scaler.fit_transform(prep_df_filled[cols_to_scale_final])
    
    data['scaled']['after'] = prep_df_scaled.copy()
    data['scaled']['scaler'] = scaler # Save scaler object

    # 7. FINAL PACKAGING
    # Model cần danh sách feature chuẩn để khi predict gọi đúng thứ tự
    data['final'] = {}
    data['final']['data'] = prep_df_scaled.copy()
    data['final']['feature_cols'] = prep_df_scaled.columns.tolist()
    
    LOGGER.info("Preprocessing completed successfully.")
    return data

def prepare_features_for_inference(
    df_raw: pd.DataFrame,
    feat_cols: List[str],
    encoders: dict,
    medians: dict,
    scaler: StandardScaler, # Bắt buộc phải có Scaler từ training
    maybe_cats: List[str],
    clipping_bounds: Dict[str, Tuple[float, float]] = None 
) -> pd.DataFrame:
    """
    Quy trình Inference Preprocessing:
    Raw -> Clip (Apply) -> Feature Engineering -> Encode (Apply) -> Impute (Apply Median) -> Scale (Apply) -> Reorder
    """
    
    # 1. Imputation (String) & Clipping (Apply bounds)
    df_processed = data_imputation_and_clipping(df_raw, clipping_bounds)

    # 2. Feature Engineering
    df = df_align(df_processed)
    
    # 3. Encoding (Apply encoder)
    cat_cols_present = [c for c in maybe_cats if c in df.columns]
    df_enc, _ = encode_categoricals(df, cat_cols_present, encoders=encoders)

    # 4. Final Structure Alignment
    # Tạo dataframe đích với đúng danh sách cột feature của model
    df_final = pd.DataFrame(index=df_enc.index)
    for c in feat_cols:
        if c in df_enc.columns:
            df_final[c] = df_enc[c]
        else:
            df_final[c] = np.nan # Tạo cột thiếu nếu input không có
            
    # 5. Imputation Numeric (Apply medians from Train)
    for c in feat_cols:
        # Ép kiểu số và fillna
        val = medians.get(c, 0.0)
        df_final[c] = pd.to_numeric(df_final[c], errors="coerce").fillna(val)

    # 6. Scaling (Apply scaler from Train)
    # Lấy danh sách cột scaler đã học
    if hasattr(scaler, 'feature_names_in_'):
        cols_to_scale = [c for c in feat_cols if c in scaler.feature_names_in_]
        if cols_to_scale:
             df_final[cols_to_scale] = scaler.transform(df_final[cols_to_scale])

    # Trả về đúng thứ tự cột mà model yêu cầu
    return df_final[feat_cols]
