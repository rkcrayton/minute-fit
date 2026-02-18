from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
from models.user_exercise import UserExercise
from models.user import User
from models.exercise import Exercise
from schemas.user_exercise import UserExerciseCreate, UserExerciseResponse
from database import get_db

router = APIRouter(prefix="/user-exercises", tags=["user-exercises"])


@router.get("/", response_model=List[UserExerciseResponse])
def get_user_exercises(db: Session = Depends(get_db)):
    return db.query(UserExercise).all()


@router.post("/", response_model=UserExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_user_exercise(payload: UserExerciseCreate, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    if not db.query(Exercise).filter(Exercise.id == payload.exercise_id).first():
        raise HTTPException(status_code=404, detail="Exercise not found")

    entry = UserExercise(
        user_id=payload.user_id,
        exercise_id=payload.exercise_id,
        rep_count=payload.rep_count,
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
