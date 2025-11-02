import io
import json
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status  
from fastapi.security import OAuth2PasswordRequestForm  
from pydantic import BaseModel, constr 
import pandas as pd
from typing import Optional, List
from sqlalchemy import func, select  
from sqlalchemy.orm import Session  
from app.model_io import load_model_and_artifacts
from app.preprocess import df_align, encode_categoricals, sanitize_for_model
from app.scoring import score_decide_with_explanations
from app.config import settings
from app.auth import (
    AuthContext,
    authenticate_user,
    hash_password,
    issue_token,
    optional_active_user,
    require_active_user,
    revoke_token,
)
from app.database import get_db  
from app.models_auth import AuthUser
from utils.logging_utils import configure_logging

# uvicorn app.api:app --host 0.0.0.0 --port 8080 

configure_logging()  

app = FastAPI(
    title="Fraud Scoring Service",
    description=(
        "API phục vụ chấm điểm gian lận theo thời gian thực và hàng loạt. "
        "Tài liệu Swagger UI có sẵn tại /docs, ReDoc tại /redoc."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

def _hydrate():
    global _model, _encoders, _schema_pack, _th, _alias, _registry_version, _feat_cols, _medians, _train_like
    _model, _encoders, _schema_pack, _th = load_model_and_artifacts()
    _feat_cols, _medians, _train_like = _schema_pack
    _alias = settings.MLFLOW_MODEL_ALIAS if settings.MLFLOW_MODEL_NAME else None
    _registry_version = _th.get("model_version_registry") or _th.get("registry_version")

_hydrate()

class Tx(BaseModel):
    transaction_seq: int
    deposit_amount: float
    receiving_country: str
    country_code: Optional[str] = None
    id_type: Optional[str] = None
    stay_qualify: Optional[str] = None
    payment_method: Optional[str] = None
    create_dt: str
    register_date: Optional[str] = None
    first_transaction_date: Optional[str] = None
    birth_date: Optional[str] = None
    recheck_date: Optional[str] = None
    face_pin_date: Optional[str] = None
    transaction_count_24hour: int = 0
    transaction_amount_24hour: float = 0.0
    transaction_count_1week: int = 0
    transaction_amount_1week: float = 0.0
    transaction_count_1month: int = 0
    transaction_amount_1month: float = 0.0

class TxBatch(BaseModel):
    transactions: List[Tx]


class TokenResponse(BaseModel):
    access_token: str  # Chuỗi JWT đã ký
    token_type: str = "bearer"  # Loại token để client format header
    expires_in: int  # TTL token tính bằng giây
    username: str  # Username đã đăng nhập

class RegisterRequest(BaseModel):
    username: constr(min_length=3, max_length=150)  # Ràng buộc độ dài username
    password: constr(min_length=8, max_length=128)  # Ràng buộc độ dài mật khẩu


# Helper tính TTL token dựa trên cấu hình phút -> giây
def _jwt_ttl_seconds() -> int:
    return settings.JWT_ACCESS_EXPIRE_MINUTES * 60  # Chuyển cấu hình phút sang giây

@app.post("/auth/login", tags=["Auth"], response_model=TokenResponse, summary="Đăng nhập và nhận JWT")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),  # Đọc username/password từ form chuẩn
    db: Session = Depends(get_db),  # Dependency tạo session DB.hi bạn đặt tham_so: Kieu = Depends(ham_dependency), FastAPI sẽ tự gọi ham_dependency trước khi chạy endpoint
):
    # Gọi helper xác thực người dùng với thông tin đăng nhập
    user = authenticate_user(db, form_data.username, form_data.password)
    # Nếu thông tin không khớp thì trả lỗi 401 chuẩn OAuth2
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tên đăng nhập hoặc mật khẩu.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Phát hành JWT mới và lưu record token vào DB
    token = issue_token(db, user)
    return TokenResponse(  # Chuẩn hóa payload trả về cho client
        access_token=token,
        expires_in=_jwt_ttl_seconds(),
        username=user.username,
    )  # Trả kết quả đăng nhập cho client


