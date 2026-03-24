from datetime import timedelta
import pytest
from fastapi import HTTPException
from jose import jwt

import auth
from config import settings


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def test_verify_password_correct():
    hashed = auth.get_password_hash("mysecret")
    assert auth.verify_password("mysecret", hashed) is True


def test_verify_password_wrong():
    hashed = auth.get_password_hash("mysecret")
    assert auth.verify_password("wrongpassword", hashed) is False


def test_get_password_hash_not_plaintext():
    hashed = auth.get_password_hash("mysecret")
    assert hashed != "mysecret"


def test_get_password_hash_verifiable():
    hashed = auth.get_password_hash("anotherpass")
    assert auth.verify_password("anotherpass", hashed) is True


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

def test_create_access_token_returns_string():
    token = auth.create_access_token({"sub": "alice"})
    assert isinstance(token, str)
    assert len(token) > 10


def test_create_access_token_default_expiry_decodes():
    token = auth.create_access_token({"sub": "alice"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    assert payload["sub"] == "alice"
    assert "exp" in payload


def test_create_access_token_custom_expiry():
    token = auth.create_access_token({"sub": "bob"}, expires_delta=timedelta(hours=2))
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    assert payload["sub"] == "bob"


# ---------------------------------------------------------------------------
# get_current_user
# ---------------------------------------------------------------------------

def test_get_current_user_valid(db):
    from models.user import User

    user = User(
        email="cu@example.com",
        username="curuser",
        hashed_password=auth.get_password_hash("pw"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": "curuser"})
    result = auth.get_current_user(token=token, db=db)
    assert result.username == "curuser"


def test_get_current_user_invalid_token(db):
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(token="not.a.valid.token", db=db)
    assert exc.value.status_code == 401


def test_get_current_user_missing_sub(db):
    # Token with no "sub" claim
    token = auth.create_access_token({"data": "no-sub"})
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(token=token, db=db)
    assert exc.value.status_code == 401


def test_get_current_user_user_not_found(db):
    # Token references a username that doesn't exist
    token = auth.create_access_token({"sub": "ghost_user"})
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(token=token, db=db)
    assert exc.value.status_code == 401
