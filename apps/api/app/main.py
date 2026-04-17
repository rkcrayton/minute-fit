import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import settings
from database import SessionLocal, engine, Base
# Import all models so Base.metadata knows about them before create_all.
from models import user_workout_plan  # noqa: F401 — register table
from routers import users, exercises, user_exercises, scan, water, workout_plans

_log = logging.getLogger(__name__)


def _table_columns(conn, table: str) -> set[str]:
    dialect = engine.dialect.name
    if dialect == "sqlite":
        result = conn.execute(text(f"PRAGMA table_info({table})"))
        return {row[1] for row in result.fetchall()}
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = :t"
    ), {"t": table})
    return {row[0] for row in result.fetchall()}


def _add_column_if_missing(conn, table: str, column: str, ddl_type: str) -> None:
    cols = _table_columns(conn, table)
    if column not in cols:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (including user_workout_plans).
    Base.metadata.create_all(bind=engine)
    _log.info("Base.metadata.create_all finished (user_workout_plans ensured).")

    # Lightweight column guards for databases that were created before
    # migrations 001/003 ran. Keeps boot idempotent.
    with engine.connect() as conn:
        # 001: scan_results.ai_insights
        _add_column_if_missing(conn, "scan_results", "ai_insights", "TEXT")

        # 003: exercises.* (wger_id, equipment, category, description, image_url)
        _add_column_if_missing(conn, "exercises", "wger_id", "INTEGER")
        _add_column_if_missing(conn, "exercises", "equipment", "VARCHAR")
        _add_column_if_missing(conn, "exercises", "category", "VARCHAR")
        _add_column_if_missing(conn, "exercises", "description", "TEXT")
        _add_column_if_missing(conn, "exercises", "image_url", "VARCHAR")

        conn.commit()

    # Add profile_picture column if missing (for existing databases)
    with engine.connect() as conn:
        dialect = engine.dialect.name
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            pp_exists = "profile_picture" in columns
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'profile_picture'"
            ))
            pp_exists = result.fetchone() is not None
        if not pp_exists:
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_picture VARCHAR"))
            conn.commit()

    # Seed exercise data (already idempotent)
    db = SessionLocal()
    try:
        exercises.seed_exercises(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Gotta Minute Fitness API", lifespan=lifespan)

# Parse allowed origins from env var (comma-separated)
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(exercises.router)
app.include_router(exercises.admin_router)
app.include_router(user_exercises.router)
app.include_router(scan.router)
app.include_router(water.router)
app.include_router(workout_plans.router)


@app.get("/")
def root():
    return {"message": "Welcome to Gotta Minute Fitness API"}


@app.get("/health")
def health_check():
    """Health check endpoint for Cloud Run."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "detail": str(e)}