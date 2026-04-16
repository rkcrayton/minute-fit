from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from models.exercise import Exercise
from schemas.exercise import ExerciseResponse
from database import get_db
from config import settings
from services import wger_sync

router = APIRouter(prefix="/exercises", tags=["exercises"])

# Minimal starter library — used only when the DB has no exercises yet.
# Acts as a backstop before Wger sync is run. Full catalogue should come from
# POST /admin/sync-exercises.
SEED_EXERCISES = [
    {
        "name": "Push-Ups",
        "primary_muscle": "Chest",
        "secondary_muscle": "Triceps",
        "tertiary_muscle": "Shoulders",
        "difficulty": "easy",
        "equipment": "bodyweight",
        "category": "strength",
    },
    {
        "name": "Sit-Ups",
        "primary_muscle": "Abs",
        "secondary_muscle": "Hip Flexors",
        "tertiary_muscle": None,
        "difficulty": "easy",
        "equipment": "bodyweight",
        "category": "core",
    },
    {
        "name": "Plank",
        "primary_muscle": "Core",
        "secondary_muscle": "Shoulders",
        "tertiary_muscle": "Glutes",
        "difficulty": "easy",
        "equipment": "bodyweight",
        "category": "core",
    },
    {
        "name": "Squats",
        "primary_muscle": "Quads",
        "secondary_muscle": "Glutes",
        "tertiary_muscle": "Hamstrings",
        "difficulty": "easy",
        "equipment": "bodyweight",
        "category": "strength",
    },
    {
        "name": "Jumping Jacks",
        "primary_muscle": "Calves",
        "secondary_muscle": "Shoulders",
        "tertiary_muscle": "Hip Abductors",
        "difficulty": "easy",
        "equipment": "bodyweight",
        "category": "cardio",
    },
    {
        "name": "Lunges",
        "primary_muscle": "Quads",
        "secondary_muscle": "Glutes",
        "tertiary_muscle": "Hamstrings",
        "difficulty": "medium",
        "equipment": "bodyweight",
        "category": "strength",
    },
    {
        "name": "Good Mornings",
        "primary_muscle": "Hamstrings",
        "secondary_muscle": "Lower Back",
        "tertiary_muscle": "Glutes",
        "difficulty": "medium",
        "equipment": "bodyweight",
        "category": "strength",
    },
    {
        "name": "Calf Raises",
        "primary_muscle": "Calves",
        "secondary_muscle": "Soleus",
        "tertiary_muscle": None,
        "difficulty": "easy",
        "equipment": "bodyweight",
        "category": "strength",
    },
]


def seed_exercises(db: Session):
    if db.query(Exercise).count() == 0:
        for data in SEED_EXERCISES:
            db.add(Exercise(**data))
        db.commit()


@router.get("/", response_model=List[ExerciseResponse])
def get_exercises(db: Session = Depends(get_db)):
    return db.query(Exercise).all()


# ---------------------------------------------------------------------------
# GET /exercises/library — paginated search across the expanded library
# ---------------------------------------------------------------------------

@router.get("/library", response_model=List[ExerciseResponse])
def search_exercise_library(
    q: Optional[str] = Query(None, description="Name substring (case-insensitive)"),
    muscle: Optional[str] = Query(None, description="Primary muscle filter (case-insensitive)"),
    equipment: Optional[str] = Query(None, description="Equipment filter, e.g. bodyweight"),
    category: Optional[str] = Query(None, description="Category, e.g. strength, cardio"),
    difficulty: Optional[str] = Query(None, description="easy | medium | hard"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Exercise)
    if q:
        query = query.filter(Exercise.name.ilike(f"%{q}%"))
    if muscle:
        query = query.filter(Exercise.primary_muscle.ilike(f"%{muscle}%"))
    if equipment:
        query = query.filter(Exercise.equipment == equipment.lower())
    if category:
        query = query.filter(Exercise.category == category.lower())
    if difficulty:
        query = query.filter(Exercise.difficulty == difficulty.lower())
    return query.order_by(Exercise.name.asc()).offset(offset).limit(limit).all()


# ---------------------------------------------------------------------------
# Admin: POST /admin/sync-exercises — imports the full Wger catalog
# Usage:
#   curl -X POST <url>/admin/sync-exercises -H "X-Admin-Token: <token>"
# ---------------------------------------------------------------------------

admin_router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(x_admin_token: Optional[str]) -> None:
    if not settings.ADMIN_API_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_API_TOKEN is not configured on the server.",
        )
    if x_admin_token != settings.ADMIN_API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token.")


@admin_router.post("/sync-exercises")
def admin_sync_exercises(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
    db: Session = Depends(get_db),
):
    _require_admin(x_admin_token)
    return wger_sync.sync_exercises(db)
