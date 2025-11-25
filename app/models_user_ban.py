from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class UserBan(Base):
    __tablename__ = "user_bans"

    id = Column(Integer, primary_key=True, index=True)
    user_seq = Column(String(50), nullable=False)
    ban_level = Column(String(20), nullable=False)
    reason = Column(Text)
    banned_by = Column(String(100))
    banned_at = Column(DateTime, default=func.now())
    unbanned_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_seq": self.user_seq,
            "ban_level": self.ban_level,
            "reason": self.reason,
            "banned_by": self.banned_by,
            "banned_at": self.banned_at.isoformat() if self.banned_at else None,
            "unbanned_at": self.unbanned_at.isoformat() if self.unbanned_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
