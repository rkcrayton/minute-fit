from pydantic import BaseModel
from typing import Optional


class ExerciseResponse(BaseModel):
    id: int
    name: str
    primary_muscle: str
    secondary_muscle: Optional[str] = None
    tertiary_muscle: Optional[str] = None
    difficulty: str

    class Config:
        from_attributes = True
