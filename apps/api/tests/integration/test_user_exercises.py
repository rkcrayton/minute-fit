import pytest


# ---------------------------------------------------------------------------
# GET /user-exercises/
# ---------------------------------------------------------------------------

def test_list_user_exercises_empty(client, auth_headers):
    r = client.get("/user-exercises/", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_list_user_exercises_unauthenticated(client):
    r = client.get("/user-exercises/")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /user-exercises/
# ---------------------------------------------------------------------------

def test_create_user_exercise_success(client, db, seeded_db, test_user, auth_headers):
    from models.exercise import Exercise

    exercise = db.query(Exercise).first()
    r = client.post("/user-exercises/", json={
        "exercise_id": exercise.id,
        "duration_seconds": 15,
    }, headers=auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["user_id"] == test_user.id
    assert data["exercise_id"] == exercise.id
    assert data["rep_count"] == 15
    assert "id" in data
    assert "created_at" in data


def test_create_user_exercise_unauthenticated(client, seeded_db, db, test_user):
    from models.exercise import Exercise

    exercise = db.query(Exercise).first()
    r = client.post("/user-exercises/", json={
        "exercise_id": exercise.id,
        "duration_seconds": 10,
    })
    assert r.status_code == 401


def test_create_user_exercise_exercise_not_found(client, db, test_user, auth_headers):
    r = client.post("/user-exercises/", json={
        "exercise_id": 99999,
        "duration_seconds": 10,
    }, headers=auth_headers)
    assert r.status_code == 404
    assert "Exercise" in r.json()["detail"]


def test_list_after_create(client, db, seeded_db, test_user, auth_headers):
    from models.exercise import Exercise

    exercise = db.query(Exercise).first()
    client.post("/user-exercises/", json={
        "exercise_id": exercise.id,
        "duration_seconds": 5,
    }, headers=auth_headers)
    r = client.get("/user-exercises/", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
