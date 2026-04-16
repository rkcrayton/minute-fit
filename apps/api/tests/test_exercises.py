import pytest


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
