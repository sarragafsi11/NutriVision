from sqlalchemy.orm import Session
from app.db_models import Meal, User


def ensure_default_user(db: Session) -> User:
    """MVP sans authentification : un seul utilisateur par défaut (id=1)."""
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(id=1, email="demo@user.com")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def create_meal(db: Session, user_id: int, predicted_class: str, confidence: float, portion_grams: float = 100):
    meal = Meal(
        user_id=user_id,
        predicted_class=predicted_class,
        confidence=confidence,
        portion_grams=portion_grams,
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


def get_user_meals(db: Session, user_id: int, limit: int = 100):
    return (
        db.query(Meal)
        .filter(Meal.user_id == user_id)
        .order_by(Meal.created_at.desc())
        .limit(limit)
        .all()
    )

def correct_meal(db: Session, meal_id: int, corrected_class: str):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        return None
    meal.corrected_class = corrected_class
    db.commit()
    db.refresh(meal)
    return meal