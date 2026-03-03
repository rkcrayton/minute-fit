from pydantic import BaseModel
from datetime import datetime


class UserExerciseCreate(BaseModel):
    user_id: int
    exercise_id: int
    rep_count: int


class UserExerciseResponse(BaseModel):
    id: int
    user_id: int
    exercise_id: int
    rep_count: int
    created_at: datetime

    class Config:
        from_attributes = True
