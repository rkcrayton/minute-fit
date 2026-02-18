from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime


class ScanStartRequest(BaseModel):
    template_version: str = "v1"
    source: str = "mock"


class ScanSessionResponse(BaseModel):
    id: int
    user_id: int
    template_version: str
    source: str
    started_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SegmentMetricsUpsert(BaseModel):
    metrics: Dict[str, Any]
    quality: Optional[float] = None


class ScanSegmentResponse(BaseModel):
    id: int
    scan_id: int
    segment_type: str
    metrics: Dict[str, Any]
    quality: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InsightItem(BaseModel):
    message: str
    severity: str  # low | med | high
    tag: str       # depth | tempo | symmetry | stability | mobility | posture | quality
    evidence: Dict[str, Any] = {}


class ScanReportResponse(BaseModel):
    scan_id: int
    overall_score: float
    summary: Dict[str, Any]
    insights: List[InsightItem]
