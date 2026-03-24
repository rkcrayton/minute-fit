import pytest


# ---------------------------------------------------------------------------
# GET /user-exercises/
# ---------------------------------------------------------------------------

def test_list_user_exercises_empty(client):
    r = client.get("/user-exercises/")
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# POST /user-exercises/
# ---------------------------------------------------------------------------

def test_create_user_exercise_success(client, db, seeded_db, test_user):
    from models.exercise import Exercise

    exercise = db.query(Exercise).first()
    r = client.post("/user-exercises/", json={
        "user_id": test_user.id,
        "exercise_id": exercise.id,
        "rep_count": 15,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["user_id"] == test_user.id
    assert data["exercise_id"] == exercise.id
    assert data["rep_count"] == 15
    assert "id" in data
    assert "created_at" in data


def test_create_user_exercise_user_not_found(client, seeded_db, db):
    from models.exercise import Exercise

    exercise = db.query(Exercise).first()
    r = client.post("/user-exercises/", json={
        "user_id": 99999,
        "exercise_id": exercise.id,
        "rep_count": 10,
    })
    assert r.status_code == 404
    assert "User" in r.json()["detail"]


def test_create_user_exercise_exercise_not_found(client, db, test_user):
    r = client.post("/user-exercises/", json={
        "user_id": test_user.id,
        "exercise_id": 99999,
        "rep_count": 10,
    })
    assert r.status_code == 404
    assert "Exercise" in r.json()["detail"]


def test_list_after_create(client, db, seeded_db, test_user):
    from models.exercise import Exercise

    exercise = db.query(Exercise).first()
    client.post("/user-exercises/", json={
        "user_id": test_user.id,
        "exercise_id": exercise.id,
        "rep_count": 5,
    })
    r = client.get("/user-exercises/")
    assert r.status_code == 200
    assert len(r.json()) >= 1
