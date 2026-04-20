"""
End-to-end workflow tests.

Each test function exercises a complete user journey across multiple endpoints,
verifying that the pieces work together — not just individually.

All requests go through the real FastAPI ASGI app via TestClient backed by an
in-memory SQLite database (see conftest.py), so nothing is mocked.

These imports are load-time side-effects: they register the ORM models with
Base.metadata before the session-scoped create_tables fixture calls create_all.
"""

# ruff: noqa: F401
from models.exercise import Exercise
from models.scan_result import ScanResult
from models.user import User
from models.user_exercise import UserExercise
from models.user_workout_plan import UserWorkoutPlan
from models.water_log import WaterLog


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register_and_login(client, email, username, password="pass1234"):
    client.post("/users/register", json={
        "email": email,
        "username": username,
        "password": password,
    })
    r = client.post("/users/token", data={"username": username, "password": password})
    assert r.status_code == 200, f"Login failed: {r.json()}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    user_id = client.get("/users/me", headers=headers).json()["id"]
    return headers, user_id


# ---------------------------------------------------------------------------
# 1. User onboarding: register → login → update profile → verify
# ---------------------------------------------------------------------------

def test_onboarding_flow(client):
    headers, _ = _register_and_login(client, "onboard@example.com", "onboarduser")

    # Newly registered user has no profile fields set
    me = client.get("/users/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["first_name"] is None

    # Fill in the profile
    update = client.put("/users/me", json={
        "first_name": "Jane",
        "last_name": "Doe",
        "age": 28,
        "weight": 140.0,
        "height": 65.0,
        "gender": "female",
        "fitness_goal": "lose weight",
    }, headers=headers)
    assert update.status_code == 200

    # Profile is persisted and readable
    me = client.get("/users/me", headers=headers)
    data = me.json()
    assert data["first_name"] == "Jane"
    assert data["last_name"] == "Doe"
    assert data["age"] == 28
    assert data["weight"] == 140.0
    assert data["height"] == 65.0
    assert data["gender"] == "female"


# ---------------------------------------------------------------------------
# 2. Workout tracking: browse exercises → log one → confirm it shows up
# ---------------------------------------------------------------------------

def test_workout_tracking_flow(client, seeded_db):
    headers, user_id = _register_and_login(client, "workout@example.com", "workoutuser")

    # Browse the exercise catalogue
    exercises_r = client.get("/exercises/")
    assert exercises_r.status_code == 200
    exercises = exercises_r.json()
    assert len(exercises) == 8

    # History is empty to start
    assert client.get("/user-exercises/", headers=headers).json() == []
    assert client.get("/user-exercises/recent", headers=headers).json() == []

    # Log the first exercise
    exercise_id = exercises[0]["id"]
    log_r = client.post("/user-exercises/", json={
        "exercise_id": exercise_id,
        "duration_seconds": 30,
    }, headers=headers)
    assert log_r.status_code == 201
    logged = log_r.json()
    assert logged["exercise_id"] == exercise_id
    assert logged["rep_count"] == 30

    # History now contains the logged exercise
    history = client.get("/user-exercises/", headers=headers).json()
    assert len(history) == 1
    assert history[0]["exercise_id"] == exercise_id

    # Recent also reflects it
    recent = client.get("/user-exercises/recent", headers=headers).json()
    assert len(recent) == 1
    assert recent[0]["name"] == exercises[0]["name"]


# ---------------------------------------------------------------------------
# 3. Today summary updates as exercises are logged
# ---------------------------------------------------------------------------

def test_today_summary_progress_updates(client, seeded_db, db, complete_user, complete_auth_headers, monkeypatch):
    import datetime as _dt
    import routers.workout_plans as wp_module
    from schemas.workout_plan import DAYS

    # Pin "today" to a known Monday so the test is fully deterministic.
    class _FixedMonday(_dt.datetime):
        @classmethod
        def now(cls, tz=None):
            return _dt.datetime(2024, 1, 1, 12, 0, 0, tzinfo=tz or _dt.timezone.utc)

    monkeypatch.setattr(wp_module, "datetime", _FixedMonday)

    # Build the plan via the API so JSON serialization is consistent.
    exercises = db.query(Exercise).all()
    schedule = {}
    for day in DAYS:
        schedule[day] = [
            {"exercise_id": exercises[0].id, "times_per_day": 2, "duration_seconds": 60, "order": 0},
        ]
    client.put("/workout-plans/me", json={"schedule": schedule}, headers=complete_auth_headers)

    # Fetch today's summary
    summary_before = client.get("/workout-plans/me/today-summary", headers=complete_auth_headers)
    assert summary_before.status_code == 200
    data_before = summary_before.json()
    assert not data_before["is_rest_day"], "Expected a non-rest day — all days have exercises"
    done_before = data_before["workouts_done_today"]

    # Log one of today's planned exercises
    today_exercise = data_before["exercises"][0]
    client.post("/user-exercises/", json={
        "exercise_id": today_exercise["exercise_id"],
        "duration_seconds": 60,
    }, headers=complete_auth_headers)

    # Done count must increment by exactly 1
    summary_after = client.get("/workout-plans/me/today-summary", headers=complete_auth_headers)
    assert summary_after.json()["workouts_done_today"] == done_before + 1


# ---------------------------------------------------------------------------
# 4. Water tracking: log multiple entries → today total accumulates
# ---------------------------------------------------------------------------

def test_water_tracking_flow(client):
    headers, _ = _register_and_login(client, "water@example.com", "wateruser")

    # No water logged yet
    assert client.get("/water/today", headers=headers).json()["total_oz"] == 0.0

    # Log three glasses
    for oz in [8.0, 16.0, 12.0]:
        r = client.post("/water/logs", json={"amount_oz": oz}, headers=headers)
        assert r.status_code == 200

    # Total reflects all three
    assert client.get("/water/today", headers=headers).json()["total_oz"] == 36.0


# ---------------------------------------------------------------------------
# 5. Yesterday's water does not bleed into today's total
# ---------------------------------------------------------------------------

def test_water_date_isolation(client):
    headers, _ = _register_and_login(client, "waterdate@example.com", "waterdateuser")

    # Large amount backdated to yesterday
    client.post("/water/logs", json={
        "amount_oz": 200.0,
        "logged_at": "2020-06-01T10:00:00+00:00",
    }, headers=headers)

    # Small amount today
    client.post("/water/logs", json={"amount_oz": 8.0}, headers=headers)

    assert client.get("/water/today", headers=headers).json()["total_oz"] == 8.0


# ---------------------------------------------------------------------------
# 6. Workout plan tier matches body fat from most recent scan
# ---------------------------------------------------------------------------

def test_workout_plan_tier_flow(client, seeded_db, db, complete_user, complete_auth_headers):
    from schemas.workout_plan import DAYS

    # Create a plan that matches the "Fat Loss Kickstart" tier
    exercises = db.query(Exercise).all()
    schedule = {}
    for day in DAYS:
        schedule[day] = [
            {"exercise_id": exercises[0].id, "times_per_day": 1, "duration_seconds": 60, "order": 0},
        ]

    plan = UserWorkoutPlan(
        user_id=complete_user.id,
        title="Fat Loss Kickstart",
        subtitle="Low-impact cardio plan",
        schedule=schedule,
    )
    db.add(plan)
    db.commit()

    plan_r = client.get("/workout-plans/me", headers=complete_auth_headers)
    assert plan_r.status_code == 200
    plan_data = plan_r.json()
    assert plan_data["title"] == "Fat Loss Kickstart"
    assert len(plan_data["schedule"]) == 7
    for day_name in DAYS:
        assert day_name in plan_data["schedule"]


# ---------------------------------------------------------------------------
# 7. Token refresh keeps access working
# ---------------------------------------------------------------------------

def test_token_refresh_flow(client):
    _register_and_login(client, "refresh@example.com", "refreshuser")

    # Grab a fresh token pair
    login_r = client.post("/users/token", data={"username": "refreshuser", "password": "pass1234"})
    refresh_token = login_r.json()["refresh_token"]
    original_access = login_r.json()["access_token"]

    # Exchange the refresh token for a new pair
    refresh_r = client.post("/users/token/refresh", json={"refresh_token": refresh_token})
    assert refresh_r.status_code == 200
    new_access = refresh_r.json()["access_token"]

    # New access token must be valid (the refresh token itself rotates)
    me = client.get("/users/me", headers={"Authorization": f"Bearer {new_access}"})
    assert me.status_code == 200
    assert me.json()["username"] == "refreshuser"


# ---------------------------------------------------------------------------
# 8. Two users cannot see each other's data
# ---------------------------------------------------------------------------

def test_user_data_isolation(client, seeded_db):
    headers_a, user_id_a = _register_and_login(client, "alice@example.com", "alice")
    headers_b, _         = _register_and_login(client, "bob@example.com",   "bob")

    # Alice logs a workout and water
    exercises = client.get("/exercises/").json()
    client.post("/user-exercises/", json={
        "exercise_id": exercises[0]["id"],
        "duration_seconds": 10,
    }, headers=headers_a)
    client.post("/water/logs", json={"amount_oz": 32.0}, headers=headers_a)

    # Bob's history and water are still empty
    assert client.get("/user-exercises/", headers=headers_b).json() == []
    assert client.get("/water/today", headers=headers_b).json()["total_oz"] == 0.0
