from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from database import Base


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Body composition
    bmi = Column(Float, nullable=True)
    body_fat_percentage = Column(Float, nullable=True)
    fat_mass_kg = Column(Float, nullable=True)
    lean_mass_kg = Column(Float, nullable=True)
    waist_to_hip_ratio = Column(Float, nullable=True)

    # Health assessment
    health_category = Column(String, nullable=True)
    health_risk_level = Column(String, nullable=True)
    health_recommendation = Column(String, nullable=True)

    # Raw measurements (stored as JSON)
    measurements = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
