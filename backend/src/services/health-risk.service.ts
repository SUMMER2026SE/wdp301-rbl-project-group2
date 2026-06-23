import { ALLERGEN_CATALOG, sanitizeAllergenTags } from '@/constants/allergen-catalog';

export type HealthRiskLevel = 'safe' | 'warning' | 'danger';

export type HealthRiskResult = {
  level: HealthRiskLevel;
  matchedAllergens: string[];
  matchedIngredients: string[];
  message: string;
};

const normalize = (value: string) => value.toLowerCase().trim();

const getRecipeName = (item: any): string => {
  if (item?.name) return String(item.name);
  if (item?.ingredientId && typeof item.ingredientId === 'object' && item.ingredientId.name) {
    return String(item.ingredientId.name);
  }
  return '';
};

const getRecipeAllergenTags = (item: any): string[] => {
  const direct = sanitizeAllergenTags(item?.allergenTags ?? []);
  const fromIngredient = sanitizeAllergenTags(item?.ingredientId?.allergenTags ?? []);
  return [...new Set([...direct, ...fromIngredient])];
};

export const evaluateProductHealthRisk = (product: any, preferences: any): HealthRiskResult => {
  const userAllergies = sanitizeAllergenTags(preferences?.allergies ?? []);
  const matchedAllergens = new Set<string>();
  const matchedIngredients = new Set<string>();

  const recipe = Array.isArray(product?.recipe) ? product.recipe : [];
  for (const item of recipe) {
    const ingredientName = getRecipeName(item);
    const tags = getRecipeAllergenTags(item);
    const tagHits = tags.filter((tag) => userAllergies.includes(tag));

    for (const tag of tagHits) {
      matchedAllergens.add(tag);
      if (ingredientName) matchedIngredients.add(ingredientName);
    }
  }

  const allergenLabels = [...matchedAllergens].map((tag) => {
    const item = ALLERGEN_CATALOG.find((entry) => entry.id === normalize(tag));
    return item?.label ?? tag;
  });

  if (matchedIngredients.size > 0 || matchedAllergens.size > 0) {
    const ingredientText = [...matchedIngredients].join(', ');
    const allergenText = allergenLabels.join(', ');
    return {
      level: 'danger',
      matchedAllergens: [...matchedAllergens],
      matchedIngredients: [...matchedIngredients],
      message: ingredientText
        ? `Món này có ${ingredientText}, có thể không phù hợp với dị ứng ${allergenText} của bạn.`
        : `Món này có thể không phù hợp với dị ứng ${allergenText} của bạn.`,
    };
  }

  return {
    level: 'safe',
    matchedAllergens: [],
    matchedIngredients: [],
    message: 'Món này không phát hiện xung đột với hồ sơ dị ứng hiện tại.',
  };
};

export const filterSafeProductsByHealthRisk = (products: any[], preferences: any) =>
  products.filter((product) => evaluateProductHealthRisk(product, preferences).level !== 'danger');
