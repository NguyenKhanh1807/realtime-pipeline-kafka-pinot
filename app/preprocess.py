import numpy as np, pandas as pd
from typing import List, Dict, Any, Tuple
import unicodedata

# Hàm chuyển đổi cột ngày tháng và tạo các đặc trưng thời gian
def df_to_date(df, col, compute_time_features=False):
    if col not in df.columns:
        return df

    # Kiểm tra: Nếu chưa phải datetime thì mới convert
    if not pd.api.types.is_datetime64_any_dtype(df[col]):
        # Clean dữ liệu rác trước
        s = df[col].astype(str).str.replace('/', '-', regex=False)
        s = s.replace(["9999-01-01", "9999-12-31", "nan", "None", ""], pd.NaT)
        # Thêm format='mixed' để tắt Warning
        df[col] = pd.to_datetime(s, format='mixed', dayfirst=False, errors='coerce', utc=False)

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

# Hàm chuẩn hoá text: NFKC, uppercase, strip
def normalize_text(text):
    if pd.isna(text): return "" # Trả về rỗng thay vì NaN
    return unicodedata.normalize('NFKC', str(text)).upper().strip()

# Hàm chuẩn hoá dataframe theo schema model đã train
def df_align(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Giúp model nhận diện 'ＨＯ ＰＨＩ' chính là 'HO PHI'
    text_cols = ["stay_qualify", 'user_name', 'sender_name']
    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].apply(normalize_text)

    if 'user_name' in df.columns and 'sender_name' in df.columns:
        # Chỉ tính là mismatch khi cả 2 đều có dữ liệu và khác nhau
        df['name_mismatch'] = ((df['user_name'] != "") & 
                               (df['sender_name'] != "") & 
                               (df['user_name'] != df['sender_name'])).astype(int)
        
    if 'country_code' in df.columns and 'receiving_country' in df.columns:
        # Fillna 'Unknown' để tránh lỗi so sánh NaN != NaN
        cc = df['country_code'].fillna("Unknown")
        rc = df['receiving_country'].fillna("Unknown")
        df['country_mismatch'] = (cc != rc).astype(int)

    # XỬ LÝ NGÀY THÁNG (FIX LỖI WARNING & SAI FORMAT)
    # Thay thế tất cả dấu '/' bằng '-' để thống nhất định dạng trước khi parse
    date_cols = ['create_dt', 'register_date', 'first_transaction_date', 'birth_date', 'visa_expire_date', 'recheck_date', 'face_pin_date']
    
    for col in date_cols:
        if col in df.columns:
            # Ép kiểu string, thay thế /, sau đó mới to_datetime
            df[col] = df[col].astype(str).str.replace('/', '-', regex=False)
            df[col] = df[col].replace(["9999-01-01","9999-12-31"], pd.NaT)
            # df[col] = pd.to_datetime(df[col], errors='coerce', utc=False)
            df[col] = pd.to_datetime(df[col], format='mixed', dayfirst=False, errors='coerce')
    
    if 'create_dt' in df.columns and df['create_dt'].dtype == 'object':
        df['create_dt'] = pd.to_datetime(df['create_dt'], format='mixed', dayfirst=False, errors='coerce')
            
    create_dt = df['create_dt']
    register_date = df['register_date']
    first_transaction_date = df['first_transaction_date']
    visa_expire_date = df.get('visa_expire_date', pd.Series([pd.NaT]*len(df))) # Lấy an toàn, nghĩa là nếu không có cột thì tạo Series NaT

    df['account_age'] = (create_dt - register_date).dt.days
    # Cho biết tài khoản này đã tồn tại bao lâu. (OK)

    df['user_seniority'] = (create_dt - first_transaction_date).dt.days
    # Cho biết người này đã giao dịch bao lâu. (Rất có thể, giao dịch gian lận này chính là giao dịch đầu tiên của họ -> user_seniority = 0)

    df['time_to_activate'] = (first_transaction_date - register_date).dt.days
    # Cho biết người này mất bao lâu để kích hoạt tài khoản. (Kẻ gian lận thường kích hoạt ngay lập tức -> time_to_activate = 0)

    df['account_age'] = df['account_age'].clip(lower=-1)
    df['user_seniority'] = df['user_seniority'].clip(lower=-1)
    df['time_to_activate'] = df['time_to_activate'].clip(lower=-1)

    # Người mới + Giao dịch lớn (Bắt trường hợp F-6 vừa rồi)
    # Logic: Nếu user mới (seniority < 7 ngày) mà chuyển > 3tr -> Rủi ro cao
    amt = df["deposit_amount"].fillna(0)
    txn_count_1m = df["transaction_count_1month"].fillna(0)
    df['is_new_high_risk'] = ((df['user_seniority'] <= 7) & (amt >= 3_000_000)).astype(int)

    # Kích hoạt siêu tốc (Flash Account)
    # Logic: Đăng ký xong giao dịch ngay trong ngày (time_to_activate <= 1)
    df['is_fast_actor'] = (df['time_to_activate'] <= 1).astype(int)

    # Sát trần giới hạn (Limit Testing) (Bắt trường hợp E-7 vừa rồi)
    # Logic: Tổng tiền 24h > 9.5 triệu (sát mốc 10tr thường gặp)
    # Nếu không có cột 24h thì dùng deposit_amount
    txn_24h = df["transaction_amount_24hour"].fillna(amt) 
    df['is_near_limit'] = (txn_24h >= 9_500_000).astype(int)

    # Visa xịn nhưng hành vi đáng ngờ
    safe_visas = ['특정활동(E-7)', '결혼이민(F-6)', '재외동포(F-4)']
    visa_check = df['stay_qualify'].fillna("Unknown")
    df['is_safe_visa_but_high_amt'] = (
        visa_check.isin(safe_visas) & (amt >= 5_000_000)
    ).astype(int)

    # Trap 5: VISA HẾT HẠN (Khắc tinh của User #2862) ---
    # Nếu ngày hết hạn < ngày giao dịch -> Rủi ro cực cao
    df['is_visa_expired'] = (visa_expire_date < create_dt).fillna(False).astype(int)

    #  TÀI KHOẢN ZOMBIE (Ngủ đông dậy) ---
    # Tài khoản > 6 tháng tuổi NHƯNG tháng này chưa giao dịch gì mà đùng cái chuyển tiền to
    df['is_zombie_waking_up'] = (
        (df['account_age'] > 180) & 
        (txn_count_1m <= 1) & 
        (amt >= 2_000_000)
    ).astype(int)

    # amount buckets
    # amt = df["deposit_amount"].fillna(-1)
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
