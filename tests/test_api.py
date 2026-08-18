from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_classes_list():
    response = client.get("/classes")
    assert response.status_code == 200
    data = response.json()
    assert len(data["classes"]) == 101


def test_predict_image_rejects_non_image():
    response = client.post(
        "/predict-image",
        files={"file": ("test.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400


def test_predict_image_rejects_empty_file():
    response = client.post(
        "/predict-image",
        files={"file": ("empty.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == 400


def test_predict_image_valid():
    """Utilise une vraie image du dataset pour vérifier le pipeline complet."""
    import glob
    sample_images = glob.glob("food/images/pizza/*.jpg")
    assert len(sample_images) > 0, "Aucune image de test trouvée dans food/images/pizza/."

    with open(sample_images[0], "rb") as f:
        response = client.post(
            "/predict-image",
            files={"file": ("test.jpg", f, "image/jpeg")},
        )
    assert response.status_code == 200
    data = response.json()

    assert "predicted_class" in data
    assert "confidence" in data
    assert 0 <= data["confidence"] <= 1
    assert len(data["top_5"]) <= 5
    assert "nutrition_source" in data
    assert data["nutrition_source"] in ("cache", "api", "unavailable")


def test_meals_history():
    response = client.get("/meals?user_id=1")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_correct_meal_invalid_class():
    """Une classe qui n'existe pas dans les 101 doit être rejetée."""
    response = client.post(
        "/meals/1/correct",
        json={"correct_class": "classe_qui_nexiste_pas"},
    )
    assert response.status_code in (400, 404)

def test_rag_guidelines_endpoint():
    response = client.get("/rag/guidelines?query=pizza")
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)


def test_rag_retrieval_function_directly():
    from app.rag import retrieve_nutrition_guidelines

    results = retrieve_nutrition_guidelines("dessert sucré", k=2)

    assert isinstance(results, list)
    assert len(results) <= 2