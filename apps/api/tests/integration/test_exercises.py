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
# GET /exercises/library — filterable search across the expanded catalog
# ---------------------------------------------------------------------------

def test_library_search_returns_list(client, seeded_db):
    r = client.get("/exercises/library?limit=5")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_library_search_by_name(client, seeded_db):
    r = client.get("/exercises/library", params={"q": "push"})
    assert r.status_code == 200
    names = {e["name"] for e in r.json()}
    assert "Push-Ups" in names


def test_library_search_by_equipment(client, seeded_db):
    r = client.get("/exercises/library", params={"equipment": "bodyweight"})
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_library_search_no_match(client, seeded_db):
    r = client.get("/exercises/library", params={"q": "nothing-matches-this-xyz"})
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# POST /admin/sync-exercises — protected by X-Admin-Token
# ---------------------------------------------------------------------------

def test_admin_sync_requires_token(client, monkeypatch):
    # With no token configured the endpoint should 503
    from config import settings
    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", "")
    r = client.post("/admin/sync-exercises")
    assert r.status_code == 503


def test_admin_sync_rejects_bad_token(client, monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "ADMIN_API_TOKEN", "right-token")
    r = client.post("/admin/sync-exercises", headers={"X-Admin-Token": "wrong"})
    assert r.status_code == 401


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
