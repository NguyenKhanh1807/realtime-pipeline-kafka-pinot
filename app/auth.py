from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, get_db, get_engine
from app.models_auth import AuthToken, AuthUser

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
_schema_initialized = False

class AuthError(Exception):
    """Internal: used when authentication information validation fails."""

@dataclass
class AuthContext:
    user_id: int
    username: str
    token_jti: str

# Hàm đảm bảo schema auth_users và auth_tokens được tạo trong DB
def _ensure_schema() -> None:
    global _schema_initialized
    if _schema_initialized:
        return
    engine = get_engine()
    Base.metadata.create_all(bind=engine, checkfirst=True)
    _schema_initialized = True

# Hàm băm mật khẩu plain-text bằng bcrypt
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Hàm kiểm tra mật khẩu người dùng nhập vào với hash lưu trong DB
def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)

# Hàm đăng nhập: xác thực username/password và trả về đối tượng user nếu hợp lệ
def authenticate_user(db: Session, username: str, password: str) -> Optional[AuthUser]:
    _ensure_schema()
    stmt = select(AuthUser).where(AuthUser.username == username)
    user = db.execute(stmt).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

# Hàm tạo payload chuẩn cho JWT access token
def _jwt_payload(user_id: int, jti: str, expires_at: datetime) -> dict:
    return {
        "sub": str(user_id),
        "jti": jti,
        "exp": expires_at,
        "iat": datetime.now(tz=timezone.utc),
        "type": "access",
    }

# Hàm phát hành JWT mới và lưu thông tin token xuống DB
def issue_token(db: Session, user: AuthUser) -> str:
    if not settings.JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET_KEY is not configured.",
        )
    lifetime = timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    expires_at = datetime.now(tz=timezone.utc) + lifetime
    token_jti = AuthToken.new_jti()
    payload = _jwt_payload(user.id, token_jti, expires_at)
    encoded = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    db_token = AuthToken(
        token_jti=token_jti,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(db_token)
    db.commit()
    return encoded

# Hàm đọc JWT gửi lên và đối chiếu với bản ghi lưu trong DB
def _load_token_record(db: Session, token: str) -> AuthToken:
    if not settings.JWT_SECRET_KEY:
        raise AuthError("JWT_SECRET_KEY not configured.")
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token has expired.") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid token.") from exc
    sub = payload.get("sub")
    jti = payload.get("jti")
    if not sub or not jti:
        raise AuthError("Token is missing required information.")
    stmt = select(AuthToken).where(AuthToken.token_jti == jti)
    db_token = db.execute(stmt).scalar_one_or_none()
    if db_token is None:
        raise AuthError("Token does not exist or has been revoked.")
    if db_token.user_id != int(sub):
        raise AuthError("Token does not match user.")
    if db_token.revoked_at is not None:
        raise AuthError("Token has been revoked.")
    if db_token.expires_at < datetime.now(tz=timezone.utc):
        raise AuthError("Token has expired.")
    return db_token

# Dependency FastAPI đọc bearer token và trả về bản ghi AuthToken
def get_current_auth_token(
    bearer_token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AuthToken:
    _ensure_schema()
    try:
        token = _load_token_record(db, bearer_token)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return token

# Dependency buộc người dùng phải còn hoạt động và trả về AuthContext gọn nhẹ
def require_active_user(token: AuthToken = Depends(get_current_auth_token)) -> AuthContext:
    user = token.user
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve user information.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled.",
        )
    return AuthContext(user_id=user.id, username=user.username, token_jti=token.token_jti)

# Hàm thu hồi token bằng cách set revoked_at trong DB
def revoke_token(db: Session, token_jti: str) -> None:
    stmt = (
        update(AuthToken)
        .where(AuthToken.token_jti == token_jti, AuthToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(tz=timezone.utc))
    )
    db.execute(stmt)
    db.commit()

# Dependency tùy chọn: chỉ trả về AuthContext khi header Bearer hợp lệ
def optional_active_user(
    authorization: Optional[str] = Security(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[AuthContext]:
    if not authorization:
        return None
    try:
        db_token = _load_token_record(db, authorization)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    user = db_token.user
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled.",
        )
    return AuthContext(user_id=user.id, username=user.username, token_jti=db_token.token_jti)
