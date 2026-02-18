from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime

class MeasurementsOut(BaseModel):
    neck: Optional[float] = None
    shoulder_width: Optional[float] = None
    abdomen: Optional[float] = None
    waist: Optional[float] = None
    hip: Optional[float] = None
    thigh: Optional[float] = None
    knee: Optional[float] = None
    calf: Optional[float] = None
    ankle: Optional[float] = None

class BodyCompositionOut(BaseModel):
    bmi: float
    body_fat_percentage: float
    fat_mass_kg: float
    lean_mass_kg: float
    waist_to_hip_ratio: float

class HealthAssessmentOut(BaseModel):
    category: str
    risk_level: str
    recommendation: str

class ScanResultOut(BaseModel):
    session_id: str
    measurements: MeasurementsOut
    body_composition: BodyCompositionOut
    health_assessment: HealthAssessmentOut
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
