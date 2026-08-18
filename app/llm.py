import os
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

MODEL_NAME = "openai/gpt-oss-120b"  

SYSTEM_PROMPT = """Tu es un assistant nutritionnel intégré à une application de suivi alimentaire.
Ton rôle : donner un conseil court, concret et bienveillant sur le repas que l'utilisateur vient de manger.

Règles strictes :
- Ne donne JAMAIS de conseil médical (pas de diagnostic, pas de recommandation liée à une maladie).
- Ne prescris jamais de quantité précise de médicament, complément ou régime restrictif.
- Reste factuel sur les macronutriments fournis, ne les invente pas.
- Si les informations nutritionnelles sont incomplètes ou absentes, dis-le clairement plutôt que d'inventer.
- Ton court, encourageant, jamais culpabilisant.
- Réponds en 2-3 phrases maximum, en français.
- Si des recommandations nutritionnelles ou un historique de repas te sont fournis dans le message, appuie-toi dessus explicitement plutôt que d'inventer des généralités.
- Si l'utilisateur a un objectif calorique quotidien, situe le repas par rapport à cet objectif, sans jugement.
"""


def generate_nutrition_advice(
    predicted_class: str,
    nutrition: dict | None,
    portion_grams: float = 100,
    daily_calorie_goal: float | None = None,
    guideline_snippets: list[str] | None = None,
    similar_past_meals: list[str] | None = None,
) -> str:
    """Génère un conseil nutritionnel personnalisé via Llama 3 (Groq),
    ancré sur du contenu récupéré par RAG (recommandations + historique utilisateur)."""

    if nutrition is None:
        user_message = (
            f"L'utilisateur vient de manger : {predicted_class.replace('_', ' ')}. "
            f"Aucune donnée nutritionnelle n'est disponible pour cet aliment."
        )
    else:
        scale = portion_grams / 100
        calories = nutrition.get("calories")
        calories_portion = calories * scale if calories else None

        user_message = (
            f"L'utilisateur vient de manger : {predicted_class.replace('_', ' ')} "
            f"({portion_grams:.0f}g). "
            f"Valeurs nutritionnelles de cette portion : "
            f"{calories_portion:.0f} kcal, "
            f"{(nutrition.get('protein_g') or 0) * scale:.1f}g protéines, "
            f"{(nutrition.get('carbs_g') or 0) * scale:.1f}g glucides, "
            f"{(nutrition.get('fat_g') or 0) * scale:.1f}g lipides."
        )

    if daily_calorie_goal:
        user_message += f" Objectif calorique quotidien : {daily_calorie_goal:.0f} kcal."

    if guideline_snippets:
        context = "\n".join(f"- {s}" for s in guideline_snippets)
        user_message += (
            f"\n\nRecommandations nutritionnelles générales pertinentes "
            f"(base-toi dessus explicitement, ne les invente pas) :\n{context}"
        )

    if similar_past_meals:
        meals_str = ", ".join(similar_past_meals)
        user_message += (
            f"\n\nRepas similaires déjà consommés récemment par l'utilisateur : {meals_str}. "
            f"Tu peux en tenir compte pour contextualiser ton conseil (ex: variété, répétition)."
        )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=220,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Conseil indisponible pour le moment (erreur : {e})"