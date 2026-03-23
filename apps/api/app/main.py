from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import users, exercises, user_exercises, scan, water

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gotta Minute Fitness API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(exercises.router)
app.include_router(user_exercises.router)
app.include_router(scan.router)
app.include_router(water.router)

# Seed exercise data on startup
db = SessionLocal()
try:
    exercises.seed_exercises(db)
finally:
    db.close()

@app.get("/")
def root():
    return {"message": "Welcome to Gotta Minute Fitness API"}

