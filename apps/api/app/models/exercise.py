from sqlalchemy import Column, Integer, String, Text
from database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    primary_muscle = Column(String, nullable=False)
    secondary_muscle = Column(String, nullable=True)
    tertiary_muscle = Column(String, nullable=True)
    difficulty = Column(String, nullable=False)  # easy | medium | hard

    # --- Wger-sourced fields (all nullable so existing rows stay valid) ---
    wger_id = Column(Integer, unique=True, index=True, nullable=True)
    equipment = Column(String, nullable=True)  # bodyweight | dumbbell | barbell | machine | resistance_band
    category = Column(String, nullable=True)   # strength | cardio | stretching | core
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
