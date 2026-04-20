import os

# Must be set before any app module is imported
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-1234567890ab")
os.environ.setdefault("ALLOWED_ORIGINS", "*")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

# Build the test engine BEFORE importing any app module.
# database.py calls create_engine() at module level with PostgreSQL-only pool args
# that SQLite rejects. We intercept that call and return our StaticPool engine.
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)

with patch("sqlalchemy.create_engine", return_value=TEST_ENGINE):
    import database  # noqa: E402 — must come after patch

# Ensure all subsequent SessionLocal() calls use our test engine.
database.engine = TEST_ENGINE
database.SessionLocal = TestSessionLocal


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    database.Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    database.Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture
def db(create_tables):
    """Each test gets a transaction rolled back on teardown for isolation."""
    conn = TEST_ENGINE.connect()
    trans = conn.begin()
    session = TestSessionLocal(bind=conn)
    yield session
    session.close()
    trans.rollback()
    conn.close()


@pytest.fixture
def client(db):
    from database import get_db
    from main import app

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Minimal user — no height/weight/age."""
    from models.user import User
    import auth as auth_module

    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=auth_module.get_password_hash("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def complete_user(db):
    """User with all profile fields set — required for scan analysis."""
    from models.user import User
    import auth as auth_module

    user = User(
        email="complete@example.com",
        username="completeuser",
        hashed_password=auth_module.get_password_hash("password123"),
        age=25,
        weight=170.0,
        height=70.0,
        gender="male",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, test_user):
    r = client.post("/users/token", data={"username": "testuser", "password": "password123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def complete_auth_headers(client, complete_user):
    r = client.post("/users/token", data={"username": "completeuser", "password": "password123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def seeded_db(db):
    """DB with all 8 default exercises inserted."""
    from routers.exercises import seed_exercises
    seed_exercises(db)
    return db


from helpers import make_jpeg_bytes  # noqa: F401 — re-exported for backward compat


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear in-memory rate limit counters between tests so limits never accumulate."""
    from limiter import limiter
    yield
    limiter._storage.reset()
