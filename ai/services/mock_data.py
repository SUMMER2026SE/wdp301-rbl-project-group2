import os
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
import bson

from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "mongodb://localhost:27017/foa_db")

DIETARY_CONFLICT_MAP = {
    'vegetarian': ['bò', 'gà', 'lợn', 'heo', 'cá', 'tôm', 'mực', 'thịt', 'cua', 'ốc'],
    'keto': ['cơm', 'bún', 'phở', 'bánh mì', 'đường', 'ngọt', 'trái cây', 'khoai', 'bột'],
    'eat clean': ['chiên', 'nướng', 'rán', 'đường', 'ngọt', 'béo', 'mỡ', 'xúc xích', 'lạp xưởng'],
    'low carb': ['cơm', 'bún', 'bánh mì', 'đường', 'ngọt', 'khoai', 'bột'],
}

def normalize(s):
    import unicodedata
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower().strip()

def is_safe_for_diet(product, diet_key):
    forbidden = [normalize(w) for w in DIETARY_CONFLICT_MAP.get(diet_key, [])]
    recipe = product.get("recipe", [])
    ingredients = [normalize(r.get("name", "")) for r in recipe]
    p_name = normalize(product.get("name", ""))
    keywords = ingredients + [p_name]

    for f in forbidden:
        if any(f in k or k in f for k in keywords):
            return False
    return True

def generate_mock_data():
    if os.getenv("FOA_ALLOW_MOCK_DATA") != "true":
        print("[Mock] Refusing to write mock data. Set FOA_ALLOW_MOCK_DATA=true for local/dev databases only.")
        return

    client = MongoClient(MONGO_URI)
    db = client.get_default_database()

    print("[Mock] Fetching products...")
    products = list(db.products.find({"isAvailable": True}))
    if not products:
        print("No products found in DB. Cannot generate mock data.")
        return

    print(f"[Mock] Found {len(products)} products.")

    # Categorize safe products
    safe_products_by_diet = {}
    for diet in DIETARY_CONFLICT_MAP.keys():
        safe_products_by_diet[diet] = [p for p in products if is_safe_for_diet(p, diet)]
        print(f"  - {diet}: {len(safe_products_by_diet[diet])} safe products")

    # Generate Users
    mock_users = []
    diet_types = list(DIETARY_CONFLICT_MAP.keys())

    print("[Mock] Generating 100 mock users...")
    for i in range(100):
        # assign 1 or 2 dietary prefs
        num_diets = random.choices([1, 2], weights=[0.8, 0.2])[0]
        user_diets = random.sample(diet_types, num_diets)

        user_id = bson.ObjectId()
        user = {
            "_id": user_id,
            "username": f"mock_user_{i}",
            "email": f"mock_user_{i}@foodiedash.vn",
            "phone": f"09{random.randint(10000000, 99999999)}",
            "password_hash": "mocked", # won't be able to log in anyway, just for AI
            "role": "CUSTOMER",
            "isActive": True,
            "preferences": {
                "allergies": [],
                "dietary": user_diets,
                "health_goals": []
            },
            "is_mock": True
        }
        mock_users.append(user)

    if mock_users:
        # Clear old mocks to avoid endless bloat
        db.users.delete_many({"is_mock": True})
        db.users.insert_many(mock_users)

    # Generate Orders
    print("[Mock] Generating mock orders...")
    mock_orders = []
    for user in mock_users:
        user_diets = user["preferences"]["dietary"]

        # Find products safe for ALL of user's diets
        safe_pool = products
        for d in user_diets:
            safe_pool = [p for p in safe_pool if p in safe_products_by_diet[d]]

        if not safe_pool:
            continue

        num_orders = random.randint(3, 8)
        for _ in range(num_orders):
            num_items = random.randint(1, 4)
            order_items = random.sample(safe_pool, min(num_items, len(safe_pool)))

            items_payload = []
            for item in order_items:
                items_payload.append({
                    "product_id": item["_id"],
                    "quantity": random.randint(1, 2),
                    "price": item["price"]
                })

            order = {
                "_id": bson.ObjectId(),
                "user_id": user["_id"],
                "code": f"MOCK_{random.randint(10000, 99999)}",
                "items": items_payload,
                "total_price": sum(i["price"] * i["quantity"] for i in items_payload),
                "status": "completed",
                "payment": {"method": "COD", "status": "paid"},
                "createdAt": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                "is_mock": True
            }
            mock_orders.append(order)

    if mock_orders:
        db.orders.delete_many({"is_mock": True})
        db.orders.insert_many(mock_orders)

    print(f"[Mock] Successfully inserted {len(mock_users)} users and {len(mock_orders)} completed orders!")

if __name__ == "__main__":
    generate_mock_data()
