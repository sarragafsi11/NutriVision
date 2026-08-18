import os
from dotenv import load_dotenv

load_dotenv(override=True)


CHECKPOINT_PATH = os.getenv("CHECKPOINT_PATH", "checkpoints_food_resnet50_final.pth")
CLASSES_PATH = os.getenv("CLASSES_PATH", "food/meta/meta/classes.txt")
NUTRITION_DB_PATH = os.getenv("NUTRITION_DB_PATH", "food_nutrition_db.json")


APP_ID = os.getenv("EDAMAM_APP_ID")
APP_KEY = os.getenv("EDAMAM_APP_KEY")
FOOD_DB_APP_ID = os.getenv("EDAMAM_FOOD_DB_APP_ID")
FOOD_DB_APP_KEY = os.getenv("EDAMAM_FOOD_DB_APP_KEY")


INPUT_SIZE = 224
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD = [0.229, 0.224, 0.225]