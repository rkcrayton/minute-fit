from sqlalchemy import Column, Integer, String
from database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    primary_muscle = Column(String, nullable=False)
    secondary_muscle = Column(String, nullable=True)
    tertiary_muscle = Column(String, nullable=True)
    difficulty = Column(String, nullable=False)  # easy | medium | hard
