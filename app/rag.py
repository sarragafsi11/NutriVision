import os
import glob
import chromadb
from chromadb.utils import embedding_functions
from sqlalchemy.orm import Session
from app.db_models import Meal

KB_DIR = "knowledge_base"
CHROMA_DIR = "chroma_db"  # persisté sur disque, survit aux redémarrages


embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="paraphrase-multilingual-MiniLM-L12-v2"
)


chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

guidelines_collection = chroma_client.get_or_create_collection(
    name="nutrition_guidelines",
    embedding_function=embedding_fn,
)

user_meals_collection = chroma_client.get_or_create_collection(
    name="user_meals",
    embedding_function=embedding_fn,
)


def _ingest_knowledge_base():
    """Indexe les fichiers de knowledge_base/ une seule fois (si pas déjà fait)."""
    existing_ids = set(guidelines_collection.get()["ids"])

    txt_files = sorted(glob.glob(f"{KB_DIR}/*.txt"))
    if not txt_files:
        print(f"[RAG] Aucun fichier trouvé dans {KB_DIR}/ — base de connaissances vide.")
        return

    new_ids, new_docs, new_metadatas = [], [], []
    for path in txt_files:
        doc_id = os.path.basename(path)
        if doc_id in existing_ids:
            continue  # déjà indexé lors d'un run précédent
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
        new_ids.append(doc_id)
        new_docs.append(text)
        new_metadatas.append({"source": doc_id})

    if new_ids:
        guidelines_collection.add(ids=new_ids, documents=new_docs, metadatas=new_metadatas)
        print(f"[RAG] {len(new_ids)} nouveau(x) document(s) indexé(s) dans nutrition_guidelines.")
    else:
        print(f"[RAG] Base de connaissances déjà à jour ({len(existing_ids)} documents).")


# Ingestion au chargement du module (une seule fois par démarrage du serveur)
_ingest_knowledge_base()


def retrieve_nutrition_guidelines(query_text: str, k: int = 2) -> list[str]:
    """Récupère les k passages les plus pertinents de la base de connaissances statique."""
    if guidelines_collection.count() == 0:
        return []
    results = guidelines_collection.query(query_texts=[query_text], n_results=min(k, guidelines_collection.count()))
    return results["documents"][0] if results["documents"] else []


def add_meal_to_index(meal_id: int, user_id: int, class_name: str, created_at: str):
    """Indexe un repas fraîchement enregistré, pour pouvoir le retrouver plus tard par similarité."""
    readable_name = class_name.replace("_", " ")
    user_meals_collection.add(
        ids=[f"meal_{meal_id}"],
        documents=[readable_name],
        metadatas=[{"user_id": user_id, "class_name": class_name, "created_at": created_at}],
    )


def retrieve_similar_past_meals(user_id: int, current_class: str, k: int = 3) -> list[str]:
    """Retrouve, parmi l'historique de CET utilisateur, les repas sémantiquement les plus proches
    du repas actuel (pas juste les plus récents chronologiquement)."""
    if user_meals_collection.count() == 0:
        return []

    query_text = current_class.replace("_", " ")
    results = user_meals_collection.query(
        query_texts=[query_text],
        n_results=min(k + 1, user_meals_collection.count()),  
        where={"user_id": user_id},
    )
    if not results["documents"]:
        return []

    found = results["documents"][0]
    
    filtered = [f for f in found if f != query_text]
    return filtered[:k]


def sync_meal_history_index(db: Session, user_id: int):
    """Réindexe tout l'historique d'un utilisateur (utile après un import massif ou une correction manuelle)."""
    meals = db.query(Meal).filter(Meal.user_id == user_id).all()
    for m in meals:
        class_name = m.corrected_class or m.predicted_class
        add_meal_to_index(
            meal_id=m.id,
            user_id=user_id,
            class_name=class_name,
            created_at=m.created_at.isoformat(),
        )
    print(f"[RAG] {len(meals)} repas réindexés pour l'utilisateur {user_id}.")