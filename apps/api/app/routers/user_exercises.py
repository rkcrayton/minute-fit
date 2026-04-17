from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from models.user_exercise import UserExercise
from models.user import User
from models.exercise import Exercise
from schemas.user_exercise import UserExerciseCreate, UserExerciseResponse
from database import get_db
import auth

router = APIRouter(prefix="/user-exercises", tags=["user-exercises"])


@router.get("/", response_model=List[UserExerciseResponse])
def get_user_exercises(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    return db.query(UserExercise).filter(UserExercise.user_id == current_user.id).all()


@router.get("/recent")
def get_recent_workouts(
    limit: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user),
):
    rows = (
        db.query(UserExercise, Exercise)
        .join(Exercise, UserExercise.exercise_id == Exercise.id)
        .filter(UserExercise.user_id == current_user.id)
        .order_by(UserExercise.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "name": exercise.name,
            "primary_muscle": exercise.primary_muscle,
            "duration_seconds": ue.rep_count,
            "created_at": ue.created_at.isoformat(),
        }
        for ue, exercise in rows
    ]


@router.post("/", response_model=UserExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_user_exercise(
    payload: UserExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user),
):
    if not db.query(Exercise).filter(Exercise.id == payload.exercise_id).first():
        raise HTTPException(status_code=404, detail="Exercise not found")

    entry = UserExercise(
        user_id=current_user.id,
        exercise_id=payload.exercise_id,
        rep_count=payload.duration_seconds,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
