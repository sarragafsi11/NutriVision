import json
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv(override=True)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "food_recognition_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")

with open("food_nutrition_db.json", "r", encoding="utf-8") as f:
    nutrition_db = json.load(f)

conn = psycopg2.connect(
    host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
    user=DB_USER, password=DB_PASSWORD,
)
cur = conn.cursor()

inserted, updated = 0, 0

for class_name, data in nutrition_db.items():
    cur.execute(
        """
        INSERT INTO food_classes (class_name, matched_label, calories, protein_g, carbs_g, fat_g)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (class_name) DO UPDATE SET
            matched_label = EXCLUDED.matched_label,
            calories = EXCLUDED.calories,
            protein_g = EXCLUDED.protein_g,
            carbs_g = EXCLUDED.carbs_g,
            fat_g = EXCLUDED.fat_g,
            updated_at = NOW()
        RETURNING (xmax = 0) AS was_inserted;
        """,
        (
            class_name,
            data.get("matched_label"),
            data.get("calories"),
            data.get("protein_g"),
            data.get("carbs_g"),
            data.get("fat_g"),
        ),
    )
    was_inserted = cur.fetchone()[0]
    if was_inserted:
        inserted += 1
    else:
        updated += 1

conn.commit()
cur.close()
conn.close()

print(f"Terminé : {inserted} lignes insérées, {updated} mises à jour.")
print(f"Total attendu : {len(nutrition_db)} classes.")