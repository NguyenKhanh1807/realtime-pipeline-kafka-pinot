from datetime import datetime, timezone  # Dùng timezone-aware datetime cho log chính xác
from typing import Optional  # Cho phép các trường có thể rỗng
from uuid import uuid4  # Sinh mã định danh duy nhất cho token (JTI)

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String  # Kiểu dữ liệu cột
from sqlalchemy.orm import Mapped, mapped_column, relationship  # Khai báo ORM kiểu type-annotated

from app.database import Base  # Base ORM được khai báo trong database.py


def utcnow() -> datetime:  # Helper lấy thời gian hiện tại dạng UTC
    return datetime.now(timezone.utc)  # Bảo đảm mọi timestamp đều theo UTC


class AuthUser(Base):  # Bảng lưu thông tin người dùng đăng nhập
    __tablename__ = "auth_users"  # Đặt tên bảng rõ ràng

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)  # Khóa chính tự tăng
    username: Mapped[str] = mapped_column(String(150), unique=True, index=True)  # Username duy nhất và có index
    password_hash: Mapped[str] = mapped_column(String(255))  # Lưu mật khẩu đã băm
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # Cờ bật/tắt tài khoản
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)  # Thời điểm tạo user

    tokens: Mapped[list["AuthToken"]] = relationship(
        "AuthToken", back_populates="user", cascade="all, delete-orphan"  # Quan hệ 1-n với các token của user
    )


class AuthToken(Base):  # Bảng lưu từng JWT đã phát hành
    __tablename__ = "auth_tokens"  # Tên bảng token

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)  # Khóa chính tự tăng
    token_jti: Mapped[str] = mapped_column(String(36), unique=True, index=True)  # Mã định danh token (UUID4)
    user_id: Mapped[int] = mapped_column(ForeignKey("auth_users.id", ondelete="CASCADE"))  # Tham chiếu tới user
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)  # Thời điểm phát token
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))  # Hạn sử dụng token
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # Thời điểm thu hồi nếu có

    user: Mapped["AuthUser"] = relationship("AuthUser", back_populates="tokens")  # Liên kết ngược về user

    @staticmethod
    def new_jti() -> str:  # Helper sinh mã JTI mới
        return str(uuid4())  # Trả về chuỗi UUID dạng string
