from datetime import date
from sqlalchemy import Column, Integer, String, Date, TIMESTAMP, func
from app.database import Base

class TransactionUser(Base):
    """Model representing users for transaction generation."""
    __tablename__ = "transaction_users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_seq = Column(Integer, unique=True, nullable=False, index=True)
    user_name = Column(String(255), nullable=False)
    country_code = Column(String(2), nullable=False)
    id_type = Column(String(20), nullable=False)
    birth_date = Column(Date, nullable=False)
    register_date = Column(Date, nullable=False)
    first_transaction_date = Column(Date, nullable=False)
    status = Column(String(20), default='normal')
    ban_reason = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'user_seq': self.user_seq,
            'user_name': self.user_name,
            'country_code': self.country_code,
            'id_type': self.id_type,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'register_date': self.register_date.isoformat() if self.register_date else None,
            'first_transaction_date': self.first_transaction_date.isoformat() if self.first_transaction_date else None,
            'status': self.status or 'normal',
            'ban_reason': self.ban_reason,
        }

