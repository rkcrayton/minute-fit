from datetime import timedelta

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
    assert payload["type"] == "access"


def test_create_access_token_custom_expiry():
    token = auth.create_access_token({"sub": "bob"}, expires_delta=timedelta(hours=2))
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    assert payload["sub"] == "bob"
    assert payload["type"] == "access"


# ---------------------------------------------------------------------------
# Refresh token creation
# ---------------------------------------------------------------------------

def test_create_refresh_token_returns_string():
    token = auth.create_refresh_token({"sub": "alice"})
    assert isinstance(token, str)
    assert len(token) > 10


def test_create_refresh_token_has_refresh_type():
    token = auth.create_refresh_token({"sub": "alice"})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    assert payload["type"] == "refresh"
    assert payload["sub"] == "alice"
    assert "exp" in payload


def test_access_and_refresh_tokens_are_different():
    access = auth.create_access_token({"sub": "alice"})
    refresh = auth.create_refresh_token({"sub": "alice"})
    assert access != refresh
