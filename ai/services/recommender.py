"""
Recommendation Engine - Custom ML Model for FOA
Uses Collaborative Filtering (LightFM) + Content-Based Filtering
"""

import os
import json
import numpy as np
import joblib
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

MODEL_PATH = Path(__file__).parent.parent / "models" / "recommender.pkl"
META_PATH = Path(__file__).parent.parent / "models" / "recommender_meta.json"


class FOARecommender:
    """
    Hybrid Recommender combining:
    1. Collaborative Filtering (LightFM) — learns from order history
    2. Content-Based Filtering — matches product tags/ingredients to user preferences
    3. Health Filter — removes allergen-conflicting products (100% rule-based)
    """

    def __init__(self):
        self.model = None
        self.user_id_map: Dict[str, int] = {}
        self.product_id_map: Dict[str, int] = {}
        self.product_id_reverse: Dict[int, str] = {}
        self.products_meta: List[Dict] = []
        self.is_trained = False
        self._try_load()

    def _try_load(self):
        """Load pre-trained model from disk if available."""
        if MODEL_PATH.exists() and META_PATH.exists():
            try:
                data = joblib.load(MODEL_PATH)
                self.model = data["model"]
                self.user_id_map = data["user_id_map"]
                self.product_id_map = data["product_id_map"]
                self.product_id_reverse = {v: k for k, v in self.product_id_map.items()}
                self.products_meta = data["products_meta"]
                self.is_trained = True
                print("[Recommender] Loaded pre-trained model from disk.")
            except Exception as e:
                print(f"[Recommender] Failed to load model: {e}. Will use fallback.")
        else:
            print("[Recommender] No pre-trained model found. Using content-based fallback.")

    def _normalize(self, s: str) -> str:
        return s.lower().strip()

    def _fuzzy_match(self, a: str, b: str) -> bool:
        na, nb = self._normalize(a), self._normalize(b)
        return na in nb or nb in na

    def _health_filter(
        self,
        products: List[Dict],
        preferences: Dict,
    ) -> List[Dict]:
        """Remove products conflicting with allergies, diet, health goals (aligned with BE healthFilter)."""
        allergies = preferences.get("allergies", [])
        dietaries = preferences.get("dietary", [])
        health_goals = preferences.get("healthGoals") or preferences.get("health_goals", [])

        forbidden = set([self._normalize(a) for a in allergies])

        DIETARY_CONFLICT_MAP = {
            'vegetarian': ['bò', 'gà', 'lợn', 'heo', 'cá', 'tôm', 'mực', 'thịt', 'cua', 'ốc'],
            'chay': ['bò', 'gà', 'lợn', 'heo', 'cá', 'tôm', 'mực', 'thịt', 'cua', 'ốc'],
            'vegan': [
                'bò', 'gà', 'lợn', 'heo', 'cá', 'tôm', 'mực', 'thịt', 'cua', 'ốc',
                'trứng', 'phô mai', 'sữa bò', 'sữa đặc', 'sữa tươi', 'kem béo', 'bơ sữa',
                'whipping cream', 'yogurt', 'sữa chua',
            ],
            'keto': [
                'cơm', 'bún', 'phở', 'mì', 'mì gạo', 'mì gói', 'bánh mì', 'bánh gạo', 'đường', 'ngọt', 'trái cây',
                'khoai', 'khoai tây', 'bột', 'bột mì', 'trân châu',
            ],
            'eat clean': ['chiên', 'nướng', 'rán', 'đường', 'ngọt', 'béo', 'mỡ', 'xúc xích', 'lạp xưởng'],
            'low carb': [
                'cơm', 'bún', 'mì', 'mì gạo', 'bánh mì', 'bánh gạo', 'đường', 'ngọt', 'khoai', 'khoai tây', 'bột', 'trân châu',
            ],
        }

        HEALTH_GOAL_CONFLICT_MAP = {
            'giảm cân': ['đường', 'sữa đặc', 'trân châu', 'kem béo', 'phô mai', 'nước cốt dừa', 'chiên', 'rán'],
            'tiểu đường': ['đường', 'sữa đặc', 'nước đường', 'trân châu', 'ngọt'],
            'ít đường': ['đường', 'sữa đặc', 'nước đường', 'trân châu', 'ngọt'],
            'mỡ máu': ['chiên', 'rán', 'dầu mỡ', 'da gà', 'nội tạng', 'mỡ bò', 'mỡ heo', 'bơ béo'],
        }

        for diet in dietaries:
            diet_norm = self._normalize(diet.replace("_", " "))
            for k, v in DIETARY_CONFLICT_MAP.items():
                if k in diet_norm:
                    forbidden.update([self._normalize(word) for word in v])

        for goal in health_goals:
            gn = self._normalize(goal)
            for k, v in HEALTH_GOAL_CONFLICT_MAP.items():
                if k in gn:
                    forbidden.update([self._normalize(word) for word in v])

        if not forbidden:
            return products

        safe = []
        for p in products:
            recipe = p.get("recipe", [])
            ingredients = [self._normalize(r.get("name", "")) for r in recipe]
            p_name = self._normalize(p.get("name", ""))
            tags = [self._normalize(t) for t in (p.get("tags") or [])]
            htags = [self._normalize(t) for t in (p.get("health_tags") or [])]
            keywords = ingredients + [p_name] + tags + htags

            has_conflict = False
            for f in forbidden:
                if any(f in k or k in f for k in keywords):
                    has_conflict = True
                    break

            if not has_conflict:
                safe.append(p)

        return safe

    def _content_score(self, product: Dict, preferences: Dict) -> float:
        """Score product by content similarity to user preferences."""
        score = 0.0
        health_goals = preferences.get("healthGoals") or preferences.get("health_goals", [])
        dietary = preferences.get("dietary", [])

        tags = product.get("tags", []) + product.get("health_tags", [])
        for goal in health_goals:
            if any(self._fuzzy_match(goal, t) for t in tags):
                score += 1.5

        for diet in dietary:
            if any(self._fuzzy_match(diet, t) for t in tags):
                score += 1.0

        # Rating boost  (0–10 scale normalized to 0–2 bonus)
        rating = float(product.get("rating", 0))
        score += (rating / 5.0)

        return score

    def recommend(
        self,
        user_id: str,
        products: List[Dict],
        preferences: Dict,
        n: int = 6,
    ) -> List[Dict]:
        """
        Main recommendation function.
        Returns up to n products with reasons and health scores.
        """
        # Step 1: Health filter (allergen & dietary removal)
        safe_products = self._health_filter(products, preferences)

        if not safe_products:
            return []

        # Step 2: Collaborative Filtering (if model trained and user known)
        if self.is_trained and user_id in self.user_id_map:
            recs = self._cf_recommend(user_id, safe_products, n)
            if recs:
                return recs

        # Step 3: Content-Based Fallback
        return self._content_recommend(safe_products, preferences, n)

    def _cf_recommend(self, user_id: str, products: List[Dict], n: int) -> List[Dict]:
        """Collaborative filtering using the trained LightFM model."""
        try:
            from lightfm import LightFM
            uid = self.user_id_map[user_id]
            n_items = len(self.product_id_map)

            scores = self.model.predict(uid, np.arange(n_items))

            # Map back to product_ids and filter to safe products
            safe_ids = {p["_id"] for p in products}
            ranked = sorted(
                [
                    (self.product_id_reverse[i], scores[i])
                    for i in range(n_items)
                    if self.product_id_reverse.get(i) in safe_ids
                ],
                key=lambda x: x[1],
                reverse=True,
            )[:n]

            result = []
            for pid, score in ranked:
                product = next((p for p in products if p["_id"] == pid), None)
                if product:
                    health_score = min(10, max(1, int(score * 10)))
                    result.append({
                        "productId": pid,
                        "reason": self._generate_reason(product),
                        "healthScore": health_score,
                    })
            return result
        except Exception as e:
            print(f"[CF Recommend] Error: {e}")
            return []

    def _content_recommend(self, products: List[Dict], preferences: Dict, n: int) -> List[Dict]:
        """Content-based recommendation fallback."""
        scored = [(p, self._content_score(p, preferences)) for p in products]
        scored.sort(key=lambda x: x[1], reverse=True)

        result = []
        for product, score in scored[:n]:
            health_score = min(10, max(1, int(score * 2)))
            result.append({
                "productId": product["_id"],
                "reason": self._generate_reason(product),
                "healthScore": health_score,
            })
        return result

    def _generate_reason(self, product: Dict) -> str:
        """Generate a Vietnamese reason string for the recommendation."""
        tags = product.get("tags", [])
        health_tags = product.get("health_tags", [])
        rating = product.get("rating", 0)

        if health_tags:
            return f"Phù hợp với hồ sơ sức khỏe của bạn — {', '.join(health_tags[:2])}"
        if tags:
            return f"Món phổ biến trong danh mục {tags[0]}"
        if rating >= 4:
            return f"Được đánh giá {rating:.1f}/5 bởi thực khách"
        return "Gợi ý từ hệ thống AI của FOA"


# Singleton instance
_recommender: Optional[FOARecommender] = None


def get_recommender() -> FOARecommender:
    global _recommender
    if _recommender is None:
        _recommender = FOARecommender()
    return _recommender
