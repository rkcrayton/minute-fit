from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.models.scan import ScanSession, ScanSegmentResult, ScanReport
from app.schemas.scan import (
    ScanStartRequest,
    ScanSessionResponse,
    SegmentUpsertRequest,
    ScanSegmentResponse,
    ScanReportResponse,
)
from app.services.scan_template import allowed_segments
from app.services.insights_engine import build_scan_report

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post("/start", response_model=ScanSessionResponse)
def start_scan(user_id: int, payload: ScanStartRequest, db: DbSession = Depends(get_db)):
    scan = ScanSession(user_id=user_id, template_version=payload.template_version, source=payload.source)
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


@router.post("/{scan_id}/segments/{segment_type}", response_model=ScanSegmentResponse)
def upsert_segment(scan_id: int, segment_type: str, payload: SegmentUpsertRequest, db: DbSession = Depends(get_db)):
    scan = db.query(ScanSession).filter(ScanSession.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    allowed = allowed_segments(scan.template_version)
    if segment_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid segment_type. Allowed: {allowed}")

    # upsert by (scan_id, segment_type)
    row = (
        db.query(ScanSegmentResult)
        .filter(ScanSegmentResult.scan_id == scan_id, ScanSegmentResult.segment_type == segment_type)
        .first()
    )
    if row:
        row.metrics = payload.metrics
        row.quality = payload.quality
    else:
        row = ScanSegmentResult(
            scan_id=scan_id,
            segment_type=segment_type,
            metrics=payload.metrics,
            quality=payload.quality,
        )
        db.add(row)

    db.commit()
    db.refresh(row)
    return row


@router.get("/{scan_id}/segments", response_model=list[ScanSegmentResponse])
def list_segments(scan_id: int, db: DbSession = Depends(get_db)):
    return (
        db.query(ScanSegmentResult)
        .filter(ScanSegmentResult.scan_id == scan_id)
        .order_by(ScanSegmentResult.created_at.asc())
        .all()
    )


@router.post("/{scan_id}/finalize", response_model=ScanReportResponse)
def finalize_scan(scan_id: int, db: DbSession = Depends(get_db)):
    scan = db.query(ScanSession).filter(ScanSession.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    seg_rows = db.query(ScanSegmentResult).filter(ScanSegmentResult.scan_id == scan_id).all()
    if not seg_rows:
        raise HTTPException(status_code=400, detail="No segments submitted for this scan")

    segments = {r.segment_type: r.metrics for r in seg_rows}
    overall, summary, insights = build_scan_report(scan.template_version, segments)

    report = db.query(ScanReport).filter(ScanReport.scan_id == scan_id).first()
    if report:
        report.overall_score = overall
        report.summary = summary
        report.insights = insights
    else:
        report = ScanReport(scan_id=scan_id, overall_score=overall, summary=summary, insights=insights)
        db.add(report)

    scan.ended_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(report)

    return {
        "scan_id": scan_id,
        "overall_score": float(report.overall_score),
        "summary": report.summary,
        "insights": report.insights,
    }


@router.get("/{scan_id}/report", response_model=ScanReportResponse)
def get_report(scan_id: int, db: DbSession = Depends(get_db)):
    report = db.query(ScanReport).filter(ScanReport.scan_id == scan_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found (finalize first)")
    return {
        "scan_id": scan_id,
        "overall_score": float(report.overall_score),
        "summary": report.summary,
        "insights": report.insights,
    }
