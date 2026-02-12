from sqlalchemy import Column, Integer, String, Float
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, index=True, nullable=False)
    age = Column(Integer, index=True, nullable=False)
    weight = Column(Float, index=True, nullable=False)
    height = Column(Float,index=True, nullable=False)
    fitness_goal = Column(String,index=True,nullable=True)
