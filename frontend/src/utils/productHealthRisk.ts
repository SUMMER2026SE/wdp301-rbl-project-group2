import type { Product } from "@/types/product";
import type { HealthStatus } from "@/components/shared/FoodCard";

type ProductHealthRisk = {
  level?: HealthStatus;
  matchedIngredients?: string[];
  matchedAllergens?: string[];
};

type ProductWithHealthRisk = Product & {
  healthRisk?: ProductHealthRisk;
};

export const getProductHealthStatus = (product: ProductWithHealthRisk): HealthStatus => product.healthRisk?.level ?? "safe";

export const getProductAllergenInfo = (product: ProductWithHealthRisk) => {
  const risk = product.healthRisk;
  if (!risk || risk.level === "safe") return undefined;
  const matchedIngredients = risk.matchedIngredients ?? [];
  const matchedAllergens = risk.matchedAllergens ?? [];
  return matchedIngredients.length > 0 ? matchedIngredients.join(", ") : matchedAllergens.join(", ");
};
