"""
GenAI service using Groq API (for production deployment).
Handles: chat responses, safe food insights, order note parsing.
"""

import os
import httpx
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


async def _call_groq(
    messages: List[Dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> str:
    """Call Groq API."""
    if not GROQ_API_KEY or GROQ_API_KEY == "placeholder":
        raise ValueError("No GROQ_API_KEY configured for production deployment")

    payload: Dict[str, Any] = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


# ─── Feature Functions ────────────────────────────────────────────────────────

async def get_chat_response(
    message: str,
    history: List[Dict],
    user_context: Optional[Dict] = None,
) -> str:
    """
    Generate a chat response using Groq.
    """
    context_snippet = ""
    if user_context:
        full_name = user_context.get("fullName", "bạn")
        preferences = user_context.get("preferences", {})
        safe_products = user_context.get("safeProducts", [])
        allergies_str = ", ".join(preferences.get("allergies", [])) or "Không có"
        dietary_str = ", ".join(preferences.get("dietary", [])) or "Không có"
        goals_str = ", ".join(preferences.get("healthGoals") or preferences.get("health_goals", [])) or "Không có"
        safe_products_str = "\n".join([f"- {p['name']}: {p.get('description', '')}" for p in safe_products[:5]])

        context_snippet = f"""
THÔNG TIN NGƯỜI DÙNG:
- Tên: {full_name}
- Dị ứng: {allergies_str}
- Chế độ ăn kiêng: {dietary_str}
- Mục tiêu sức khỏe: {goals_str}

DANH SÁCH MÓN ĂN AN TOÀN GỢI Ý:
{safe_products_str}
"""

    system_prompt = f"""Bạn là Chatbot hỗ trợ thông minh của FOA (Food Order App).
FOA là ứng dụng gọi món ăn tập trung vào sức khỏe người dùng.

QUY TẮC:
1. Nhận diện và chào người dùng bằng tên nếu có.
2. Dựa vào hồ sơ sức khỏe để tư vấn món ăn phù hợp.
3. Trả lời bằng Tiếng Việt, lịch sự và thân thiện.
4. Không bao giờ gợi ý món chứa thành phần người dùng bị dị ứng.
{context_snippet}"""

    # Build Groq-compatible message list
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        role = "assistant" if h.get("role") == "model" else "user"
        content = h.get("parts", [{}])[0].get("text", "") or h.get("content", "")
        formatted_messages.append({"role": role, "content": content})
    formatted_messages.append({"role": "user", "content": message})

    return await _call_groq(formatted_messages, temperature=0.7, max_tokens=1024)


async def parse_order_note(raw_note: str) -> List[str]:
    """
    Parse a customer order note into structured staff instructions using Groq.
    """
    if not raw_note.strip():
        return []

    prompt = f"""Bạn là trợ lý xử lý đơn cho cửa hàng đồ ăn.

Phân tích ghi chú của khách và chuyển thành danh sách ngắn gọn để nhân viên bếp đọc nhanh.

QUY TẮC:
1. "không X" hoặc "bỏ X" → "không X"
2. "thêm X" → "thêm X"
3. Mỗi ý là một phần tử. Chỉ trả về JSON hợp lệ:
{{"items": ["...", "..."]}}

Ghi chú khách: "{raw_note}"
"""

    try:
        text = await _call_groq(
            [{"role": "user", "content": prompt}],
            temperature=0.3,
            json_mode=True,
        )

        import json
        import re
        json_match = re.search(r'\{[\s\S]*\}', text)
        if not json_match:
            raise ValueError("No JSON in response")
        parsed = json.loads(json_match.group())
        items = parsed.get("items", [])
        return [str(i).strip() for i in items if i][:10]

    except Exception as e:
        print(f"[GenAI] parse_order_note error: {e}")
        return [raw_note.strip()]


async def get_safe_food_insights(
    safe_products: List[Dict],
    preferences: Dict,
) -> List[Dict]:
    """
    Generate AI explanation for why each safe product is suitable using Groq.
    """
    if not safe_products:
        return []

    product_list = [
        {"id": p["_id"], "name": p["name"], "ingredients": [r.get("name", "") for r in p.get("recipe", [])]}
        for p in safe_products[:20]
    ]

    prompt = f"""Bạn là chuyên gia dinh dưỡng. Giải thích TẠI SAO các món ăn dưới đây an toàn.

HỒ SƠ SỨC KHỎE:
- Dị ứng: {", ".join(preferences.get("allergies", [])) or "Không có"}
- Ăn kiêng: {", ".join(preferences.get("dietary", [])) or "Không có"}
- Mục tiêu: {", ".join(preferences.get("healthGoals") or preferences.get("health_goals", [])) or "Không có"}

DANH SÁCH MÓN AN TOÀN:
{[p["name"] for p in product_list]}

Giải thích ngắn (max 20 từ) cho mỗi món. Trả về JSON:
{{"insights": [{{"productId": "...", "aiReason": "..."}}]}}
"""

    try:
        text = await _call_groq(
            [{"role": "user", "content": prompt}],
            temperature=0.5,
            json_mode=True,
        )

        import json
        import re
        json_match = re.search(r'\{[\s\S]*\}', text)
        if not json_match:
            raise ValueError("No JSON found")
        parsed = json.loads(json_match.group())
        return parsed.get("insights", [])

    except Exception as e:
        print(f"[GenAI] safe_food_insights error: {e}")
        return [
            {"productId": p["_id"], "aiReason": "Món ăn an toàn, đã được sàng lọc phù hợp cho bạn."}
            for p in safe_products
        ]
