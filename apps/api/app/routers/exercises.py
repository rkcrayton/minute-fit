from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models.exercise import Exercise
from models.scan_result import ScanResult
from schemas.exercise import ExerciseResponse
from database import get_db
import auth
from models.user import User

router = APIRouter(prefix="/exercises", tags=["exercises"])

SEED_EXERCISES = [
    {
        "name": "Push-Ups",
        "primary_muscle": "Chest",
        "secondary_muscle": "Triceps",
        "tertiary_muscle": "Shoulders",
        "difficulty": "easy",
    },
    {
        "name": "Sit-Ups",
        "primary_muscle": "Abs",
        "secondary_muscle": "Hip Flexors",
        "tertiary_muscle": None,
        "difficulty": "easy",
    },
    {
        "name": "Plank",
        "primary_muscle": "Core",
        "secondary_muscle": "Shoulders",
        "tertiary_muscle": "Glutes",
        "difficulty": "easy",
    },
    {
        "name": "Squats",
        "primary_muscle": "Quads",
        "secondary_muscle": "Glutes",
        "tertiary_muscle": "Hamstrings",
        "difficulty": "easy",
    },
    {
        "name": "Jumping Jacks",
        "primary_muscle": "Calves",
        "secondary_muscle": "Shoulders",
        "tertiary_muscle": "Hip Abductors",
        "difficulty": "easy",
    },
    {
        "name": "Lunges",
        "primary_muscle": "Quads",
        "secondary_muscle": "Glutes",
        "tertiary_muscle": "Hamstrings",
        "difficulty": "medium",
    },
    {
        "name": "Good Mornings",
        "primary_muscle": "Hamstrings",
        "secondary_muscle": "Lower Back",
        "tertiary_muscle": "Glutes",
        "difficulty": "medium",
    },
    {
        "name": "Calf Raises",
        "primary_muscle": "Calves",
        "secondary_muscle": "Soleus",
        "tertiary_muscle": None,
        "difficulty": "easy",
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


# --- Workout plan templates keyed by body-fat tier ---
# Each day is a list of { exercise name, sets, reps }
# "Rest" days have an empty list.

_LEAN_PLAN = {
    "title": "Lean Performance",
    "subtitle": "Strength & hypertrophy focus",
    "monday":    [{"name": "Push-Ups", "sets": 4, "reps": 20}, {"name": "Squats", "sets": 4, "reps": 15}, {"name": "Plank", "sets": 3, "reps": 60}],
    "tuesday":   [{"name": "Lunges", "sets": 4, "reps": 12}, {"name": "Good Mornings", "sets": 3, "reps": 15}, {"name": "Calf Raises", "sets": 4, "reps": 20}],
    "wednesday": [],
    "thursday":  [{"name": "Push-Ups", "sets": 5, "reps": 25}, {"name": "Sit-Ups", "sets": 4, "reps": 20}, {"name": "Squats", "sets": 4, "reps": 20}],
    "friday":    [{"name": "Lunges", "sets": 4, "reps": 15}, {"name": "Good Mornings", "sets": 4, "reps": 12}, {"name": "Plank", "sets": 3, "reps": 60}],
    "saturday":  [{"name": "Jumping Jacks", "sets": 3, "reps": 50}, {"name": "Calf Raises", "sets": 4, "reps": 25}, {"name": "Sit-Ups", "sets": 3, "reps": 25}],
    "sunday":    [],
}

_MODERATE_PLAN = {
    "title": "Body Recomposition",
    "subtitle": "Burn fat & build muscle",
    "monday":    [{"name": "Jumping Jacks", "sets": 3, "reps": 40}, {"name": "Push-Ups", "sets": 3, "reps": 15}, {"name": "Squats", "sets": 3, "reps": 15}],
    "tuesday":   [{"name": "Lunges", "sets": 3, "reps": 12}, {"name": "Plank", "sets": 3, "reps": 45}, {"name": "Calf Raises", "sets": 3, "reps": 20}],
    "wednesday": [],
    "thursday":  [{"name": "Jumping Jacks", "sets": 3, "reps": 40}, {"name": "Sit-Ups", "sets": 3, "reps": 15}, {"name": "Push-Ups", "sets": 3, "reps": 15}],
    "friday":    [{"name": "Squats", "sets": 3, "reps": 15}, {"name": "Good Mornings", "sets": 3, "reps": 12}, {"name": "Plank", "sets": 3, "reps": 45}],
    "saturday":  [],
    "sunday":    [],
}

_HIGH_BF_PLAN = {
    "title": "Fat Loss Kickstart",
    "subtitle": "Cardio & full-body conditioning",
    "monday":    [{"name": "Jumping Jacks", "sets": 4, "reps": 50}, {"name": "Squats", "sets": 3, "reps": 12}, {"name": "Plank", "sets": 2, "reps": 30}],
    "tuesday":   [],
    "wednesday": [{"name": "Jumping Jacks", "sets": 4, "reps": 50}, {"name": "Push-Ups", "sets": 3, "reps": 10}, {"name": "Sit-Ups", "sets": 3, "reps": 12}],
    "thursday":  [],
    "friday":    [{"name": "Jumping Jacks", "sets": 4, "reps": 50}, {"name": "Lunges", "sets": 3, "reps": 10}, {"name": "Calf Raises", "sets": 3, "reps": 15}],
    "saturday":  [],
    "sunday":    [],
}

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


@router.get("/plan")
def get_workout_plan(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a Mon-Sun workout plan based on the user's latest body fat scan."""
    latest_scan = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == current_user.id)
        .order_by(ScanResult.created_at.desc())
        .first()
    )

    if not latest_scan or latest_scan.body_fat_percentage is None:
        raise HTTPException(status_code=404, detail="No scan results found. Complete a body scan first.")

    bf = latest_scan.body_fat_percentage

    if bf < 15:
        template = _LEAN_PLAN
    elif bf <= 25:
        template = _MODERATE_PLAN
    else:
        template = _HIGH_BF_PLAN

    # Build response with exercise IDs resolved from DB
    exercises_by_name = {e.name: e for e in db.query(Exercise).all()}

    schedule = []
    for day in DAYS:
        day_exercises = []
        for entry in template[day]:
            exercise = exercises_by_name.get(entry["name"])
            if exercise:
                day_exercises.append({
                    "exercise_id": exercise.id,
                    "name": exercise.name,
                    "primary_muscle": exercise.primary_muscle,
                    "sets": entry["sets"],
                    "reps": entry["reps"],
                })
        schedule.append({
            "day": day,
            "rest": len(day_exercises) == 0,
            "exercises": day_exercises,
        })

    return {
        "title": template["title"],
        "subtitle": template["subtitle"],
        "body_fat_percentage": bf,
        "schedule": schedule,
    }
