from pydantic import BaseModel
from typing import Optional


class ExerciseResponse(BaseModel):
    id: int
    name: str
    primary_muscle: str
    secondary_muscle: Optional[str] = None
    tertiary_muscle: Optional[str] = None
    difficulty: str
    equipment: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True
