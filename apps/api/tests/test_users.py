import pytest


# ---------------------------------------------------------------------------
# POST /users/register
# ---------------------------------------------------------------------------

def test_register_success(client):
    r = client.post("/users/register", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "pass1234",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "new@example.com"
    assert data["username"] == "newuser"
    assert "id" in data
    assert "password" not in data


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "username": "dup1", "password": "pass"}
    client.post("/users/register", json=payload)
    r = client.post("/users/register", json={**payload, "username": "dup2"})
    assert r.status_code == 400
    assert "Email" in r.json()["detail"]


def test_register_duplicate_username(client):
    payload = {"email": "first@example.com", "username": "sameuser", "password": "pass"}
    client.post("/users/register", json=payload)
    r = client.post("/users/register", json={**payload, "email": "second@example.com"})
    assert r.status_code == 400
    assert "Username" in r.json()["detail"]


# ---------------------------------------------------------------------------
# POST /users/token
# ---------------------------------------------------------------------------

def test_login_success(client, test_user):
    r = client.post("/users/token", data={"username": "testuser", "password": "password123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_user):
    r = client.post("/users/token", data={"username": "testuser", "password": "wrongpass"})
    assert r.status_code == 400


def test_login_unknown_username(client):
    r = client.post("/users/token", data={"username": "nobody", "password": "pass"})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# GET /users/me
# ---------------------------------------------------------------------------

def test_get_me_authenticated(client, auth_headers):
    r = client.get("/users/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["username"] == "testuser"


def test_get_me_no_token(client):
    r = client.get("/users/me")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# PUT /users/me
# ---------------------------------------------------------------------------

def test_update_profile_first_name(client, auth_headers):
    r = client.put("/users/me", json={"first_name": "Alice"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["first_name"] == "Alice"


def test_update_profile_weight_and_height(client, auth_headers):
    r = client.put("/users/me", json={"weight": 155.0, "height": 68.0}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["weight"] == 155.0
    assert data["height"] == 68.0


def test_update_profile_gender(client, auth_headers):
    r = client.put("/users/me", json={"gender": "female"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["gender"] == "female"


def test_update_profile_no_token(client):
    r = client.put("/users/me", json={"first_name": "Hacker"})
    assert r.status_code == 401
