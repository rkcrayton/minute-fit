from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from database import Base


class UserWorkoutPlan(Base):
    __tablename__ = "user_workout_plans"

    id = Column(Integer, primary_key=True, index=True)
    # Unique ⇒ one plan per user. PATCH/PUT overwrite in place.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=True)

    # { "monday": [ {exercise_id, times_per_day, duration_seconds, order}, ... ],
    #   "tuesday": [...], ..., "sunday": [...] }
    schedule = Column(JSON, nullable=False, default=dict)

    # { days_per_week, minutes_per_session, equipment: [...], avoid: str, goal: str }
    generation_prefs = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
