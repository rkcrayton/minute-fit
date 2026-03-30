from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from models.exercise import Exercise
from models.scan_result import ScanResult
from models.user_exercise import UserExercise
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
# Each day is a list of { exercise name, times_per_day, duration_seconds }
# "Rest" days have an empty list.
# times_per_day = how many 1-minute sessions to do that exercise throughout the day

_LEAN_PLAN = {
    "title": "Lean Performance",
    "subtitle": "Strength & hypertrophy focus",
    "monday":    [{"name": "Push-Ups", "times_per_day": 4, "duration_seconds": 60}, {"name": "Squats", "times_per_day": 4, "duration_seconds": 60}, {"name": "Plank", "times_per_day": 3, "duration_seconds": 60}],
    "tuesday":   [{"name": "Lunges", "times_per_day": 4, "duration_seconds": 60}, {"name": "Good Mornings", "times_per_day": 3, "duration_seconds": 60}, {"name": "Calf Raises", "times_per_day": 4, "duration_seconds": 60}],
    "wednesday": [],
    "thursday":  [{"name": "Push-Ups", "times_per_day": 5, "duration_seconds": 60}, {"name": "Sit-Ups", "times_per_day": 4, "duration_seconds": 60}, {"name": "Squats", "times_per_day": 4, "duration_seconds": 60}],
    "friday":    [{"name": "Lunges", "times_per_day": 4, "duration_seconds": 60}, {"name": "Good Mornings", "times_per_day": 4, "duration_seconds": 60}, {"name": "Plank", "times_per_day": 3, "duration_seconds": 60}],
    "saturday":  [{"name": "Jumping Jacks", "times_per_day": 3, "duration_seconds": 60}, {"name": "Calf Raises", "times_per_day": 4, "duration_seconds": 60}, {"name": "Sit-Ups", "times_per_day": 3, "duration_seconds": 60}],
    "sunday":    [],
}

_MODERATE_PLAN = {
    "title": "Body Recomposition",
    "subtitle": "Burn fat & build muscle",
    "monday":    [{"name": "Jumping Jacks", "times_per_day": 3, "duration_seconds": 60}, {"name": "Push-Ups", "times_per_day": 3, "duration_seconds": 60}, {"name": "Squats", "times_per_day": 3, "duration_seconds": 60}],
    "tuesday":   [{"name": "Lunges", "times_per_day": 3, "duration_seconds": 60}, {"name": "Plank", "times_per_day": 3, "duration_seconds": 60}, {"name": "Calf Raises", "times_per_day": 3, "duration_seconds": 60}],
    "wednesday": [],
    "thursday":  [{"name": "Jumping Jacks", "times_per_day": 3, "duration_seconds": 60}, {"name": "Sit-Ups", "times_per_day": 3, "duration_seconds": 60}, {"name": "Push-Ups", "times_per_day": 3, "duration_seconds": 60}],
    "friday":    [{"name": "Squats", "times_per_day": 3, "duration_seconds": 60}, {"name": "Good Mornings", "times_per_day": 3, "duration_seconds": 60}, {"name": "Plank", "times_per_day": 3, "duration_seconds": 60}],
    "saturday":  [],
    "sunday":    [{"name": "Squats", "times_per_day": 3, "duration_seconds": 10}, {"name": "Good Mornings", "times_per_day": 3, "duration_seconds": 5}],
}

_HIGH_BF_PLAN = {
    "title": "Fat Loss Kickstart",
    "subtitle": "Cardio & full-body conditioning",
    "monday":    [{"name": "Jumping Jacks", "times_per_day": 4, "duration_seconds": 60}, {"name": "Squats", "times_per_day": 3, "duration_seconds": 60}, {"name": "Plank", "times_per_day": 2, "duration_seconds": 60}],
    "tuesday":   [],
    "wednesday": [{"name": "Jumping Jacks", "times_per_day": 4, "duration_seconds": 60}, {"name": "Push-Ups", "times_per_day": 3, "duration_seconds": 60}, {"name": "Sit-Ups", "times_per_day": 3, "duration_seconds": 60}],
    "thursday":  [],
    "friday":    [{"name": "Jumping Jacks", "times_per_day": 4, "duration_seconds": 60}, {"name": "Lunges", "times_per_day": 3, "duration_seconds": 60}, {"name": "Calf Raises", "times_per_day": 3, "duration_seconds": 60}],
    "saturday":  [],
    "sunday":    [],
}

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def _get_template_for_user(current_user: User, db: Session):
    latest_scan = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == current_user.id)
        .order_by(ScanResult.created_at.desc())
        .first()
    )
    if not latest_scan or latest_scan.body_fat_percentage is None:
        return None, None
    bf = latest_scan.body_fat_percentage
    if bf < 15:
        return _LEAN_PLAN, bf
    elif bf <= 25:
        return _MODERATE_PLAN, bf
    else:
        return _HIGH_BF_PLAN, bf


