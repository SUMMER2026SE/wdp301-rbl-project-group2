"""Recommendation router — serves custom ML model recommendations."""
import os

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from services.recommender import get_recommender

router = APIRouter()


class RecipeItem(BaseModel):
    name: str
    quantity: Optional[str] = None


class ProductInput(BaseModel):
    _id: str
    name: str
    description: Optional[str] = ""
    category: Optional[str] = ""
    tags: List[str] = Field(default_factory=list)
    health_tags: List[str] = Field(default_factory=list)
    recipe: List[RecipeItem] = Field(default_factory=list)
    price: Optional[float] = 0
    rating: Optional[float] = 0


class Preferences(BaseModel):
    dietary: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    health_goals: List[str] = Field(default_factory=list)
    healthGoals: List[str] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    user_id: str
    products: List[Dict[str, Any]]
    preferences: Preferences
    n: int = 6


class RecommendResult(BaseModel):
    productId: str
    reason: str
    healthScore: int


@router.post("", response_model=List[RecommendResult])
async def get_recommendations(req: RecommendRequest):
    """
    Get personalized food recommendations using the custom ML model.
    - Collaborative Filtering (LightFM BPR) if the user has order history
    - Content-Based Filtering as fallback
    - Guaranteed allergen-free health filter applied before ranking
    """
    try:
        recommender = get_recommender()
        results = recommender.recommend(
            user_id=req.user_id,
            products=req.products,
            preferences=req.preferences.dict(),
            n=req.n,
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrain")
async def trigger_retrain(x_ai_retrain_token: Optional[str] = Header(default=None)):
    """
    Trigger model retraining from MongoDB data (async background task).
    Should be called by the BE after significant new order data arrives.
    """
    retrain_token = os.getenv("AI_RETRAIN_TOKEN", "").strip()
    if retrain_token and x_ai_retrain_token != retrain_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid retrain token",
        )

    import asyncio
    from services.trainer import train

    asyncio.get_event_loop().run_in_executor(None, train)
    return {"message": "Retraining started in background"}
