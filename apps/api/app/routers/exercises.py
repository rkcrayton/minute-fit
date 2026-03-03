from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from models.exercise import Exercise
from schemas.exercise import ExerciseResponse
from database import get_db

router = APIRouter(prefix="/exercises", tags=["exercises"])

SEED_EXERCISES = [
    {
        "name": "Push-Ups",
        "primary_muscle": "Chest",
        "secondary_muscle": "Triceps",
        "tertiary_muscle": "Shoulders",
        "difficulty": "easy",
    },
    {
        "name": "Sit-Ups",
        "primary_muscle": "Abs",
        "secondary_muscle": "Hip Flexors",
        "tertiary_muscle": None,
        "difficulty": "easy",
    },
    {
        "name": "Plank",
        "primary_muscle": "Core",
        "secondary_muscle": "Shoulders",
        "tertiary_muscle": "Glutes",
        "difficulty": "easy",
    },
    {
        "name": "Squats",
        "primary_muscle": "Quads",
        "secondary_muscle": "Glutes",
        "tertiary_muscle": "Hamstrings",
        "difficulty": "easy",
    },
    {
        "name": "Jumping Jacks",
        "primary_muscle": "Calves",
        "secondary_muscle": "Shoulders",
        "tertiary_muscle": "Hip Abductors",
        "difficulty": "easy",
    },
    {
        "name": "Lunges",
        "primary_muscle": "Quads",
        "secondary_muscle": "Glutes",
        "tertiary_muscle": "Hamstrings",
        "difficulty": "medium",
    },
    {
        "name": "Good Mornings",
        "primary_muscle": "Hamstrings",
        "secondary_muscle": "Lower Back",
        "tertiary_muscle": "Glutes",
        "difficulty": "medium",
    },
    {
        "name": "Calf Raises",
        "primary_muscle": "Calves",
        "secondary_muscle": "Soleus",
        "tertiary_muscle": None,
        "difficulty": "easy",
    },
]


def seed_exercises(db: Session):
    if db.query(Exercise).count() == 0:
        for data in SEED_EXERCISES:
            db.add(Exercise(**data))
        db.commit()


@router.get("/", response_model=List[ExerciseResponse])
def get_exercises(db: Session = Depends(get_db)):
    return db.query(Exercise).all()
