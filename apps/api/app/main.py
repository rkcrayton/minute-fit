from fastapi import FastAPI
from database import engine, Base, SessionLocal
from routers import users, exercises, user_exercises, scan

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gotta Minute Fitness API")

app.include_router(users.router)
app.include_router(exercises.router)
app.include_router(user_exercises.router)
app.include_router(scan.router)

# Seed exercise data on startup
db = SessionLocal()
try:
    exercises.seed_exercises(db)
finally:
    db.close()

@app.get("/")
def root():
    return {"message": "Welcome to Gotta Minute Fitness API"}

