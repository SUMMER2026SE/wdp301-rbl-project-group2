"""
FOA - Custom AI Microservice
FastAPI server exposing custom ML recommendations and Groq-powered GenAI endpoints.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import recommendation, chat, health

app = FastAPI(
    title="FOA AI Microservice",
    description="Custom ML/DL AI Service for Food Order App",
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("AI_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(recommendation.router, prefix="/recommend", tags=["Recommendation"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
