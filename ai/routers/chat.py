"""Chat, safe food insights, and order-note parsing via GenAI (Groq)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from services.genai import get_chat_response, parse_order_note, get_safe_food_insights

router = APIRouter()


class HistoryItem(BaseModel):
    role: str
    parts: Optional[List[Dict[str, str]]] = None
    content: Optional[str] = None


class UserContext(BaseModel):
    fullName: str
    preferences: Dict[str, List[str]] = Field(default_factory=dict)
    safeProducts: List[Dict[str, str]] = Field(default_factory=list)


class ChatRequest(BaseModel):
    message: str
    history: List[HistoryItem] = Field(default_factory=list)
    userContext: Optional[UserContext] = None


class ParseNoteRequest(BaseModel):
    note: str


class SafeFoodInsightRequest(BaseModel):
    products: List[Dict[str, Any]] = Field(default_factory=list)
    preferences: Dict[str, List[str]] = Field(default_factory=dict)


@router.post("/message")
async def chat(req: ChatRequest):
    """Respond to a user chat message using Groq API."""
    try:
        context_dict = req.userContext.dict() if req.userContext else None
        history_dicts = [h.dict() for h in req.history]
        response = await get_chat_response(req.message, history_dicts, context_dict)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-note")
async def parse_note(req: ParseNoteRequest):
    """Parse a customer order note into structured staff instructions."""
    try:
        items = await parse_order_note(req.note)
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/safe-food-insights")
async def safe_food_insights(req: SafeFoodInsightRequest):
    """Generate AI explanations for why safe products suit the user's health profile."""
    try:
        insights = await get_safe_food_insights(req.products, req.preferences)
        return {"insights": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
