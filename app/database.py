from contextlib import contextmanager
from typing import Iterator, Optional
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from app.config import settings

class Base(DeclarativeBase):
    """Declarative base for ORM models."""

_engine = None
SessionLocal: Optional[sessionmaker[Session]] = None


def _init_engine() -> None:
    global _engine, SessionLocal
    if not settings.DB_URL:
        raise RuntimeError("DB_URL is not configured; JWT authentication requires a database connection.")

    if _engine is None:
        _engine = create_engine(
            settings.DB_URL,
            pool_pre_ping=True,
            future=True,
        )
        SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, class_=Session)

def get_engine():
    if _engine is None:
        _init_engine()
    return _engine


def get_sessionmaker() -> sessionmaker[Session]:
    if SessionLocal is None:
        _init_engine()
    return SessionLocal  # type: ignore[return-value]

@contextmanager
def db_session() -> Iterator[Session]:
    session_factory = get_sessionmaker()
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_db() -> Iterator[Session]:
    session_factory = get_sessionmaker()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
