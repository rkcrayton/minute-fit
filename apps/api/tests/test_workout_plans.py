"""Tests for the per-user workout plan API."""


# ---------------------------------------------------------------------------
# GET /workout-plans/me — 404 when nothing exists, 200 after PUT
# ---------------------------------------------------------------------------

def test_get_plan_not_found(client, complete_auth_headers, seeded_db):
    r = client.get("/workout-plans/me", headers=complete_auth_headers)
    assert r.status_code == 404


def test_put_and_get_plan(client, complete_auth_headers, seeded_db, db):
    from models.exercise import Exercise

    ex = db.query(Exercise).first()
    payload = {
        "title": "Custom Plan",
        "subtitle": "Trial run",
        "schedule": {
            "monday": [
                {"exercise_id": ex.id, "times_per_day": 3, "duration_seconds": 60, "order": 0}
            ],
            "tuesday": [],
            "wednesday": [],
            "thursday": [],
            "friday": [],
            "saturday": [],
            "sunday": [],
        },
    }
    r = client.put("/workout-plans/me", json=payload, headers=complete_auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Custom Plan"
    assert len(data["schedule"]["monday"]) == 1
    assert data["schedule"]["monday"][0]["name"] == ex.name

    r2 = client.get("/workout-plans/me", headers=complete_auth_headers)
    assert r2.status_code == 200
    assert r2.json()["title"] == "Custom Plan"


def test_put_rejects_unknown_exercise_id(client, complete_auth_headers, seeded_db):
    payload = {
        "schedule": {
            "monday": [
                {"exercise_id": 999999, "times_per_day": 3, "duration_seconds": 60, "order": 0}
            ],
            "tuesday": [], "wednesday": [], "thursday": [],
            "friday": [], "saturday": [], "sunday": [],
        }
    }
    r = client.put("/workout-plans/me", json=payload, headers=complete_auth_headers)
    assert r.status_code == 400


def test_patch_day_only_touches_that_day(client, complete_auth_headers, seeded_db, db):
    from models.exercise import Exercise
    exs = db.query(Exercise).all()
    ex_a, ex_b = exs[0], exs[1]

    # seed a full-week plan
    client.put("/workout-plans/me", json={
        "schedule": {
            "monday": [{"exercise_id": ex_a.id, "times_per_day": 2, "duration_seconds": 60, "order": 0}],
            "tuesday": [{"exercise_id": ex_a.id, "times_per_day": 2, "duration_seconds": 60, "order": 0}],
            "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": [],
        }
    }, headers=complete_auth_headers)

    r = client.patch(
        "/workout-plans/me/day/monday",
        json={"entries": [{"exercise_id": ex_b.id, "times_per_day": 4, "duration_seconds": 30, "order": 0}]},
        headers=complete_auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["schedule"]["monday"][0]["name"] == ex_b.name
    assert data["schedule"]["tuesday"][0]["name"] == ex_a.name  # untouched


def test_delete_plan(client, complete_auth_headers, seeded_db, db):
    from models.exercise import Exercise
    ex = db.query(Exercise).first()
    client.put("/workout-plans/me", json={
        "schedule": {
            "monday": [{"exercise_id": ex.id, "times_per_day": 1, "duration_seconds": 60, "order": 0}],
            "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": [],
        }
    }, headers=complete_auth_headers)

    r = client.delete("/workout-plans/me", headers=complete_auth_headers)
    assert r.status_code == 204
    r2 = client.get("/workout-plans/me", headers=complete_auth_headers)
    assert r2.status_code == 404


def test_today_summary_requires_plan(client, complete_auth_headers, seeded_db):
    r = client.get("/workout-plans/me/today-summary", headers=complete_auth_headers)
    assert r.status_code == 404


def test_today_summary_after_plan(client, complete_auth_headers, seeded_db, db):
    from models.exercise import Exercise
    ex = db.query(Exercise).first()
    schedule = {d: [] for d in [
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    ]}
    # Fill today with one exercise so we can see a non-empty summary. Because
    # today is unknown inside the test harness, just put the entry on every day.
    for d in schedule:
        schedule[d] = [
            {"exercise_id": ex.id, "times_per_day": 2, "duration_seconds": 60, "order": 0}
        ]
    client.put("/workout-plans/me", json={"schedule": schedule}, headers=complete_auth_headers)

    r = client.get("/workout-plans/me/today-summary", headers=complete_auth_headers)
    assert r.status_code == 200
    data = r.json()
    for key in ("day", "is_rest_day", "exercises", "next_exercise", "workouts_done_today", "workouts_goal_today"):
        assert key in data
    assert data["workouts_goal_today"] == 2


# ---------------------------------------------------------------------------
# POST /workout-plans/generate — graceful 503 when no GEMINI_API_KEY
# ---------------------------------------------------------------------------

def test_generate_503_without_gemini_key(client, complete_auth_headers, seeded_db, monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    r = client.post(
        "/workout-plans/generate",
        json={
            "days_per_week": 3,
            "minutes_per_session": 30,
            "equipment": [],
            "avoid": None,
        },
        headers=complete_auth_headers,
    )
    assert r.status_code == 503
