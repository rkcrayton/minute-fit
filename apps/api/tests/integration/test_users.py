import io

import pytest

import auth as auth_module
import routers.users as users_module
from helpers import make_jpeg_bytes


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
    assert "refresh_token" in data
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


# ---------------------------------------------------------------------------
# POST /users/token/refresh
# ---------------------------------------------------------------------------

def test_refresh_token_success(client, test_user):
    login = client.post("/users/token", data={"username": "testuser", "password": "password123"})
    refresh_token = login.json()["refresh_token"]

    r = client.post("/users/token/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_refresh_token_rotated(client, test_user):
    # Each refresh issues a new refresh token
    login = client.post("/users/token", data={"username": "testuser", "password": "password123"})
    original_refresh = login.json()["refresh_token"]

    r = client.post("/users/token/refresh", json={"refresh_token": original_refresh})
    assert r.json()["refresh_token"] != original_refresh


def test_refresh_token_new_access_token_is_valid(client, test_user):
    login = client.post("/users/token", data={"username": "testuser", "password": "password123"})
    refresh_token = login.json()["refresh_token"]

    r = client.post("/users/token/refresh", json={"refresh_token": refresh_token})
    new_access_token = r.json()["access_token"]

    me = client.get("/users/me", headers={"Authorization": f"Bearer {new_access_token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "testuser"


def test_refresh_token_invalid(client):
    r = client.post("/users/token/refresh", json={"refresh_token": "not.a.valid.token"})
    assert r.status_code == 401


def test_refresh_token_rejects_access_token(client, test_user):
    # An access token must not be accepted as a refresh token
    login = client.post("/users/token", data={"username": "testuser", "password": "password123"})
    access_token = login.json()["access_token"]

    r = client.post("/users/token/refresh", json={"refresh_token": access_token})
    assert r.status_code == 401


def test_refresh_token_missing_sub(client):
    # Refresh token with no "sub" claim
    token = auth_module.create_refresh_token({"data": "no-sub"})
    r = client.post("/users/token/refresh", json={"refresh_token": token})
    assert r.status_code == 401


def test_refresh_token_user_not_found(client):
    # Valid refresh token but username doesn't exist in the DB
    token = auth_module.create_refresh_token({"sub": "ghost_user_xyz"})
    r = client.post("/users/token/refresh", json={"refresh_token": token})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /users/me/avatar
# ---------------------------------------------------------------------------

def test_upload_avatar_unauthenticated(client):
    r = client.post("/users/me/avatar", files={
        "file": ("avatar.jpg", io.BytesIO(make_jpeg_bytes()), "image/jpeg"),
    })
    assert r.status_code == 401


def test_upload_avatar_invalid_extension(client, auth_headers):
    r = client.post("/users/me/avatar", headers=auth_headers, files={
        "file": ("avatar.txt", io.BytesIO(b"not an image"), "text/plain"),
    })
    assert r.status_code == 400
    assert "jpg" in r.json()["detail"].lower() or "png" in r.json()["detail"].lower()


def test_upload_avatar_too_large(client, auth_headers):
    big = b'\xff\xd8\xff' + b'\x00' * (5 * 1024 * 1024 + 1)
    r = client.post("/users/me/avatar", headers=auth_headers, files={
        "file": ("avatar.jpg", io.BytesIO(big), "image/jpeg"),
    })
    assert r.status_code == 413


def test_upload_avatar_bad_magic_bytes(client, auth_headers):
    r = client.post("/users/me/avatar", headers=auth_headers, files={
        "file": ("avatar.jpg", io.BytesIO(b'%PDF-1.4' + b'\x00' * 100), "image/jpeg"),
    })
    assert r.status_code == 400
    assert "format" in r.json()["detail"].lower()


def test_upload_avatar_success(client, auth_headers, mocker, tmp_path):
    mocker.patch.object(users_module, "AVATARS_DIR", tmp_path)
    r = client.post("/users/me/avatar", headers=auth_headers, files={
        "file": ("avatar.jpg", io.BytesIO(make_jpeg_bytes()), "image/jpeg"),
    })
    assert r.status_code == 200
    assert r.json()["profile_picture"] is not None


# ---------------------------------------------------------------------------
# GET /users/me/avatar
# ---------------------------------------------------------------------------

def test_get_avatar_unauthenticated(client):
    r = client.get("/users/me/avatar")
    assert r.status_code == 401


def test_get_avatar_no_avatar_set(client, auth_headers):
    r = client.get("/users/me/avatar", headers=auth_headers)
    assert r.status_code == 404
    assert "No avatar" in r.json()["detail"]


def test_get_avatar_file_missing(client, auth_headers, db, test_user):
    # User has profile_picture set but the file doesn't exist on disk
    test_user.profile_picture = "avatar_99999.jpg"
    db.commit()
    r = client.get("/users/me/avatar", headers=auth_headers)
    assert r.status_code == 404
    assert "not found" in r.json()["detail"].lower()


def test_get_avatar_success(client, auth_headers, mocker, tmp_path):
    mocker.patch.object(users_module, "AVATARS_DIR", tmp_path)
    # Upload first
    client.post("/users/me/avatar", headers=auth_headers, files={
        "file": ("avatar.jpg", io.BytesIO(make_jpeg_bytes()), "image/jpeg"),
    })
    # Then retrieve
    r = client.get("/users/me/avatar", headers=auth_headers)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/jpeg")
