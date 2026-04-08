from pydantic import BaseModel, Field
from datetime import datetime


class UserExerciseCreate(BaseModel):
    user_id: int
    exercise_id: int
    rep_count: int


class UserExerciseResponse(BaseModel):
    id: int
    user_id: int
    exercise_id: int
    duration_seconds: int = Field(alias="rep_count")
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