@router.get("/plan")
def get_workout_plan(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    tz: Optional[str] = Query(None, description="Client IANA timezone, e.g. America/New_York"),
):
    """Generate a Mon-Sun workout plan based on the user's latest body fat scan."""
    template, bf = _get_template_for_user(current_user, db)
    if template is None:
        raise HTTPException(status_code=404, detail="No scan results found. Complete a body scan first.")

    # Determine today in the user's timezone
    try:
        user_tz = ZoneInfo(tz) if tz else timezone.utc
    except (KeyError, ValueError):
        user_tz = timezone.utc
    now_local = datetime.now(user_tz)
    today = now_local.strftime("%A").lower()

    # Count today's completions per exercise
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    completions = (
        db.query(UserExercise)
        .filter(UserExercise.user_id == current_user.id, UserExercise.created_at >= today_start)
        .all()
    )
    done_by_exercise: dict[int, int] = {}
    for c in completions:
        done_by_exercise[c.exercise_id] = done_by_exercise.get(c.exercise_id, 0) + 1

    exercises_by_name = {e.name: e for e in db.query(Exercise).all()}

    schedule = []
    for day in DAYS:
        is_today = day == today
        day_exercises = []
        for entry in template[day]:
            exercise = exercises_by_name.get(entry["name"])
            if exercise:
                ex_data = {
                    "exercise_id": exercise.id,
                    "name": exercise.name,
                    "primary_muscle": exercise.primary_muscle,
                    "difficulty": exercise.difficulty,
                    "times_per_day": entry["times_per_day"],
                    "duration_seconds": entry["duration_seconds"],
                    "done_today": done_by_exercise.get(exercise.id, 0) if is_today else 0,
                }
                day_exercises.append(ex_data)
        schedule.append({
            "day": day,
            "rest": len(day_exercises) == 0,
            "exercises": day_exercises,
        })

    return {
        "title": template["title"],
        "subtitle": template["subtitle"],
        "body_fat_percentage": bf,
        "today": today,
        "schedule": schedule,
    }


@router.get("/today-summary")
def get_today_summary(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    tz: Optional[str] = Query(None, description="Client IANA timezone, e.g. America/New_York"),
):
    """Return today's exercises, completion counts, next exercise to do, and daily progress."""
    template, bf = _get_template_for_user(current_user, db)
    if template is None:
        raise HTTPException(status_code=404, detail="No scan results found. Complete a body scan first.")

    # Use the client's timezone to determine the correct local day
    try:
        user_tz = ZoneInfo(tz) if tz else timezone.utc
    except (KeyError, ValueError):
        user_tz = timezone.utc

    now_local = datetime.now(user_tz)
    today = now_local.strftime("%A").lower()  # e.g. "sunday"
    day_entries = template.get(today, [])

    # Count completions since midnight in the user's timezone
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    completions = (
        db.query(UserExercise)
        .filter(
            UserExercise.user_id == current_user.id,
            UserExercise.created_at >= today_start,
        )
        .all()
    )
    done_by_exercise: dict[int, int] = {}
    for c in completions:
        done_by_exercise[c.exercise_id] = done_by_exercise.get(c.exercise_id, 0) + 1

    exercises_by_name = {e.name: e for e in db.query(Exercise).all()}

    result_exercises = []
    workouts_done = 0
    workouts_goal = 0
    next_exercise = None

    for entry in day_entries:
        exercise = exercises_by_name.get(entry["name"])
        if not exercise:
            continue
        done = done_by_exercise.get(exercise.id, 0)
        times_per_day = entry["times_per_day"]
        workouts_done += done
        workouts_goal += times_per_day

        ex_data = {
            "exercise_id": exercise.id,
            "name": exercise.name,
            "primary_muscle": exercise.primary_muscle,
            "difficulty": exercise.difficulty,
            "times_per_day": times_per_day,
            "done_today": done,
            "duration_seconds": entry["duration_seconds"],
        }
        result_exercises.append(ex_data)
        if next_exercise is None and done < times_per_day:
            next_exercise = ex_data

    return {
        "day": today,
        "is_rest_day": len(day_entries) == 0,
        "exercises": result_exercises,
        "next_exercise": next_exercise,
        "workouts_done_today": workouts_done,
        "workouts_goal_today": workouts_goal,
    }
