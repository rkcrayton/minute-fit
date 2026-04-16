"""
Per-user workout plan: storage, CRUD, today-summary, and Gemini generation.

One plan per user (enforced by unique user_id on user_workout_plans).
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import auth
from config import settings
from database import get_db
from models.exercise import Exercise
from models.user import User
from models.user_exercise import UserExercise
from models.user_workout_plan import UserWorkoutPlan
from models.scan_result import ScanResult
from schemas.workout_plan import (
    DAYS,
    DayUpdate,
    GeneratePlanRequest,
    WorkoutPlanResponse,
    WorkoutPlanUpdate,
)
from services import llm

router = APIRouter(prefix="/workout-plans", tags=["workout-plans"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _empty_schedule() -> Dict[str, list]:
    return {day: [] for day in DAYS}


def _normalize_schedule(raw: Optional[dict]) -> Dict[str, list]:
    """Ensure every day key exists (even if empty) and entries are lists."""
    out = _empty_schedule()
    if not raw:
        return out
    for day in DAYS:
        entries = raw.get(day) or []
        if isinstance(entries, list):
            out[day] = entries
    return out


def _enrich_schedule(
    schedule: Dict[str, list],
    db: Session,
) -> Dict[str, List[dict]]:
    """Join exercise metadata (name/muscle/difficulty/image) into each entry."""
    # Collect all referenced exercise IDs
    exercise_ids: set[int] = set()
    for day in DAYS:
        for entry in schedule.get(day, []) or []:
            ex_id = entry.get("exercise_id") if isinstance(entry, dict) else None
            if ex_id is not None:
                exercise_ids.add(ex_id)

    exercises_by_id: dict[int, Exercise] = {}
    if exercise_ids:
        rows = db.query(Exercise).filter(Exercise.id.in_(exercise_ids)).all()
        exercises_by_id = {e.id: e for e in rows}

    enriched: Dict[str, List[dict]] = {day: [] for day in DAYS}
    for day in DAYS:
        for entry in schedule.get(day, []) or []:
            if not isinstance(entry, dict):
                continue
            ex_id = entry.get("exercise_id")
            exercise = exercises_by_id.get(ex_id)
            if exercise is None:
                # Skip stale references; the edit screen will surface a warning
                continue
            enriched[day].append({
                "exercise_id": exercise.id,
                "times_per_day": int(entry.get("times_per_day", 1)),
                "duration_seconds": int(entry.get("duration_seconds", 60)),
                "order": int(entry.get("order", 0)),
                "name": exercise.name,
                "primary_muscle": exercise.primary_muscle,
                "difficulty": exercise.difficulty,
                "equipment": exercise.equipment,
                "image_url": exercise.image_url,
            })
        enriched[day].sort(key=lambda e: e["order"])
    return enriched


def _plan_to_response(plan: UserWorkoutPlan, db: Session) -> WorkoutPlanResponse:
    return WorkoutPlanResponse(
        id=plan.id,
        title=plan.title,
        subtitle=plan.subtitle,
        schedule=_enrich_schedule(_normalize_schedule(plan.schedule), db),
        generation_prefs=plan.generation_prefs,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


def _validate_exercise_ids(schedule: Dict[str, list], db: Session) -> None:
    referenced: set[int] = set()
    for day in DAYS:
        for entry in schedule.get(day, []) or []:
            ex_id = entry.get("exercise_id") if isinstance(entry, dict) else None
            if ex_id is not None:
                referenced.add(ex_id)
    if not referenced:
        return
    existing = {
        row.id
        for row in db.query(Exercise.id).filter(Exercise.id.in_(referenced)).all()
    }
    missing = referenced - existing
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown exercise_id(s): {sorted(missing)}",
        )


def _schedule_with_order(raw: Dict[str, List]) -> Dict[str, List[dict]]:
    """Normalize incoming entries to dicts and assign an order if missing."""
    out: Dict[str, List[dict]] = {}
    for day in DAYS:
        entries = raw.get(day) or []
        out[day] = []
        for i, entry in enumerate(entries):
            d = entry.model_dump() if hasattr(entry, "model_dump") else dict(entry)
            d["order"] = int(d.get("order") or i)
            out[day].append(d)
    return out


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("/me", response_model=WorkoutPlanResponse)
def get_my_plan(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(UserWorkoutPlan)
        .filter(UserWorkoutPlan.user_id == current_user.id)
        .one_or_none()
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="No workout plan yet.")
    return _plan_to_response(plan, db)


@router.put("/me", response_model=WorkoutPlanResponse)
def put_my_plan(
    payload: WorkoutPlanUpdate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    schedule = _schedule_with_order({d: payload.schedule.get(d, []) for d in DAYS})
    _validate_exercise_ids(schedule, db)

    plan = (
        db.query(UserWorkoutPlan)
        .filter(UserWorkoutPlan.user_id == current_user.id)
        .one_or_none()
    )
    if plan is None:
        plan = UserWorkoutPlan(
            user_id=current_user.id,
            title=payload.title or "My Workout Plan",
            subtitle=payload.subtitle,
            schedule=schedule,
        )
        db.add(plan)
    else:
        if payload.title is not None:
            plan.title = payload.title
        if payload.subtitle is not None:
            plan.subtitle = payload.subtitle
        plan.schedule = schedule

    db.commit()
    db.refresh(plan)
    return _plan_to_response(plan, db)


@router.patch("/me/day/{day}", response_model=WorkoutPlanResponse)
def patch_my_plan_day(
    day: str,
    payload: DayUpdate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    day = day.lower()
    if day not in DAYS:
        raise HTTPException(status_code=400, detail=f"Invalid day: {day}")

    plan = (
        db.query(UserWorkoutPlan)
        .filter(UserWorkoutPlan.user_id == current_user.id)
        .one_or_none()
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="No workout plan to patch.")

    new_day_entries = [
        {
            **entry.model_dump(),
            "order": entry.order or i,
        }
        for i, entry in enumerate(payload.entries)
    ]
    schedule = _normalize_schedule(plan.schedule)
    schedule[day] = new_day_entries
    _validate_exercise_ids({day: new_day_entries}, db)
    plan.schedule = schedule

    # SQLAlchemy JSON columns need an explicit attribute set for change tracking
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(plan, "schedule")

    db.commit()
    db.refresh(plan)
    return _plan_to_response(plan, db)


@router.delete("/me", status_code=204)
def delete_my_plan(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(UserWorkoutPlan)
        .filter(UserWorkoutPlan.user_id == current_user.id)
        .one_or_none()
    )
    if plan is not None:
        db.delete(plan)
        db.commit()
    return


# ---------------------------------------------------------------------------
# Today-summary — same shape as legacy /exercises/today-summary so the home
# screen keeps working after migration.
# ---------------------------------------------------------------------------

@router.get("/me/today-summary")
def today_summary(
    tz: Optional[str] = Query(None, description="Client IANA timezone, e.g. America/New_York"),
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(UserWorkoutPlan)
        .filter(UserWorkoutPlan.user_id == current_user.id)
        .one_or_none()
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="No workout plan yet.")

    try:
        user_tz = ZoneInfo(tz) if tz else timezone.utc
    except (KeyError, ValueError):
        user_tz = timezone.utc

    now_local = datetime.now(user_tz)
    today = now_local.strftime("%A").lower()

    schedule = _normalize_schedule(plan.schedule)
    raw_day_entries = schedule.get(today, [])

    # Count today's completions per exercise
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

    # Resolve exercise metadata
    ex_ids = [e.get("exercise_id") for e in raw_day_entries if isinstance(e, dict)]
    exercises_by_id: dict[int, Exercise] = {}
    if ex_ids:
        rows = db.query(Exercise).filter(Exercise.id.in_(ex_ids)).all()
        exercises_by_id = {e.id: e for e in rows}

    result_exercises: list[dict] = []
    workouts_done = 0
    workouts_goal = 0
    next_exercise: Optional[dict] = None

    # Preserve order
    sorted_entries = sorted(raw_day_entries, key=lambda e: e.get("order", 0))

    for entry in sorted_entries:
        ex_id = entry.get("exercise_id")
        exercise = exercises_by_id.get(ex_id)
        if exercise is None:
            continue
        times_per_day = int(entry.get("times_per_day", 1))
        duration_seconds = int(entry.get("duration_seconds", 60))
        done = done_by_exercise.get(exercise.id, 0)

        workouts_done += done
        workouts_goal += times_per_day

        ex_data = {
            "exercise_id": exercise.id,
            "name": exercise.name,
            "primary_muscle": exercise.primary_muscle,
            "difficulty": exercise.difficulty,
            "times_per_day": times_per_day,
            "done_today": done,
            "duration_seconds": duration_seconds,
        }
        result_exercises.append(ex_data)
        if next_exercise is None and done < times_per_day:
            next_exercise = ex_data

    return {
        "day": today,
        "is_rest_day": len(sorted_entries) == 0,
        "exercises": result_exercises,
        "next_exercise": next_exercise,
        "workouts_done_today": workouts_done,
        "workouts_goal_today": workouts_goal,
    }


# ---------------------------------------------------------------------------
# POST /workout-plans/generate — Gemini-generated personalized plan
# ---------------------------------------------------------------------------

@router.post("/generate", response_model=WorkoutPlanResponse)
def generate_plan(
    payload: GeneratePlanRequest,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Workout generation is unavailable (LLM not configured).",
        )

    # Narrow the exercise catalog by equipment filter if provided
    query = db.query(Exercise)
    if payload.equipment:
        normalized = [e.strip().lower() for e in payload.equipment if e]
        if normalized:
            query = query.filter(Exercise.equipment.in_(normalized))
    available = query.limit(400).all()

    if not available:
        raise HTTPException(
            status_code=400,
            detail="No exercises match the selected equipment. Try different filters or sync the library.",
        )

    available_lite = [
        {
            "id": ex.id,
            "name": ex.name,
            "primary_muscle": ex.primary_muscle,
            "equipment": ex.equipment or "bodyweight",
            "difficulty": ex.difficulty,
        }
        for ex in available
    ]

    # Latest scan body fat (optional context)
    latest_scan = (
        db.query(ScanResult)
        .filter(ScanResult.user_id == current_user.id)
        .order_by(ScanResult.created_at.desc())
        .first()
    )
    bf = latest_scan.body_fat_percentage if latest_scan else None

    user_profile = {
        "age": current_user.age,
        "gender": current_user.gender,
        "weight": current_user.weight,
        "height": current_user.height,
        "fitness_goal": payload.goal or current_user.fitness_goal,
        "body_fat_percentage": bf,
    }

    prefs = {
        "days_per_week": payload.days_per_week,
        "minutes_per_session": payload.minutes_per_session,
        "equipment": payload.equipment,
        "avoid": payload.avoid,
        "goal": payload.goal or current_user.fitness_goal,
    }

    generated = llm.generate_workout_plan(
        user_profile=user_profile,
        prefs=prefs,
        available_exercises=available_lite,
    )
    if generated is None:
        raise HTTPException(
            status_code=503,
            detail="LLM did not return a plan. Please try again in a moment.",
        )

    # ---- Validate: drop unknown exercise IDs; empty days ⇒ rest ----
    valid_ids = {row["id"] for row in available_lite}
    cleaned: Dict[str, List[dict]] = {d: [] for d in DAYS}
    raw_schedule = generated.get("schedule") or {}
    for day in DAYS:
        for i, entry in enumerate(raw_schedule.get(day, []) or []):
            if not isinstance(entry, dict):
                continue
            ex_id = entry.get("exercise_id")
            if ex_id not in valid_ids:
                continue
            cleaned[day].append({
                "exercise_id": int(ex_id),
                "times_per_day": max(1, min(12, int(entry.get("times_per_day", 1)))),
                "duration_seconds": max(5, min(3600, int(entry.get("duration_seconds", 60)))),
                "order": int(entry.get("order", i)),
            })
        cleaned[day].sort(key=lambda e: e["order"])

    title = (generated.get("title") or "My Workout Plan").strip()[:80]
    subtitle = (generated.get("subtitle") or "").strip()[:160] or None

    # Upsert (one plan per user)
    plan = (
        db.query(UserWorkoutPlan)
        .filter(UserWorkoutPlan.user_id == current_user.id)
        .one_or_none()
    )
    if plan is None:
        plan = UserWorkoutPlan(
            user_id=current_user.id,
            title=title,
            subtitle=subtitle,
            schedule=cleaned,
            generation_prefs=prefs,
        )
        db.add(plan)
    else:
        plan.title = title
        plan.subtitle = subtitle
        plan.schedule = cleaned
        plan.generation_prefs = prefs
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(plan, "schedule")
        flag_modified(plan, "generation_prefs")

    db.commit()
    db.refresh(plan)
    return _plan_to_response(plan, db)
