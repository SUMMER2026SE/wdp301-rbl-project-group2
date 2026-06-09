import type { Product } from "@/types/product";

export const getProductHealthStatus = (product: Product) => product.healthRisk?.level ?? "safe";

export const getProductAllergenInfo = (product: Product) => {
  const risk = product.healthRisk;
  if (!risk || risk.level === "safe") return undefined;
  return risk.matchedIngredients.length > 0
    ? risk.matchedIngredients.join(", ")
    : risk.matchedAllergens.join(", ");
};
