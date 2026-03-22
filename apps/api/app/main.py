from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import settings
from database import SessionLocal, engine, Base
from routers import users, exercises, user_exercises, scan, water


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
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
app.include_router(user_exercises.router)
app.include_router(scan.router)
app.include_router(water.router)


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