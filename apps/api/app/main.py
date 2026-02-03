from fastapi import FastAPI
from database import engine, Base
from routers import users

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gotta Minute Fitness API")

app.include_router(users.router)

@app.get("/")
def root():
    return {"message": "Welcome to Gotta Minute Fitness API"}