@app.post("/auth/logout", tags=["Auth"], summary="Đăng xuất và thu hồi JWT")
def logout(
    auth: AuthContext = Depends(require_active_user),  # Lấy thông tin user từ token hiện tại
    db: Session = Depends(get_db),  # Session DB để cập nhật trạng thái token
):
    # Thu hồi token bằng cách set revoked_at trong DB
    revoke_token(db, auth.token_jti)
    return {"status": "logged_out"}  # Thông báo logout thành công


@app.post(
    "/auth/register",
    tags=["Auth"],
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký người dùng mới",
)
def register(
    payload: RegisterRequest,  # Request body chứa username/password
    db: Session = Depends(get_db),  # Session DB để tạo user
    auth: Optional[AuthContext] = Depends(optional_active_user),  # Cho phép truyền token (nếu có) để kiểm soát quyền tạo user
):
    """
    - Cho phép tạo user đầu tiên không cần đăng nhập.
    - Các lần tiếp theo yêu cầu JWT hợp lệ (đã đăng nhập).
    """
    stmt_count = select(func.count()).select_from(AuthUser)  # Đếm số user hiện có
    existing_count = db.scalar(stmt_count) or 0  # Lấy kết quả đếm (mặc định 0 nếu None)
    if existing_count > 0 and auth is None:  # Nếu đã có user và chưa đăng nhập thì chặn tạo thêm
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu đăng nhập trước khi tạo thêm người dùng.",
        )

    stmt = select(AuthUser).where(AuthUser.username == payload.username)  # Kiểm tra username đã tồn tại chưa
    if db.execute(stmt).scalar_one_or_none():  # Nếu trùng username thì trả mã lỗi 409
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username đã tồn tại.")

    # bcrypt chỉ hỗ trợ tối đa 72 byte nên cần kiểm tra trước khi băm
    password_bytes = payload.password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu quá dài (tối đa 72 byte khi mã hóa UTF-8).",
        )

    new_user = AuthUser(  # Tạo entity user mới với mật khẩu đã băm
        username=payload.username,
        password_hash=hash_password(payload.password),
    )
    db.add(new_user)  # Đưa entity vào session
    db.commit()  # Commit để lưu vào DB
    db.refresh(new_user)  # Refresh để có ID auto-increment
    return {"id": new_user.id, "username": new_user.username}  # Trả về thông tin tóm tắt user vừa tạo

@app.get("/health", tags=["Health"], summary="Kiểm tra tình trạng dịch vụ")
def health():
    payload = {"status": "ok", "model_version": _th.get("model_version")}
    if _registry_version:
        payload["registry_version"] = _registry_version
    if _alias:
        payload["alias"] = _alias
    return payload

@app.post(
    "/reload",
    tags=["Admin"],
    summary="Nạp lại model và artifacts hiện hành",
    dependencies=[Depends(require_active_user)],  # Chỉ cho phép người dùng đã đăng nhập
)
def reload_model():
    _hydrate()
    return {"status": "reloaded", "model_version": _th.get("model_version"), "registry_version": _registry_version}

@app.post(
    "/score",
    tags=["Scoring"],
    summary="Chấm điểm một giao dịch",
    dependencies=[Depends(require_active_user)],  # Bảo vệ endpoint bằng JWT
)
def score(tx: Tx):
    df = pd.DataFrame([tx.dict()])
    X = df_align(df)
    cat_cols = [c for c in ["receiving_country","country_code","id_type","stay_qualify","payment_method"] if c in X.columns]
    Xe, _ = encode_categoricals(X, cat_cols, _encoders)
    Xs = sanitize_for_model(Xe, _feat_cols, _medians)

    scores, decisions, details = score_decide_with_explanations(
        _model,
        Xs,
        _th["threshold_low"],
        _th["threshold_high"],
        _feat_cols,
        _medians,
        key_values=[tx.transaction_seq],
        include_allow=True,
        top_k=3,
    )

    reasons_json = details.loc[details["transaction_seq"] == tx.transaction_seq, "reasons_json"].iloc[0]
    reasons = json.loads(reasons_json) if reasons_json else []
    return {
        "transaction_seq": tx.transaction_seq,
        "score": float(scores[0]),
        "decision": decisions[0],
        "threshold_low": _th["threshold_low"],
        "threshold_high": _th["threshold_high"],
        "model_version": _th["model_version"],
        "reasons": reasons
    }

