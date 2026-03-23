from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.water_log import WaterLog
from models.user import User
from schemas.water_log import WaterLogCreate, WaterLogRead, WaterTodaySummary
from auth import get_current_user

router = APIRouter(prefix="/water", tags=["water"])


@router.post("/logs", response_model=WaterLogRead)
def create_water_log(
    payload: WaterLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logged_at = payload.logged_at or datetime.now(timezone.utc)

    water_log = WaterLog(
        user_id=current_user.id,
        amount_oz=payload.amount_oz,
        logged_at=logged_at,
    )

    db.add(water_log)
    db.commit()
    db.refresh(water_log)
    return water_log


@router.get("/today", response_model=WaterTodaySummary)
def get_today_water_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_oz = (
        db.query(func.coalesce(func.sum(WaterLog.amount_oz), 0.0))
        .filter(WaterLog.user_id == current_user.id)
        .filter(WaterLog.logged_at >= start_of_day)
        .filter(WaterLog.logged_at <= now)
        .scalar()
    )

    goal_oz = round(current_user.weight / 2) if current_user.weight and current_user.weight > 0 else 64

    return WaterTodaySummary(
        total_oz=float(total_oz),
        goal_oz=float(goal_oz),
    )