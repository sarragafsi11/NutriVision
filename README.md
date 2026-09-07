# 🥗 NutriVision

Une application intelligente de reconnaissance alimentaire et de suivi nutritionnel, combinant Computer Vision, IA générative et RAG (Retrieval-Augmented Generation). Prenez en photo votre repas, obtenez instantanément ses valeurs nutritionnelles et un conseil personnalisé ancré sur des recommandations vérifiées.

![Python](https://img.shields.io/badge/python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688)
![Next.js](https://img.shields.io/badge/Next.js-16.3-black)
![PyTorch](https://img.shields.io/badge/PyTorch-ResNet50-EE4C2C)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Setup](#-environment-setup)
- [API Documentation](#-api-documentation)
- [Model Performance](#-model-performance)
- [RAG System](#-rag-system)
- [Docker](#-docker)
- [Testing](#-testing)
- [Limitations & Future Work](#-limitations--future-work)
- [License](#-license)

## ✨ Features

### Reconnaissance alimentaire (Computer Vision)
- ✅ Classification d'images sur 101 classes de plats (dataset Food-101)
- ✅ Transfer learning ResNet50 en 3 phases progressives (tête → fine-tuning partiel → fine-tuning étendu)
- ✅ Prédiction top-5 avec score de confiance
- ✅ Upload photo depuis fichier (mobile/desktop friendly)

### Estimation nutritionnelle
- ✅ Intégration API Edamam (Food Database + Nutrition Analysis en secours)
- ✅ Cache local des 101 classes pour des réponses instantanées
- ✅ Calcul dynamique selon la portion consommée
- ✅ Gestion des limites de débit (retry avec backoff automatique)

### Conseils nutritionnels par IA générative (LLM + RAG)
- ✅ Génération de conseils personnalisés via LLM (Groq)
- ✅ Architecture RAG : recommandations ancrées sur une base de connaissances vectorielle (ChromaDB)
- ✅ Personnalisation via l'historique alimentaire de l'utilisateur (similarité sémantique)
- ✅ Prompt engineering strict : aucun conseil médical, réponses factuelles et bienveillantes

### Historique & Tableau de bord
- ✅ Sauvegarde de chaque repas analysé en base PostgreSQL
- ✅ Graphiques d'évolution (calories/jour, répartition des aliments) via Recharts
- ✅ Historique chronologique consultable

### Correction manuelle
- ✅ L'utilisateur peut corriger la classe détectée si le modèle se trompe
- ✅ Réindexation automatique dans PostgreSQL et dans la base vectorielle

## 🛠️ Tech Stack

### Computer Vision
- **PyTorch / Torchvision** — framework de deep learning
- **ResNet50** — modèle pré-entraîné (ImageNet), fine-tuné sur Food-101
- **Pillow** — prétraitement des images

### Nutrition
- **Edamam API** — Food Database API (plats composés) + Nutrition Analysis API (secours)
- **Cache JSON local** — évite les appels réseau répétés

### IA générative & RAG
- **Groq API** — inférence LLM à faible latence (openai/gpt-oss-120b)
- **ChromaDB** — base de données vectorielle persistante
- **sentence-transformers** — modèle d'embeddings multilingue (`paraphrase-multilingual-MiniLM-L12-v2`)

### Backend
- **FastAPI** — framework API asynchrone
- **Uvicorn** — serveur ASGI
- **Pydantic** — validation des requêtes/réponses
- **SQLAlchemy** — ORM

### Base de données
- **PostgreSQL 16** — stockage des utilisateurs, repas et référentiel nutritionnel

### Frontend
- **Next.js 16** (App Router) — interface utilisateur
- **Tailwind CSS** — mise en forme
- **Recharts** — visualisation de données
- **Axios** — client HTTP
- **Lucide React** — iconographie

### DevOps
- **Docker / Docker Compose** — conteneurisation (backend, frontend, base de données)
- **Git / GitHub** — versioning

### Tests
- **Pytest** — tests de l'API (FastAPI TestClient)

## 🏗️ Architecture

```
┌──────────────────┐      ┌──────────────────────────────────────────┐
│  Frontend         │      │  Backend (FastAPI)                        │
│  Next.js          │─────▶│                                            │
│  localhost:3000   │      │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
└──────────────────┘      │  │   CV     │─▶│ Nutrition │─▶│   RAG    │ │
                           │  │ ResNet50 │  │  Edamam   │  │ ChromaDB │ │
                           │  └──────────┘  └──────────┘  └────┬─────┘ │
                           │                                    ▼      │
                           │                              ┌──────────┐ │
                           │                              │   LLM    │ │
                           │                              │  (Groq)  │ │
                           │                              └──────────┘ │
                           └───────────────┬────────────────────────────┘
                                           ▼
                                  ┌─────────────────┐
                                  │   PostgreSQL     │
                                  │ users / meals /  │
                                  │  food_classes    │
                                  └─────────────────┘
```

Pipeline pour chaque requête `/predict-image` :
1. **Computer Vision** : l'image est classifiée parmi 101 classes (top-5 avec confiance)
2. **Nutrition** : les macronutriments de la classe prédite sont récupérés (cache ou API Edamam)
3. **RAG (Retrieval)** : récupération des recommandations nutritionnelles pertinentes + des repas historiques sémantiquement proches
4. **LLM (Generation)** : génération d'un conseil personnalisé, ancré sur le contexte récupéré
5. **Persistance** : le repas est sauvegardé en PostgreSQL et indexé dans ChromaDB pour les futures recherches de similarité

## 📁 Project Structure

```
NutriVision/
├── app/                          # Backend FastAPI
│   ├── main.py                   # Routes de l'API
│   ├── config.py                 # Configuration centralisée (.env)
│   ├── schemas.py                # Modèles Pydantic
│   ├── model.py                  # Chargement et inférence du modèle CV
│   ├── nutrition.py              # Intégration API Edamam + cache
│   ├── llm.py                    # Génération des conseils (Groq)
│   ├── rag.py                    # Récupération vectorielle (ChromaDB)
│   ├── database.py                # Connexion SQLAlchemy
│   ├── db_models.py               # Modèles ORM (User, FoodClass, Meal)
│   └── crud.py                    # Opérations CRUD
├── food-frontend/                # Frontend Next.js
│   └── app/
│       ├── page.js                # Page d'accueil (upload + résultat)
│       └── dashboard/page.js      # Tableau de bord (historique + graphiques)
├── knowledge_base/                # Corpus RAG (recommandations nutritionnelles)
├── food/meta/                     # Métadonnées du dataset Food-101 (classes, splits)
├── tests/                         # Tests Pytest
├── checkpoints_food_resnet50_*.pth  # Poids du modèle entraîné
├── food_nutrition_db.json         # Cache nutritionnel (101 classes)
├── populate_db.py                 # Script de peuplement PostgreSQL
├── Project_stage.ipynb            # Notebook d'entraînement du modèle CV
├── Dockerfile / Dockerfile.dev    # Images backend (prod / dev)
├── docker-compose.yml / .dev.yml  # Orchestration (prod / dev avec auto-reload)
└── requirements.txt
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16 (ou via Docker)
- Un compte [Edamam](https://developer.edamam.com/) (Food Database API + Nutrition Analysis API)
- Un compte [Groq](https://console.groq.com/) (LLM)

### 1. Clone the Repository
```bash
git clone https://github.com/sarragafsi11/NutriVision.git
cd NutriVision
```

### 2. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies
```bash
cd food-frontend
npm install
cd ..
```

### 4. Set Up Environment Variables
Voir la section [Environment Setup](#-environment-setup) ci-dessous.

### 5. Set Up the Database
```bash
psql -U postgres -c "CREATE DATABASE food_recognition_db;"
python populate_db.py
```

### 6. Start the Backend
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 7. Start the Frontend
```bash
cd food-frontend
npm run dev
```

L'application est disponible sur :
- **Frontend** : http://localhost:3000
- **API Base URL** : http://127.0.0.1:8000
- **Documentation interactive (Swagger)** : http://127.0.0.1:8000/docs

## 🔧 Environment Setup

Créez un fichier `.env` à la racine du projet :

```bash
# Modèle
CHECKPOINT_PATH=checkpoints_food_resnet50_final.pth
CLASSES_PATH=food/meta/meta/classes.txt
NUTRITION_DB_PATH=food_nutrition_db.json

# Edamam — Nutrition Analysis API
EDAMAM_APP_ID=your-app-id
EDAMAM_APP_KEY=your-app-key

# Edamam — Food Database API (application séparée)
EDAMAM_FOOD_DB_APP_ID=your-food-db-app-id
EDAMAM_FOOD_DB_APP_KEY=your-food-db-app-key

# Groq (LLM)
GROQ_API_KEY=your-groq-api-key

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=food_recognition_db
DB_USER=postgres
DB_PASSWORD=your-postgres-password
```

Et dans `food-frontend/.env.local` :
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

| Variable | Description |
|---|---|
| `CHECKPOINT_PATH` | Poids du modèle CV entraîné |
| `EDAMAM_*` | Identifiants API nutrition (deux applications distinctes requises) |
| `GROQ_API_KEY` | Clé API pour l'inférence LLM |
| `DB_*` | Connexion PostgreSQL |
| `NEXT_PUBLIC_API_URL` | URL du backend, utilisée par le frontend |

## 📚 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Statut de l'API |
| POST | `/predict-image` | Upload d'une image → prédiction CV, nutrition, conseil LLM/RAG |
| GET | `/meals` | Historique des repas d'un utilisateur |
| POST | `/meals/{meal_id}/correct` | Correction manuelle de la classe prédite |
| GET | `/classes` | Liste des 101 classes reconnues |

### RAG Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/rag/guidelines?query=...` | Route de démonstration : montre les passages récupérés par le RAG pour une requête donnée |

Documentation interactive complète (Swagger UI) : `http://127.0.0.1:8000/docs`

## 📊 Model Performance

Modèle : ResNet50, fine-tuné en 3 phases sur le dataset Food-101 (101 classes, 101 000 images).

| Phase | Description | Val Accuracy (Top-1) | Top-5 Accuracy |
|---|---|---|---|
| Phase 1 | Tête seule (transfer learning) | 76.00% | — |
| Phase 2 | Fine-tuning layer3/4 | 82.52% | 95.46% |
| Phase 3 | + Dropout + layer2 | **84.57%** | **96.53%** |

Détails complets de l'entraînement et de l'évaluation (matrice de confusion, courbes d'apprentissage, exemples qualitatifs) disponibles dans `Project_stage.ipynb` et les fichiers `report_*.png`.

## 🧠 RAG System

Le système combine deux collections vectorielles distinctes (ChromaDB) :

1. **`nutrition_guidelines`** — corpus statique de recommandations nutritionnelles générales, indexé une fois au démarrage. Utilisé pour ancrer les conseils du LLM sur du contenu vérifiable plutôt que sur une génération libre.
2. **`user_meals`** — index dynamique, mis à jour à chaque nouveau repas analysé, permettant de retrouver les repas passés sémantiquement proches du repas actuel (pas seulement les plus récents).

Les résultats des deux recherches sont injectés dans le prompt envoyé au LLM, avec instruction explicite de s'appuyer dessus plutôt que d'halluciner du contenu générique.

## 🐳 Docker

### Production
```bash
docker compose up --build
```

### Development (auto-reload sur modification du code)
```bash
docker compose -f docker-compose.dev.yml up --build
```

Les deux configurations orchestrent trois services : `db` (PostgreSQL), `backend` (FastAPI), `frontend` (Next.js).

## ✅ Testing

```bash
pytest tests/ -v
```

Couvre : disponibilité de l'API, rejet des fichiers non-image, pipeline de prédiction complet, historique des repas, récupération RAG, validation de la correction manuelle.

## ⚠️ Limitations & Future Work

- Précision du modèle CV : 84.57% Top-1 → une partie des prédictions nécessite une correction manuelle
- Dépendance à des API tierces (Edamam, Groq), soumises à des limites de débit
- Pas d'authentification multi-utilisateurs à ce stade (MVP avec utilisateur unique)
- Corpus de connaissances RAG volontairement restreint pour ce projet
- Détection limitée à un seul aliment par image (pas de segmentation multi-plats)

Pistes d'amélioration : authentification complète, détection multi-aliments, extension du corpus RAG, ré-entraînement périodique du modèle à partir des corrections manuelles accumulées.

## 📄 License

Projet réalisé dans le cadre d'un stage d'été Data Science / Intelligence Artificielle.

---

Built with ❤️ using PyTorch, FastAPI, Next.js and Groq.
