import json
import os
import time
import requests

from app.config import (
    NUTRITION_DB_PATH, APP_ID, APP_KEY, FOOD_DB_APP_ID, FOOD_DB_APP_KEY
)


def clean_class_name(cls: str) -> str:
    return cls.replace("_", " ")


def load_nutrition_db(path: str = NUTRITION_DB_PATH) -> dict:
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {}


def save_nutrition_db(db: dict, path: str = NUTRITION_DB_PATH):
    with open(path, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)


def request_with_backoff(url, params, max_retries=3, base_wait=5):
    """Réessaie en cas de 429. Timeouts courts car ici c'est un appel de secours
    dans une requête HTTP entrante -> on ne veut pas bloquer l'utilisateur trop longtemps."""
    r = None
    for attempt in range(max_retries):
        try:
            r = requests.get(url, params=params, timeout=5)
        except requests.RequestException:
            return None
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", base_wait * (attempt + 1)))
            time.sleep(min(wait, 15))  # on plafonne pour ne pas bloquer trop longtemps
            continue
        return r
    return r


def get_nutrition_food_database(food_name: str):
    url = "https://api.edamam.com/api/food-database/v2/parser"
    params = {
        "app_id": FOOD_DB_APP_ID,
        "app_key": FOOD_DB_APP_KEY,
        "ingr": food_name,
        "nutrition-type": "logging",
    }
    r = request_with_backoff(url, params)
    if r is None or r.status_code != 200:
        return None
    data = r.json()
    hints = data.get("hints", [])
    if not hints:
        return None
    food = hints[0]["food"]
    nutrients = food.get("nutrients", {})
    if not nutrients.get("ENERC_KCAL"):
        return None
    return {
        "calories": nutrients.get("ENERC_KCAL"),
        "protein_g": nutrients.get("PROCNT"),
        "carbs_g": nutrients.get("CHOCDF"),
        "fat_g": nutrients.get("FAT"),
        "matched_label": food.get("label"),
    }


def get_nutrition_edamam_robust(food_name: str):
    result = get_nutrition_food_database(food_name)
    if result is not None:
        return result

    query = f"100g {food_name}"
    url = "https://api.edamam.com/api/nutrition-data"
    params = {"app_id": APP_ID, "app_key": APP_KEY, "ingr": query}
    r = request_with_backoff(url, params)
    if r is None or r.status_code != 200:
        return None
    data = r.json()
    if data.get("calories"):
        return {
            "calories": data.get("calories"),
            "protein_g": data.get("totalNutrients", {}).get("PROCNT", {}).get("quantity"),
            "carbs_g": data.get("totalNutrients", {}).get("CHOCDF", {}).get("quantity"),
            "fat_g": data.get("totalNutrients", {}).get("FAT", {}).get("quantity"),
            "matched_query": query,
        }
    return None


def get_nutrition_for_class(predicted_class: str):
    """Cherche d'abord dans la base locale (rapide, pas d'appel réseau),
    sinon appelle Edamam en secours et met à jour la base pour la prochaine fois."""
    db = load_nutrition_db()

    if predicted_class in db:
        return db[predicted_class], "cache"

    food_name = clean_class_name(predicted_class)
    result = get_nutrition_edamam_robust(food_name)

    if result is not None:
        db[predicted_class] = result
        save_nutrition_db(db)
        return result, "api"

    return None, "unavailable"