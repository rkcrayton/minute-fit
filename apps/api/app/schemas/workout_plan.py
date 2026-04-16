from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


class WorkoutPlanExerciseEntry(BaseModel):
    """One exercise slot inside a day."""
    exercise_id: int
    times_per_day: int = Field(ge=1, le=12)
    duration_seconds: int = Field(ge=5, le=3600)
    order: int = 0


class DayEntryEnriched(WorkoutPlanExerciseEntry):
    """Same as WorkoutPlanExerciseEntry but enriched with exercise metadata for FE."""
    name: str
    primary_muscle: str
    difficulty: str
    equipment: Optional[str] = None
    image_url: Optional[str] = None


class WorkoutPlanResponse(BaseModel):
    id: int
    title: str
    subtitle: Optional[str] = None
    schedule: Dict[str, List[DayEntryEnriched]]
    generation_prefs: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkoutPlanUpdate(BaseModel):
    """Full replace — schedule is required; title/subtitle optional overrides."""
    title: Optional[str] = None
    subtitle: Optional[str] = None
    schedule: Dict[str, List[WorkoutPlanExerciseEntry]]

    @field_validator("schedule")
    @classmethod
    def _validate_schedule_days(cls, value: Dict[str, List[WorkoutPlanExerciseEntry]]):
        unknown = [d for d in value.keys() if d not in DAYS]
        if unknown:
            raise ValueError(f"Unknown day(s): {unknown}")
        return value


class DayUpdate(BaseModel):
    """Replace one day's entries."""
    entries: List[WorkoutPlanExerciseEntry]


class GeneratePlanRequest(BaseModel):
    days_per_week: int = Field(ge=1, le=7)
    minutes_per_session: int = Field(ge=5, le=180)
    equipment: List[str] = Field(default_factory=list)
    avoid: Optional[str] = None
    goal: Optional[str] = None
