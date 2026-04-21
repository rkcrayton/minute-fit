import io
import re
import uuid
import cv2
import pillow_heif
from pathlib import Path
from PIL import Image as PILImage
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import auth
from database import get_db
from limiter import limiter

import logging
_log = logging.getLogger(__name__)
from models.user import User
from models.scan_result import ScanResult

router = APIRouter(prefix="/scan", tags=["scan"])

# Regex to validate session_id format (UUID v4 only — prevents path traversal)
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def _validate_session_id(session_id: str) -> None:
    """Reject session IDs that aren't valid UUIDs to prevent path traversal."""
    if not _UUID_RE.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID format")

# Image sanitization 
pillow_heif.register_heif_opener()  # enables PIL to open HEIC/HEIF files

MAX_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB per image
MAX_IMAGE_DIMENSION = 8000          # pixels on any single side


def _check_magic_bytes(data: bytes) -> bool:
    """
    Verify the raw bytes start with a known image magic signature.
    This prevents extension-spoofing (e.g. a renamed PDF or script).
    """
    if data[:3] == b'\xff\xd8\xff':               # JPEG
        return True
    if data[:8] == b'\x89PNG\r\n\x1a\n':          # PNG
        return True
    if len(data) >= 12 and data[4:8] == b'ftyp':  # HEIC/HEIF ISO Base Media
        return True
    return False


def _sanitize_image(raw: bytes, label: str) -> bytes:
    """
    Open image bytes with Pillow, validate pixel data, strip all metadata
    (EXIF, ICC profiles, embedded thumbnails, XMP, etc.), and re-encode as JPEG.

    Re-encoding through Pillow neutralises polyglot files and any embedded
    payloads because only the raw pixel array is preserved — everything else
    is discarded during decode/encode.
    """
    try:
        img = PILImage.open(io.BytesIO(raw))
        img.verify()                        # raises on corrupted / truncated data
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"{label} could not be decoded as a valid image.",
        )

    # Re-open after verify() (it exhausts the internal file pointer)
    img = PILImage.open(io.BytesIO(raw))

    if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"{label} dimensions are too large (max {MAX_IMAGE_DIMENSION}px per side).",
        )

    # Convert to plain RGB — strips alpha channel, all metadata, and colour profiles
    img = img.convert("RGB")

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=95)
    return out.getvalue()


# Directories for storing scan artifacts 
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "artifacts" / "uploads"
PROCESSED_DIR = BASE_DIR / "artifacts" / "processed"
MEASUREMENT_DIR = BASE_DIR / "artifacts" / "measurements"

