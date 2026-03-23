from datetime import datetime
from pydantic import BaseModel

class WaterLogCreate(BaseModel):
    amount_oz: float
    logged_at: datetime | None = None

class WaterLogRead(BaseModel):
    id: int
    amount_oz: float
    logged_at: datetime

    class Config:
        from_attributes = True

class WaterTodaySummary(BaseModel):
    total_oz: float
    goal_oz: float