from datetime import timedelta

import pytest
from fastapi import HTTPException

import auth


# ---------------------------------------------------------------------------
# get_current_user — requires a real DB session
# ---------------------------------------------------------------------------

def test_get_current_user_expired_token(db):
    token = auth.create_access_token({"sub": "alice"}, expires_delta=timedelta(seconds=-1))
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(token=token, db=db)
    assert exc.value.status_code == 401


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
    token = auth.create_access_token({"data": "no-sub"})
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(token=token, db=db)
    assert exc.value.status_code == 401


def test_get_current_user_user_not_found(db):
    token = auth.create_access_token({"sub": "ghost_user"})
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(token=token, db=db)
    assert exc.value.status_code == 401


def test_get_current_user_rejects_refresh_token(db):
    from models.user import User

    user = User(
        email="rt@example.com",
        username="rtuser",
        hashed_password=auth.get_password_hash("pw"),
    )
    db.add(user)
    db.commit()

    refresh_token, _, _ = auth.create_refresh_token({"sub": "rtuser"})
    with pytest.raises(HTTPException) as exc:
        auth.get_current_user(token=refresh_token, db=db)
    assert exc.value.status_code == 401
