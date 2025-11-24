import logging
import io
import json
import asyncio 
import sys 
from pathlib import Path 
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status 
from fastapi.security import OAuth2PasswordRequestForm  
from pydantic import BaseModel, constr  
import pandas as pd
from typing import Optional, List
from sqlalchemy import func, select  
from sqlalchemy.orm import Session  
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.model_io import load_model_and_artifacts
from app.preprocess import prepare_features_for_inference
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
from fastapi.middleware.cors import CORSMiddleware 


# uvicorn app.api:app --host 0.0.0.0 --port 8080 
LOGGER = logging.getLogger(__name__)
configure_logging()  

app = FastAPI(
    title="Fraud Scoring Service",
    description=(
        "API for real-time and batch fraud scoring. "
        "Swagger UI documentation is available at /docs, ReDoc at /redoc."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
origins = [
    "http://localhost:3000", 
    "http://0.0.0.0:3000",
    
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,              # Cho phép các nguồn gốc (origins) này truy cập
    allow_credentials=True,             # Cho phép cookies/headers ủy quyền (Auth headers)
    allow_methods=["*"],                # Cho phép tất cả các phương thức (GET, POST, PUT, DELETE)
    allow_headers=["*"],                # Cho phép tất cả các tiêu đề (bao gồm Authorization)
)
#  Scheduler 
PYTHON_BIN = sys.executable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
scheduler = AsyncIOScheduler()

def _hydrate():
    global _model, _encoders, _schema_pack, _th, _alias, _registry_version, _feat_cols, _medians, _train_like, _clipping_bounds
    _model, _encoders, _schema_pack, _th = load_model_and_artifacts()
    _feat_cols, _medians, _clipping_bounds, _train_like = _schema_pack
    _alias = settings.MLFLOW_MODEL_ALIAS if settings.MLFLOW_MODEL_NAME else None
    _registry_version = _th.get("model_version_registry") or _th.get("registry_version")

_hydrate()


# async def run_retrain_job_scheduled():
#     """Chạy retrain_rolling_mlflow.py trong một tiến trình con (subprocess)."""
#     script_path = str(PROJECT_ROOT / "scripts/retrain_rolling_mlflow.py")
#     LOGGER.info(f"SCHEDULER: Starting {script_path}")
#     try:
#         proc = await asyncio.create_subprocess_exec(PYTHON_BIN, script_path)
#         await proc.wait()
#         LOGGER.info(f"SCHEDULER: Finished {script_path} with code {proc.returncode}")
#         if proc.returncode == 0:
#             LOGGER.info("SCHEDULER: Reloading model and artifacts after retrain...")
#             _hydrate()
#     except Exception as e:
#         LOGGER.error(f"SCHEDULER: Failed to run {script_path}: {e}", exc_info=True)

# # Startup/Shutdown 
# @app.on_event("startup")
# async def startup_event():
#     """Khi API khởi động, hãy khởi động Scheduler."""
#     LOGGER.info("Scheduler starting...")
#     # Thêm các tác vụ vào lịch trình
#     scheduler.add_job(run_retrain_job_scheduled, 'interval', minutes=5, id="retrain_job")
#     scheduler.start()

# @app.on_event("shutdown")
# async def shutdown_event():
#     """Khi API tắt, hãy tắt Scheduler."""
#     logging.info("Scheduler shutting down...")
#     scheduler.shutdown()


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
    access_token: str  
    token_type: str = "bearer"  
    expires_in: int  
    username: str  

class RegisterRequest(BaseModel):
    username: constr(min_length=3, max_length=150)  
    password: constr(min_length=8, max_length=128)  

def _jwt_ttl_seconds() -> int:
    return settings.JWT_ACCESS_EXPIRE_MINUTES * 60  

@app.post("/auth/login", tags=["Auth"], response_model=TokenResponse, summary="Login and obtain JWT")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),  
    db: Session = Depends(get_db), 
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = issue_token(db, user)
    return TokenResponse(  
        access_token=token,
        expires_in=_jwt_ttl_seconds(),
        username=user.username,
    ) 


@app.post("/auth/logout", tags=["Auth"], summary="Logout and revoke JWT")
def logout(
    auth: AuthContext = Depends(require_active_user),  
    db: Session = Depends(get_db),  
):
    revoke_token(db, auth.token_jti)
    return {"status": "logged_out"} 


@app.post(
    "/auth/register",
    tags=["Auth"],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
def register(
    payload: RegisterRequest,  
    db: Session = Depends(get_db), 
    auth: Optional[AuthContext] = Depends(optional_active_user), 
):
    # stmt_count = select(func.count()).select_from(AuthUser) 
    # existing_count = db.scalar(stmt_count) or 0 
    # if existing_count > 0 and auth is None: 
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Registration is disabled for unauthenticated users.",
    #     )

    stmt = select(AuthUser).where(AuthUser.username == payload.username)  # Kiểm tra username đã tồn tại chưa
    if db.execute(stmt).scalar_one_or_none(): 
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username has been taken.")

    password_bytes = payload.password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long (maximum 72 bytes when UTF-8 encoded).",
        )

    new_user = AuthUser(  
        username=payload.username,
        password_hash=hash_password(payload.password),
    )
    db.add(new_user) 
    db.commit()  
    db.refresh(new_user) 
    return {"id": new_user.id, "username": new_user.username}  

@app.get("/health", tags=["Health"], summary="Check service health")
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
    summary="Reload model and artifacts from disk or MLflow Registry",
    dependencies=[Depends(require_active_user)], 
)
def reload_model():
    _hydrate()
    return {"status": "reloaded", "model_version": _th.get("model_version"), "registry_version": _registry_version}

@app.post(
    "/score",
    tags=["Scoring"],
    summary="Score a single transaction",
    dependencies=[Depends(require_active_user)],  
)
def score(tx: Tx):
    df = pd.DataFrame([tx.dict()])

    Xs = prepare_features_for_inference(
        df_raw=df,
        feat_cols=_feat_cols,
        encoders=_encoders,
        medians=_medians,
        maybe_cats=["receiving_country","country_code","id_type","stay_qualify","payment_method", "payment_method_filled"],
        clipping_bounds=_clipping_bounds 
    )

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
    summary="Score a batch of transactions",
    dependencies=[Depends(require_active_user)],  
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
    Xs = prepare_features_for_inference(
        df_raw=df,
        feat_cols=_feat_cols,
        encoders=_encoders,
        medians=_medians,
        maybe_cats=["receiving_country","country_code","id_type","stay_qualify","payment_method", "payment_method_filled"],
        clipping_bounds=_clipping_bounds
    )

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
    summary="Score transactions from uploaded CSV file",
    dependencies=[Depends(require_active_user)], 
)
async def score_upload(file: UploadFile = File(...), include_allow: bool = True, top_k: int = 3):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    try:
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode("utf-8-sig")))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {exc}")

    required_cols = {"transaction_seq"}
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns in CSV: {', '.join(missing)}")

    Xs = prepare_features_for_inference(
        df_raw=df,
        feat_cols=_feat_cols,
        encoders=_encoders,
        medians=_medians,
        maybe_cats=["receiving_country","country_code","id_type","stay_qualify","payment_method", "payment_method_filled"],
        clipping_bounds=_clipping_bounds
    )

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


# loaded_model = mlflow.pyfunc.load_model(logged_model_uri)
# prediction_scores = loaded_model.predict(df_new_raw)