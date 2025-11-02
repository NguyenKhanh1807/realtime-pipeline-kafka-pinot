from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

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
    pass


@dataclass
class AuthContext:
    user_id: int
    username: str
    token_jti: str


def _ensure_schema() -> None:
    global _schema_initialized
    if _schema_initialized:
        return
    engine = get_engine()
    Base.metadata.create_all(bind=engine, checkfirst=True)
    _schema_initialized = True


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def authenticate_user(db: Session, username: str, password: str) -> Optional[AuthUser]:
    _ensure_schema()
    stmt = select(AuthUser).where(AuthUser.username == username)
    user = db.execute(stmt).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def _jwt_payload(user_id: int, jti: str, expires_at: datetime) -> dict:
    return {
        "sub": str(user_id),
        "jti": jti,
        "exp": expires_at,
        "iat": datetime.now(tz=timezone.utc),
        "type": "access",
    }


def issue_token(db: Session, user: AuthUser) -> str:
    if not settings.JWT_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET_KEY chưa được cấu hình.",
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


def _load_token_record(db: Session, token: str) -> AuthToken:
    if not settings.JWT_SECRET_KEY:
        raise AuthError("Chưa cấu hình JWT_SECRET_KEY.")
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token đã hết hạn.") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("Token không hợp lệ.") from exc
    sub = payload.get("sub")
    jti = payload.get("jti")
    if not sub or not jti:
        raise AuthError("Token thiếu thông tin bắt buộc.")
    stmt = select(AuthToken).where(AuthToken.token_jti == jti)
    db_token = db.execute(stmt).scalar_one_or_none()
    if db_token is None:
        raise AuthError("Token không tồn tại hoặc đã bị thu hồi.")
    if db_token.user_id != int(sub):
        raise AuthError("Token không khớp người dùng.")
    if db_token.revoked_at is not None:
        raise AuthError("Token đã bị thu hồi.")
    if db_token.expires_at < datetime.now(tz=timezone.utc):
        raise AuthError("Token đã hết hạn.")
    return db_token


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


def require_active_user(token: AuthToken = Depends(get_current_auth_token)) -> AuthContext:
    user = token.user
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không truy xuất được thông tin người dùng.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa.",
        )
    return AuthContext(user_id=user.id, username=user.username, token_jti=token.token_jti)


def revoke_token(db: Session, token_jti: str) -> None:
    stmt = (
        update(AuthToken)
        .where(AuthToken.token_jti == token_jti, AuthToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(tz=timezone.utc))
    )
    db.execute(stmt)
    db.commit()


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
            detail="Tài khoản đã bị vô hiệu hóa.",
        )
    return AuthContext(user_id=user.id, username=user.username, token_jti=db_token.token_jti)
