from contextlib import contextmanager  # Dùng contextmanager để kiểm soát vòng đời session
from typing import Iterator, Optional  # Khai báo kiểu trả về cho các helper session

from sqlalchemy import create_engine  # create_engine giúp khởi tạo kết nối DB toàn cục
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker  # Dùng ORM của SQLAlchemy. DeclarativeBase là base class cho model. Session là session ORM, sessionmaker là factory tạo session

from app.config import settings  # Nạp cấu hình ứng dụng (bao gồm DB_URL)


class Base(DeclarativeBase):  # Base chung cho mọi model ORM
    """Declarative base for ORM models."""  # Giữ nguyên mô tả tổng quát


_engine = None  # Biến toàn cục lưu engine để tái sử dụng. Là biến toàn cục module
SessionLocal: Optional[sessionmaker[Session]] = None  # Session factory được cache lại


def _init_engine() -> None:  # Hàm nội bộ đảm bảo engine chỉ khởi tạo một lần
    global _engine, SessionLocal  # Dùng global để cập nhật biến module
    if not settings.DB_URL:  # Kiểm tra cấu hình DB có tồn tại không
        raise RuntimeError("DB_URL is not configured; JWT xác thực cần kết nối database.")  # Báo lỗi rõ ràng nếu thiếu

    if _engine is None:  # Chỉ tạo engine khi chưa có
        _engine = create_engine(  # Tạo engine với cấu hình chuẩn
            settings.DB_URL,  # Chuỗi kết nối lấy từ biến môi trường
            pool_pre_ping=True,  # Kiểm tra kết nối sẵn trước khi dùng để tránh connection chết
            future=True,  # Sử dụng API 2.0 của SQLAlchemy
        )
        SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, class_=Session)  # Tạo session factory không auto-expire


def get_engine():  # Public helper trả về engine đã khởi tạo
    if _engine is None:  # Nếu chưa có engine thì khởi tạo
        _init_engine()  # Đảm bảo engine tồn tại
    return _engine  # Trả về engine hiện tại


def get_sessionmaker() -> sessionmaker[Session]:  # Helper lấy session factory, tạo “nhà máy” sinh Session mới cho mỗi lần cần kết nối.
    if SessionLocal is None:  # Nếu chưa có thì khởi tạo
        _init_engine()  # Đảm bảo session factory đã tồn tại
    return SessionLocal  # type: ignore[return-value]  # Trả về session factory đã cache


@contextmanager  # Cho phép dùng with db_session() như context manager
def db_session() -> Iterator[Session]:  # Helper chủ động commit/rollback
    session_factory = get_sessionmaker()  # Lấy session factory hiện tại
    session = session_factory()  # Mở một session mới
    try:
        yield session  # Cho caller sử dụng session
        session.commit()  # Nếu không lỗi thì commit
    except Exception:  # Bắt mọi exception để rollback
        session.rollback()  # Rollback khi có lỗi
        raise  # Ném lại exception để caller xử lý
    finally:
        session.close()  # Đảm bảo session luôn được đóng


def get_db() -> Iterator[Session]:  # Dependency FastAPI trả về session cho mỗi request
    session_factory = get_sessionmaker()  # Lấy session factory
    db = session_factory()  # Tạo session mới
    try:
        yield db  # Trả session cho FastAPI dùng
    finally:
        db.close()  # Đóng session sau khi request kết thúc