@app.post(
    "/score/batch",
    tags=["Scoring"],
    summary="Chấm điểm nhiều giao dịch dạng JSON",
    dependencies=[Depends(require_active_user)],  # Bảo vệ endpoint bằng JWT
)
def score_batch(payload: TxBatch):
    if not payload.transactions:
        return {
            "count": 0,
            "results": [],
            "threshold_low": _th["threshold_low"],
            "threshold_high": _th["threshold_high"],
            "model_version": _th["model_version"],
        }

    df = pd.DataFrame([tx.dict() for tx in payload.transactions])
    X = df_align(df)
    cat_cols = [c for c in ["receiving_country","country_code","id_type","stay_qualify","payment_method"] if c in X.columns]
    Xe, _ = encode_categoricals(X, cat_cols, _encoders)
    Xs = sanitize_for_model(Xe, _feat_cols, _medians)

    key_vals = df["transaction_seq"].astype(int).tolist()
    _, _, details = score_decide_with_explanations(
        _model,
        Xs,
        _th["threshold_low"],
        _th["threshold_high"],
        _feat_cols,
        _medians,
        key_values=key_vals,
        include_allow=True,
        top_k=3,
    )

    detail_rows = details.copy()
    detail_rows["reasons"] = detail_rows["reasons_json"].apply(lambda x: json.loads(x) if x else [])
    detail_rows.drop(columns=["reasons_json"], inplace=True)

    return {
        "count": len(detail_rows),
        "threshold_low": _th["threshold_low"],
        "threshold_high": _th["threshold_high"],
        "model_version": _th["model_version"],
        "results": detail_rows.to_dict(orient="records"),
    }

@app.post(
    "/score/upload",
    tags=["Scoring"],
    summary="Chấm điểm hàng loạt từ tệp CSV",
    dependencies=[Depends(require_active_user)],  # Bảo vệ endpoint bằng JWT
)
async def score_upload(file: UploadFile = File(...), include_allow: bool = True, top_k: int = 3):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tệp CSV.")

    try:
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode("utf-8-sig")))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Không đọc được CSV: {exc}")

    required_cols = {"transaction_seq"}
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Thiếu cột bắt buộc trong CSV: {', '.join(sorted(missing))}")

    X = df_align(df)
    cat_cols = [c for c in ["receiving_country","country_code","id_type","stay_qualify","payment_method"] if c in X.columns]
    Xe, _ = encode_categoricals(X, cat_cols, _encoders)
    Xs = sanitize_for_model(Xe, _feat_cols, _medians)

    key_vals = df["transaction_seq"].astype(int).tolist()
    _, _, details = score_decide_with_explanations(
        _model,
        Xs,
        _th["threshold_low"],
        _th["threshold_high"],
        _feat_cols,
        _medians,
        key_values=key_vals,
        include_allow=include_allow,
        top_k=top_k,
    )

    detail_rows = details.copy()
    detail_rows["reasons"] = detail_rows["reasons_json"].apply(lambda x: json.loads(x) if x else [])
    detail_rows.drop(columns=["reasons_json"], inplace=True)

    return {
        "filename": file.filename,
        "count": len(detail_rows),
        "threshold_low": _th["threshold_low"],
        "threshold_high": _th["threshold_high"],
        "model_version": _th["model_version"],
        "results": detail_rows.to_dict(orient="records"),
    }
