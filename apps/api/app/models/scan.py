from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base

class ScanSession(Base): 
    __tablename__ = "scan_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    template_version = Column(String, index=True, nullable=False, default=1)

    source = Column(String, index=True, nullable=False, default="mock")  # mock | movenet

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="scan_sessions")
    segments = relationship("ScanSegmentResult", back_populates="scan", cascade="all, delete-orphan")
    report = relationship("ScanReport", back_populates="scan", uselist=False, cascade="all, delete-orphan")

class ScanSegmentResult(Base):
    __tablename__ = "scan_segment_results"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_sessions.id"), index=True, nullable=False)

    segment_type = Column(String, index=True, nullable=False)  # squat, overhead_reach
    metrics = Column(JSONB, nullable=False, default=dict)      # flexible payload
    quality = Column(Float, nullable=True)                     # optional 0-1

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    scan = relationship("ScanSession", back_populates="segments")


class ScanReport(Base):
    __tablename__ = "scan_reports"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_sessions.id"), unique=True, index=True, nullable=False)

    overall_score = Column(Float, nullable=False, default=0.0)  # 0-100
    insights = Column(JSONB, nullable=False, default=list)      # list of insights
    summary = Column(JSONB, nullable=False, default=dict)       # key findings and rollups

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    scan = relationship("ScanSession", back_populates="report")