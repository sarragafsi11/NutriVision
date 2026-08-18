from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MealOut(BaseModel):
    id: int
    predicted_class: str
    corrected_class: Optional[str] = None
    confidence: Optional[float] = None
    portion_grams: float
    calories: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NutritionInfo(BaseModel):
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    matched_label: Optional[str] = None


class TopPrediction(BaseModel):
    class_name: str
    confidence: float


class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float
    top_5: List[TopPrediction]
    nutrition_per_100g: Optional[NutritionInfo] = None
    nutrition_source: str  # "cache" ou "api" ou "unavailable"
    advice: Optional[str] = None

class CorrectionRequest(BaseModel):
    correct_class: str