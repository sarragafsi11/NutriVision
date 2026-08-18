from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app.rag import (
    retrieve_nutrition_guidelines,
    retrieve_similar_past_meals,
    add_meal_to_index
)
from app.model import predict_image, classes
from app.nutrition import get_nutrition_for_class
from app.llm import generate_nutrition_advice
from app.schemas import (
    PredictionResponse,
    TopPrediction,
    NutritionInfo,
    MealOut,
    CorrectionRequest
)
from app.database import get_db, engine, Base
from app import crud, db_models


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Food Recognition & Nutrition API",
    description="Reconnaissance alimentaire par Computer Vision + estimation nutritionnelle",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.11.126:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "API de reconnaissance alimentaire opérationnelle."
    }


@app.post("/predict-image", response_model=PredictionResponse)
async def predict_image_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Le fichier envoyé n'est pas une image."
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Fichier image vide."
        )

    try:
        top_5 = predict_image(image_bytes, top_k=5)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la prédiction : {e}"
        )

    top1 = top_5[0]

    nutrition, source = get_nutrition_for_class(
        top1["class_name"]
    )

    # --- RAG : récupération du contexte avant génération du conseil ---
    guideline_snippets = retrieve_nutrition_guidelines(
        top1["class_name"].replace("_", " ")
    )

    similar_meals = retrieve_similar_past_meals(
        user_id=1,
        current_class=top1["class_name"]
    )

    advice = generate_nutrition_advice(
        predicted_class=top1["class_name"],
        nutrition=nutrition,
        guideline_snippets=guideline_snippets,
        similar_past_meals=similar_meals,
    )

    # --- Sauvegarde en base ---
    user = crud.ensure_default_user(db)

    meal = crud.create_meal(
        db,
        user_id=user.id,
        predicted_class=top1["class_name"],
        confidence=top1["confidence"],
    )

   
    add_meal_to_index(
        meal_id=meal.id,
        user_id=user.id,
        class_name=meal.predicted_class,
        created_at=meal.created_at.isoformat(),
    )

    return PredictionResponse(
        predicted_class=top1["class_name"],
        confidence=top1["confidence"],
        top_5=[TopPrediction(**p) for p in top_5],
        nutrition_per_100g=NutritionInfo(**nutrition) if nutrition else None,
        nutrition_source=source,
        advice=advice,
    )


@app.get("/meals", response_model=List[MealOut])
def list_meals(
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """Historique des repas d'un utilisateur (pour le dashboard)."""

    meals = crud.get_user_meals(
        db,
        user_id=user_id
    )

    results = []

    for m in meals:
        final_class = m.corrected_class or m.predicted_class

        nutrition, _ = get_nutrition_for_class(
            final_class
        )

        calories = None

        if nutrition and nutrition.get("calories"):
            calories = float(nutrition["calories"]) * (
                float(m.portion_grams) / 100
            )

        results.append(
            MealOut(
                id=m.id,
                predicted_class=m.predicted_class,
                corrected_class=m.corrected_class,
                confidence=(
                    float(m.confidence)
                    if m.confidence is not None
                    else None
                ),
                portion_grams=float(m.portion_grams),
                calories=calories,
                created_at=m.created_at,
            )
        )

    return results


@app.post(
    "/meals/{meal_id}/correct",
    response_model=MealOut
)
def correct_meal_endpoint(
    meal_id: int,
    body: CorrectionRequest,
    db: Session = Depends(get_db)
):
    """Fonctionnalité de correction manuelle (PDF, section 5)."""

    if body.correct_class not in classes:
        raise HTTPException(
            status_code=400,
            detail="Classe inconnue."
        )

    meal = crud.correct_meal(
        db,
        meal_id=meal_id,
        corrected_class=body.correct_class
    )

    if not meal:
        raise HTTPException(
            status_code=404,
            detail="Repas introuvable."
        )

    
    add_meal_to_index(
        meal_id=meal.id,
        user_id=meal.user_id,
        class_name=meal.corrected_class,
        created_at=meal.created_at.isoformat(),
    )

    nutrition, _ = get_nutrition_for_class(
        meal.corrected_class
    )

    calories = None

    if nutrition and nutrition.get("calories"):
        calories = float(nutrition["calories"]) * (
            float(meal.portion_grams) / 100
        )

    return MealOut(
        id=meal.id,
        predicted_class=meal.predicted_class,
        corrected_class=meal.corrected_class,
        confidence=(
            float(meal.confidence)
            if meal.confidence is not None
            else None
        ),
        portion_grams=float(meal.portion_grams),
        calories=calories,
        created_at=meal.created_at,
    )


@app.get("/rag/guidelines")
def debug_rag_guidelines(query: str):
    """Route de démonstration : montre ce que le RAG récupère pour une requête donnée."""

    return {
        "query": query,
        "results": retrieve_nutrition_guidelines(
            query,
            k=3
        )
    }


@app.get("/classes")
def list_classes():
    """Liste des 101 classes, pour le menu déroulant de correction manuelle côté frontend."""

    return {
        "classes": classes
    }