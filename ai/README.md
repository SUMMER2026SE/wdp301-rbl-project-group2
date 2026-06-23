# FOA AI Microservice

FastAPI service for FoodieDash health-aware recommendations, chat, order-note parsing, and safe-food explanations.

## Endpoints

```txt
GET  /health
POST /recommend
POST /recommend/retrain
POST /chat/message
POST /chat/parse-note
POST /chat/safe-food-insights
```

## Environment

Create `ai/.env` from `ai/.env.example` and set:

```env
MONGODB_URI=<same MongoDB database URI used by the backend>
AI_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
AI_RETRAIN_TOKEN=
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

`MONGODB_URI` is required for training the ML recommender. `GROQ_API_KEY` is required for chat, order-note parsing, and safe-food explanation endpoints.

## Run Locally

```powershell
cd ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Check service health:

```powershell
curl http://localhost:8001/health
```

Train or retrain the recommender:

```powershell
python -m services.trainer
```

The service can run without `lightfm`; it will use the content-based recommendation fallback. Install `lightfm` separately only if you need collaborative-filtering training and your Python environment supports it.

## Backend Connection

Set the backend env:

```env
AI_MICROSERVICE_URL=http://localhost:8001
```

If auto retrain is enabled, set the same `AI_RETRAIN_TOKEN` in both backend and AI env files.