for d in [UPLOADS_DIR, PROCESSED_DIR, MEASUREMENT_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def _assess_health(body_fat: float, gender: str, age: int) -> dict:
    """Categorize health status based on body fat, gender, and age."""
    if gender == 'male':
        if age < 40:
            thresholds = {'athletic': 14, 'fit': 18, 'acceptable': 25}
        elif age < 60:
            thresholds = {'athletic': 17, 'fit': 22, 'acceptable': 28}
        else:
            thresholds = {'athletic': 20, 'fit': 25, 'acceptable': 30}
    else:
        if age < 40:
            thresholds = {'athletic': 21, 'fit': 25, 'acceptable': 32}
        elif age < 60:
            thresholds = {'athletic': 24, 'fit': 29, 'acceptable': 35}
        else:
            thresholds = {'athletic': 27, 'fit': 32, 'acceptable': 38}

    if body_fat <= thresholds['athletic']:
        category = 'Athletic'
        risk = 'low'
        recommendation = 'Excellent body composition. Maintain current fitness level.'
    elif body_fat <= thresholds['fit']:
        category = 'Fit'
        risk = 'low'
        recommendation = 'Good body composition. Continue regular exercise and balanced diet.'
    elif body_fat <= thresholds['acceptable']:
        category = 'Acceptable'
        risk = 'moderate'
        recommendation = 'Consider increasing physical activity and improving diet quality.'
    else:
        category = 'Obese'
        risk = 'high'
        recommendation = 'Consult a healthcare provider. Focus on sustainable weight loss through diet and exercise.'

    return {
        'category': category,
        'risk_level': risk,
        'recommendation': recommendation,
    }


def _process_analysis_sync(
    session_id: str,
    front_path: str,
    side_path: str,
    back_path: str,
    height: float,
    weight: float,
    age: int,
    gender: str,
) -> dict:
    """
    Body composition analysis pipeline:
    1. Preprocess front/side/back photos
    2. Extract body circumference measurements via MediaPipe
    3. Calculate body fat using the US Navy formula
    4. Assess health category
    """
    from image_prep.front import BodyPhotoPreprocessor
    from image_prep.side import SideViewProcessor
    from image_prep.back import BackViewProcessor
    from utils.body_measurements import BodyCircumferenceEstimator
    from utils.volume_calculation import navy_body_fat

    # --- Step 1: Preprocess images ---
    front_out = str(PROCESSED_DIR / f"{session_id}_front.jpg")
    side_out = str(PROCESSED_DIR / f"{session_id}_side.jpg")
    back_out = str(PROCESSED_DIR / f"{session_id}_back.jpg")

    front_proc = BodyPhotoPreprocessor()
    side_proc = SideViewProcessor()
    back_proc = BackViewProcessor()

    front_result = front_proc.preprocess(front_path, front_out)
    if not front_result['success']:
        raise ValueError(f"Front photo: {front_result['message']}")

    side_result = side_proc.process(side_path, side_out)
    if not side_result['success']:
        raise ValueError(f"Side photo: {side_result['message']}")

    back_result = back_proc.process(back_path, back_out)
    if not back_result['success']:
        raise ValueError(f"Back photo: {back_result['message']}")

    # --- Step 2: Estimate circumferences via MediaPipe ---
    estimator = BodyCircumferenceEstimator(use_yolo=False)
    measurements = estimator.estimate(
        front_out, side_out, back_out,
        height_cm=height,
        output_dir=str(MEASUREMENT_DIR),
        session_id=session_id,
    )

    final_measurements = {
        'neck': measurements.neck,
        'shoulder_width': measurements.shoulder_width,
        'abdomen': measurements.abdomen,
        'waist': measurements.abdomen,
        'hip': measurements.hip,
        'thigh': measurements.thigh,
        'knee': measurements.knee,
        'calf': measurements.calf,
        'ankle': measurements.ankle,
    }

    # --- Step 3: Body fat via US Navy formula ---
    body_fat = navy_body_fat(
        gender=gender,
        height_cm=height,
        neck_cm=measurements.neck,
        abdomen_cm=measurements.abdomen,
        hip_cm=measurements.hip,
    )

    # --- Step 4: Remaining composition metrics ---
    height_m = height / 100
    bmi = round(weight / (height_m ** 2), 1)
    fat_mass = round(weight * body_fat / 100, 1)
    lean_mass = round(weight - fat_mass, 1)
    waist_to_hip = round(
        measurements.abdomen / measurements.hip if measurements.hip > 0 else 0.0, 3
    )

    health = _assess_health(body_fat, gender, age)

    # Convert to imperial (cm -> inches, kg -> lbs)
    CM_TO_IN = 1 / 2.54
    KG_TO_LBS = 2.20462
    imperial_measurements = {
        k: round(v * CM_TO_IN, 1) for k, v in final_measurements.items()
    }

    return {
        'session_id': session_id,
        'measurements': imperial_measurements,
        'body_composition': {
            'bmi': bmi,
            'body_fat_percentage': body_fat,
            'fat_mass_lbs': round(fat_mass * KG_TO_LBS, 1),
            'lean_mass_lbs': round(lean_mass * KG_TO_LBS, 1),
            'waist_to_hip_ratio': waist_to_hip,
        },
        'health_assessment': health,
    }


@router.post("/analyze", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
def analyze_body(
    request: Request,
    front: UploadFile = File(...),
    side: UploadFile = File(...),
    back: UploadFile = File(...),
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept front, side, and back photos from an authenticated user and run
    the full body composition analysis. User height, weight, age are pulled
    from their profile automatically.
    """
    # Validate the user has profile data needed for analysis
    if not current_user.height or not current_user.weight or not current_user.age:
        raise HTTPException(
            status_code=400,
            detail="Profile incomplete. Please set height, weight, and age before scanning."
        )

    gender = getattr(current_user, 'gender', 'neutral') or 'neutral'
    if gender not in ('male', 'female', 'neutral'):
        gender = 'neutral'

    # Save uploaded files with sanitization
    session_id = str(uuid.uuid4())
    allowed_ext = {'.jpg', '.jpeg', '.png', '.heic', '.heif'}

    def save_upload(upload: UploadFile, label: str) -> str:
        # Extension allowlist
        ext = Path(upload.filename or "").suffix.lower()
        if ext not in allowed_ext:
            raise HTTPException(
                status_code=400,
                detail=f"{label} must be jpg, png, or heic.",
            )

        # Size limit — read one extra byte to detect oversized files
        raw = upload.file.read(MAX_IMAGE_BYTES + 1)
        if len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"{label} exceeds the 20 MB size limit.",
            )

        # Magic byte check — confirms actual format matches extension
        if not _check_magic_bytes(raw):
            raise HTTPException(
                status_code=400,
                detail=f"{label} file content does not match a recognised image format.",
            )

        # Sanitize: decode, validate, strip all metadata, re-encode as JPEG
        # This neutralises polyglot files and any embedded payloads because only raw pixel data survives the PIL decode/encode round-trip.
        clean = _sanitize_image(raw, label)

        dest = str(UPLOADS_DIR / f"{session_id}_{label}.jpg")
        with open(dest, "wb") as f:
            f.write(clean)
        return dest

    front_path = save_upload(front, "front")
    side_path = save_upload(side, "side")
    back_path = save_upload(back, "back")

    # Downsample large images to max 1024px on longest side
    MAX_DIM = 1024
    for path in [front_path, side_path, back_path]:
        img = cv2.imread(path)
        h, w = img.shape[:2]
        if max(h, w) > MAX_DIM:
            scale = MAX_DIM / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            cv2.imwrite(path, img)

    # Run analysis
    try:
        result = _process_analysis_sync(
            session_id=session_id,
            front_path=front_path,
            side_path=side_path,
            back_path=back_path,
            height=float(current_user.height) * 2.54,       # inches -> cm
            weight=float(current_user.weight) * 0.453592,  # lbs -> kg
            age=int(current_user.age),
            gender=gender,
        )
    except ValueError as e:
        _log.warning("Scan analysis rejected (session=%s): %s", session_id, e)
        raise HTTPException(status_code=422, detail="Photo processing failed. Check image quality and try again.")
    except Exception:
        _log.exception("Scan analysis internal error (session=%s)", session_id)
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")

    # Generate AI insights via Vertex AI Gemini
    from services.llm import generate_scan_insights

    user_profile = {
        "age": current_user.age,
        "gender": gender,
        "height": current_user.height,
        "weight": current_user.weight,
        "fitness_goal": getattr(current_user, "fitness_goal", None),
    }
    ai_insights = generate_scan_insights(result, user_profile)

    # Persist result to database
    bc = result['body_composition']
    ha = result['health_assessment']

    scan = ScanResult(
        session_id=session_id,
        user_id=current_user.id,
        bmi=bc['bmi'],
        body_fat_percentage=bc['body_fat_percentage'],
        fat_mass_kg=bc['fat_mass_lbs'],
        lean_mass_kg=bc['lean_mass_lbs'],
        waist_to_hip_ratio=float(bc['waist_to_hip_ratio']),
        health_category=ha['category'],
        health_risk_level=ha['risk_level'],
        health_recommendation=ha['recommendation'],
        measurements=result['measurements'],
        ai_insights=ai_insights,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    result['ai_insights'] = ai_insights
    return result


@router.get("/history")
def get_scan_history(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Return a summary list of all scans for the current user, newest first."""
    scans = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == current_user.id)
        .order_by(ScanResult.created_at.desc())
        .all()
    )
    return [
        {
            "session_id": s.session_id,
            "created_at": s.created_at,
            "health_category": s.health_category,
            "health_risk_level": s.health_risk_level,
            "body_fat_percentage": s.body_fat_percentage,
            "bmi": s.bmi,
        }
        for s in scans
    ]


@router.get("/results/{session_id}")
def get_scan_results(
    session_id: str,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a stored scan result by session ID."""
    _validate_session_id(session_id)
    scan = db.query(ScanResult).filter(
        ScanResult.session_id == session_id,
        ScanResult.user_id == current_user.id,
    ).first()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan result not found")

    return {
        'session_id': scan.session_id,
        'measurements': scan.measurements,
        'body_composition': {
            'bmi': scan.bmi,
            'body_fat_percentage': scan.body_fat_percentage,
            'fat_mass_lbs': scan.fat_mass_kg,
            'lean_mass_lbs': scan.lean_mass_kg,
            'waist_to_hip_ratio': scan.waist_to_hip_ratio,
        },
        'health_assessment': {
            'category': scan.health_category,
            'risk_level': scan.health_risk_level,
            'recommendation': scan.health_recommendation,
        },
        'ai_insights': scan.ai_insights,
        'created_at': scan.created_at,
    }


@router.get("/images/{session_id}/{view}")
def get_processed_image(
    session_id: str,
    view: str,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Serve the preprocessed image for a given view (front, side, back)."""
    _validate_session_id(session_id)
    if view not in ('front', 'side', 'back'):
        raise HTTPException(status_code=400, detail="View must be front, side, or back")

    scan = db.query(ScanResult).filter(
        ScanResult.session_id == session_id,
        ScanResult.user_id == current_user.id,
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    for ext in ('.jpg', '.jpeg', '.png'):
        path = PROCESSED_DIR / f"{session_id}_{view}{ext}"
        if path.exists():
            return FileResponse(str(path), media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Image not found")


@router.get("/measurement-images/{session_id}/{view}")
def get_measurement_image(
    session_id: str,
    view: str,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Serve the annotated measurement visualization for a given view."""
    _validate_session_id(session_id)
    if view not in ('front', 'side', 'back'):
        raise HTTPException(status_code=400, detail="View must be front, side, or back")

    scan = db.query(ScanResult).filter(
        ScanResult.session_id == session_id,
        ScanResult.user_id == current_user.id,
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    path = MEASUREMENT_DIR / f"{session_id}_{view}_measurements.jpg"
    if path.exists():
        return FileResponse(str(path), media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Measurement image not found")


@router.post("/insights/{session_id}")
@limiter.limit("5/minute")
def regenerate_insights(
    request: Request,
    session_id: str,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Regenerate AI insights for an existing scan result."""
    _validate_session_id(session_id)
    scan = db.query(ScanResult).filter(
        ScanResult.session_id == session_id,
        ScanResult.user_id == current_user.id,
    ).first()

    if not scan:
        raise HTTPException(status_code=404, detail="Scan result not found")

    from services.llm import generate_scan_insights

    scan_data = {
        "body_composition": {
            "bmi": scan.bmi,
            "body_fat_percentage": scan.body_fat_percentage,
            "fat_mass_lbs": scan.fat_mass_kg,
            "lean_mass_lbs": scan.lean_mass_kg,
            "waist_to_hip_ratio": scan.waist_to_hip_ratio,
        },
        "health_assessment": {
            "category": scan.health_category,
            "risk_level": scan.health_risk_level,
            "recommendation": scan.health_recommendation,
        },
        "measurements": scan.measurements or {},
    }
    user_profile = {
        "age": current_user.age,
        "gender": getattr(current_user, "gender", "neutral") or "neutral",
        "height": current_user.height,
        "weight": current_user.weight,
        "fitness_goal": getattr(current_user, "fitness_goal", None),
    }

    ai_insights = generate_scan_insights(scan_data, user_profile)
    if ai_insights is None:
        raise HTTPException(status_code=503, detail="AI insights service unavailable")

    scan.ai_insights = ai_insights
    db.commit()

    return {"ai_insights": ai_insights}


