"""Health check router."""
import os

from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def health():
    mongodb_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
    groq_api_key = os.getenv("GROQ_API_KEY")

    return {
        "status": "ok" if mongodb_uri else "degraded",
        "api_provider": "Groq",
        "mongodb_configured": bool(mongodb_uri),
        "groq_configured": bool(groq_api_key),
    }
