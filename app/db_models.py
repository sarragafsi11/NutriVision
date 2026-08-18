from sqlalchemy import Column, Integer, String, Numeric, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    daily_calorie_goal = Column(Numeric(6, 1))
    created_at = Column(TIMESTAMP, server_default=func.now())


class FoodClass(Base):
    __tablename__ = "food_classes"
    id = Column(Integer, primary_key=True)
    class_name = Column(String(100), unique=True, nullable=False)
    matched_label = Column(String(255))
    calories = Column(Numeric(7, 2))
    protein_g = Column(Numeric(6, 2))
    carbs_g = Column(Numeric(6, 2))
    fat_g = Column(Numeric(6, 2))
    updated_at = Column(TIMESTAMP, server_default=func.now())


class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_path = Column(String(500))
    predicted_class = Column(String(100), ForeignKey("food_classes.class_name"), nullable=False)
    confidence = Column(Numeric(5, 4))
    corrected_class = Column(String(100), ForeignKey("food_classes.class_name"))
    portion_grams = Column(Numeric(7, 2), default=100)
    created_at = Column(TIMESTAMP, server_default=func.now())