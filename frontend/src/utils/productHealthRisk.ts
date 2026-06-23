import type { Product } from "@/types/product";

export const getProductHealthStatus = (product: Product) => product.healthRisk?.level ?? "safe";

export const getProductAllergenInfo = (product: Product) => {
  const risk = product.healthRisk;
  if (!risk || risk.level === "safe") return undefined;
  const matchedIngredients = Array.isArray(risk.matchedIngredients) ? risk.matchedIngredients.filter(Boolean) : [];
  const matchedAllergens = Array.isArray(risk.matchedAllergens) ? risk.matchedAllergens.filter(Boolean) : [];
  return matchedIngredients.length > 0
    ? matchedIngredients.join(", ")
    : matchedAllergens.join(", ");
};
