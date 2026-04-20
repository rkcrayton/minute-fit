from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    jti = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
