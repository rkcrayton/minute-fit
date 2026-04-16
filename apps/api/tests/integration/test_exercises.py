import pytest
from models.scan_result import ScanResult


# ---------------------------------------------------------------------------
# GET /exercises/
# ---------------------------------------------------------------------------

def test_list_exercises_returns_list(client):
    # The app lifespan seeds 8 exercises on startup
    r = client.get("/exercises/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_exercises_returns_seeded(client):
    r = client.get("/exercises/")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 8
    names = {e["name"] for e in data}
    assert "Push-Ups" in names
    assert "Squats" in names


# ---------------------------------------------------------------------------
# seed_exercises helper
# ---------------------------------------------------------------------------

def test_seed_exercises_idempotent(db):
    from routers.exercises import seed_exercises
    from models.exercise import Exercise

    seed_exercises(db)
    seed_exercises(db)  # second call should be a no-op
    count = db.query(Exercise).count()
    assert count == 8


# ---------------------------------------------------------------------------
# GET /exercises/plan
# ---------------------------------------------------------------------------

def test_workout_plan_unauthenticated(client, seeded_db):
    r = client.get("/exercises/plan")
    assert r.status_code == 401


def test_workout_plan_no_scan_raises_404(client, auth_headers, seeded_db):
    r = client.get("/exercises/plan", headers=auth_headers)
    assert r.status_code == 404
    assert "scan" in r.json()["detail"].lower()


def _insert_scan(db, user_id: int, body_fat: float):
    scan = ScanResult(
        session_id=f"sess-{user_id}-{int(body_fat)}",
        user_id=user_id,
        bmi=22.0,
        body_fat_percentage=body_fat,
        fat_mass_kg=20.0,
        lean_mass_kg=60.0,
        waist_to_hip_ratio=0.85,
        health_category="Fit",
        health_risk_level="low",
        health_recommendation="Good",
        measurements={},
    )
    db.add(scan)
    db.commit()


def test_workout_plan_lean_bf(client, complete_auth_headers, seeded_db, db, complete_user):
    _insert_scan(db, complete_user.id, body_fat=10.0)
    r = client.get("/exercises/plan", headers=complete_auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Lean Performance"
    assert len(data["schedule"]) == 7


def test_workout_plan_moderate_bf(client, complete_auth_headers, seeded_db, db, complete_user):
    _insert_scan(db, complete_user.id, body_fat=20.0)
    r = client.get("/exercises/plan", headers=complete_auth_headers)
    assert r.status_code == 200
    assert r.json()["title"] == "Body Recomposition"


def test_workout_plan_high_bf(client, complete_auth_headers, seeded_db, db, complete_user):
    _insert_scan(db, complete_user.id, body_fat=30.0)
    r = client.get("/exercises/plan", headers=complete_auth_headers)
    assert r.status_code == 200
    assert r.json()["title"] == "Fat Loss Kickstart"


def test_workout_plan_schedule_has_rest_days(client, complete_auth_headers, seeded_db, db, complete_user):
    _insert_scan(db, complete_user.id, body_fat=10.0)
    r = client.get("/exercises/plan", headers=complete_auth_headers)
    schedule = r.json()["schedule"]
    rest_days = [d for d in schedule if d["rest"]]
    assert len(rest_days) >= 1


# ---------------------------------------------------------------------------
# GET /exercises/today-summary
# ---------------------------------------------------------------------------

def test_today_summary_returns_day_and_exercises(client, complete_auth_headers, seeded_db, db, complete_user):
    _insert_scan(db, complete_user.id, body_fat=10.0)
    r = client.get("/exercises/today-summary", headers=complete_auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "day" in data
    assert "exercises" in data
    assert "workouts_done_today" in data
    assert "workouts_goal_today" in data
    assert data["workouts_done_today"] == 0


def test_today_summary_no_scan_raises_404(client, auth_headers, seeded_db):
    r = client.get("/exercises/today-summary", headers=auth_headers)
    assert r.status_code == 404
    assert "scan" in r.json()["detail"].lower()


def test_workout_plan_invalid_timezone(client, complete_auth_headers, seeded_db, db, complete_user):
    _insert_scan(db, complete_user.id, body_fat=10.0)
    r = client.get("/exercises/plan?tz=Not/A_Timezone", headers=complete_auth_headers)
    # Falls back to UTC silently — still returns a valid plan
    assert r.status_code == 200
    assert "schedule" in r.json()


def test_today_summary_invalid_timezone(client, complete_auth_headers, seeded_db, db, complete_user):
    _insert_scan(db, complete_user.id, body_fat=10.0)
    r = client.get("/exercises/today-summary?tz=Not/A_Timezone", headers=complete_auth_headers)
    assert r.status_code == 200
    assert "day" in r.json()


def test_workout_plan_counts_todays_completions(client, complete_auth_headers, seeded_db, db, complete_user):
    from models.exercise import Exercise
    from models.user_exercise import UserExercise
    from datetime import datetime, timezone

    _insert_scan(db, complete_user.id, body_fat=10.0)

    # Log an exercise today so the completions loop in /plan runs
    exercise = db.query(Exercise).first()
    db.add(UserExercise(
        user_id=complete_user.id,
        exercise_id=exercise.id,
        rep_count=10,
        created_at=datetime.now(timezone.utc),
    ))
    db.commit()

    r = client.get("/exercises/plan", headers=complete_auth_headers)
    assert r.status_code == 200
