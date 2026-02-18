from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.models.scan import ScanSession, ScanSegmentResult
from app.services.scan_template import allowed_segments
from app.services.mock_scan_generator import mock_segment_metrics

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/mock-scan")
def mock_scan(user_id: int, db: DbSession = Depends(get_db)):
    scan = ScanSession(user_id=user_id, template_version="v1", source="mock")
    db.add(scan)
    db.commit()
    db.refresh(scan)

    for seg in allowed_segments("v1"):
        metrics = mock_segment_metrics(seg)
        db.add(ScanSegmentResult(
            scan_id=scan.id,
            segment_type=seg,
            metrics=metrics,
            quality=metrics.get("quality"),
        ))
    db.commit()

    return {"scan_id": scan.id, "segments": allowed_segments("v1")}
