"""
Training pipeline for FOA ML Recommender.
Run this script to train / retrain the model from MongoDB data.

Usage:
    python -m services.trainer
"""

import os
import json
import numpy as np
import joblib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "mongodb://localhost:27017/foa_db")
MODEL_PATH = Path(__file__).parent.parent / "models" / "recommender.pkl"
META_PATH = Path(__file__).parent.parent / "models" / "recommender_meta.json"

MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)


def fetch_training_data():
    """Fetch orders and user profiles from MongoDB."""
    from pymongo import MongoClient
    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    print("[Trainer] Fetching orders from MongoDB...")
    # Only completed orders represent true positive preference signals
    orders = list(db.orders.find({"status": "completed"}, {
        "cusId": 1, "items.productId": 1, "items.quantity": 1
    }))

    print("[Trainer] Fetching users from MongoDB...")
    users = list(db.users.find({}, {
        "_id": 1, "preferences": 1, "email": 1
    }))

    print("[Trainer] Fetching products from MongoDB...")
    products = list(db.products.find({"isAvailable": True}, {
        "_id": 1, "name": 1, "category": 1, "tags": 1, "healthTags": 1,
        "recipe": 1, "price": 1, "rating": 1, "description": 1
    }))

    ingredient_ids = {
        recipe_item.get("ingredientId")
        for product in products
        for recipe_item in product.get("recipe", [])
        if recipe_item.get("ingredientId")
    }
    ingredients = list(db.ingredients.find({"_id": {"$in": list(ingredient_ids)}}, {
        "_id": 1, "name": 1, "allergenTags": 1
    })) if ingredient_ids else []
    ingredient_map = {str(ingredient["_id"]): ingredient for ingredient in ingredients}

    for product in products:
        enriched_recipe = []
        for recipe_item in product.get("recipe", []):
            ingredient = ingredient_map.get(str(recipe_item.get("ingredientId")))
            enriched_recipe.append({
                "name": ingredient.get("name", "") if ingredient else "",
                "quantity": recipe_item.get("quantity"),
                "unit": recipe_item.get("unit"),
                "allergenTags": ingredient.get("allergenTags", []) if ingredient else [],
            })
        product["recipe"] = enriched_recipe

    client.close()
    return orders, users, products


def build_interaction_matrix(
    orders: List[Dict],
    user_id_map: Dict,
    product_id_map: Dict
):
    """Build a sparse user-item interaction (purchase) matrix."""
    from scipy.sparse import coo_matrix

    rows, cols, data = [], [], []

    for order in orders:
        uid_raw = str(order.get("cusId", ""))
        if uid_raw not in user_id_map:
            continue
        uid = user_id_map[uid_raw]

        for item in order.get("items", []):
            pid_raw = str(item.get("productId", ""))
            if pid_raw not in product_id_map:
                continue
            pid = product_id_map[pid_raw]
            quantity = item.get("quantity", 1)

            rows.append(uid)
            cols.append(pid)
            data.append(float(quantity))  # use quantity as implicit feedback

    n_users = len(user_id_map)
    n_items = len(product_id_map)

    return coo_matrix((data, (rows, cols)), shape=(n_users, n_items))


def train():
    """Main training function."""
    print("[Trainer] Starting training pipeline...")

    try:
        orders, users, products = fetch_training_data()
    except Exception as e:
        print(f"[Trainer] ❌ Failed to connect to MongoDB: {e}")
        print("[Trainer] Please make sure MongoDB is reachable and MONGODB_URI is correct in .env")
        return

    if not orders:
        print("[Trainer] ⚠️  No completed orders found. Need at least some order data to train CF model.")
        print("[Trainer] The content-based fallback will be used until enough data exists.")
        return

    print(f"[Trainer] Found: {len(orders)} orders, {len(users)} users, {len(products)} products")

    # Build ID mappings
    user_id_map = {str(u["_id"]): i for i, u in enumerate(users)}
    product_id_map = {str(p["_id"]): i for i, p in enumerate(products)}

    products_meta = [
        {
            "_id": str(p["_id"]),
            "name": p.get("name", ""),
            "category": p.get("category", ""),
            "tags": p.get("tags", []),
            "health_tags": p.get("healthTags", []),
            "recipe": p.get("recipe", []),
            "price": p.get("price", 0),
            "rating": p.get("rating", 0),
            "description": p.get("description", ""),
        }
        for p in products
    ]

    # Build interaction matrix
    interaction_matrix = build_interaction_matrix(orders, user_id_map, product_id_map)
    print(f"[Trainer] Interaction matrix: {interaction_matrix.shape}, {interaction_matrix.nnz} interactions")

    # Train LightFM model (Bayesian Personalised Ranking — best for implicit feedback)
    try:
        from lightfm import LightFM
        from lightfm.evaluation import precision_at_k

        model = LightFM(
            no_components=64,       # Latent dimension size
            loss="bpr",             # Bayesian Personalised Ranking for implicit feedback
            learning_rate=0.05,
            item_alpha=1e-6,
            user_alpha=1e-6,
            random_state=42,
        )

        print("[Trainer] Training LightFM BPR model (50 epochs)...")
        from lightfm.data import Dataset

        # Train for 50 epochs (good balance of speed and accuracy)
        model.fit(
            interaction_matrix,
            epochs=50,
            num_threads=4,
            verbose=True,
        )

        # Evaluate precision@k
        try:
            prec = precision_at_k(model, interaction_matrix, k=6).mean()
            print(f"[Trainer] Precision@6 on training set: {prec:.4f}")
        except Exception:
            pass

        # Save model
        joblib.dump({
            "model": model,
            "user_id_map": user_id_map,
            "product_id_map": product_id_map,
            "products_meta": products_meta,
        }, MODEL_PATH)

        # Save metadata
        meta = {
            "trained_at": datetime.utcnow().isoformat(),
            "n_users": len(user_id_map),
            "n_products": len(product_id_map),
            "n_interactions": int(interaction_matrix.nnz),
            "model_type": "LightFM_BPR",
            "no_components": 64,
            "epochs": 50,
        }
        META_PATH.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

        print(f"[Trainer] ✅ Model saved to: {MODEL_PATH}")
        print(f"[Trainer] Metadata saved to: {META_PATH}")

    except ImportError:
        print("[Trainer] ❌ lightfm not installed. Run: pip install lightfm")


if __name__ == "__main__":
    train()
