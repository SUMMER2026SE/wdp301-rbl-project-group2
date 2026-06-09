/**
 * FSS-40: checks the current product against the user's health preferences.
 * This is a customer-facing warning only; the backend still owns final safety logic.
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types/product';

export type AllergyLevel = 'safe' | 'warning' | 'danger';

export interface AllergyCheckResult {
  level: AllergyLevel;
  conflictIngredients: string[];
  warningMessage: string;
}

type RecipeItemWithAllergens = Product['recipe'][number] & {
  ingredientId?: {
    name?: string;
    allergenTags?: unknown[];
  } | string;
  allergenTags?: unknown[];
};

type ProductWithHealthRisk = Omit<Product, 'recipe'> & {
  recipe?: RecipeItemWithAllergens[];
  healthRisk?: {
    level?: AllergyLevel;
    matchedIngredients?: unknown[];
    matchedAllergens?: unknown[];
    message?: string;
  };
};

const EMPTY_PREFERENCES: string[] = [];

const normalize = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .trim();

const fuzzyMatch = (a: unknown, b: unknown): boolean => {
  const na = normalize(a);
  const nb = normalize(b);
  return Boolean(na && nb) && (nb.includes(na) || na.includes(nb));
};

const MEAT_INGREDIENTS = [
  'th\u1ecbt b\u00f2', 'th\u1ecbt heo', 'th\u1ecbt l\u1ee3n', 'th\u1ecbt g\u00e0', 'th\u1ecbt v\u1ecbt', 'th\u1ecbt d\u00ea',
  'b\u00f2', 'heo', 'l\u1ee3n', 'g\u00e0', 'v\u1ecbt', 'd\u00ea', 'tr\u00e2u', 'c\u1eebu',
  'x\u00e1 x\u00edu', 'bacon', 'th\u1ecbt xay', 'x\u00fac x\u00edch', 'gi\u0103m b\u00f4ng', 'ham',
  'l\u1ea1p x\u01b0\u1edfng', 'ch\u1ea3 l\u1ee5a', 'ch\u1ea3 gi\u00f2', 'b\u00f2 vi\u00ean', 'g\u00e2n b\u00f2', 'n\u1ea1m b\u00f2',
];

const SEAFOOD_INGREDIENTS = [
  't\u00f4m', 'cua', 'm\u1ef1c', 'ngh\u00eau', 's\u00f2', 'ng\u00eau', 'h\u1ea3i s\u1ea3n', 'c\u00e1',
  'c\u00e1 h\u1ed3i', 'c\u00e1 ng\u1eeb', 'c\u00e1 l\u00f3c', 'c\u00e1 thu', 's\u00f2 \u0111i\u1ec7p', 't\u00f4m h\u00f9m',
  't\u00f4m s\u00fa', 'surimi', 'ch\u1ea3 c\u00e1', 'm\u1eafm', 'm\u1eafm t\u00f4m', 'm\u1eafm ru\u1ed1c',
];

const VEGETARIAN_KEYWORDS = ['chay', 'vegan', 'vegetarian', 'thu\u1ea7n chay', '\u0103n chay'];
const PESCATARIAN_KEYWORDS = ['pescatarian', '\u0103n c\u00e1', 'no meat'];
const LOW_CARB_KEYWORDS = ['keto', 'low carb', 'low-carb', '\u00edt carb'];
const HIGH_CARB_INGREDIENTS = ['c\u01a1m', 'b\u00fan', 'm\u00ec', 'b\u00e1nh m\u00ec', 'khoai t\u00e2y', 'b\u00e1nh g\u1ea1o', 'b\u1ed9t m\u00ec', 'm\u00ec g\u1ea1o'];

const getRecipeName = (item: RecipeItemWithAllergens): string => {
  if (item.name?.trim()) return item.name.trim();
  if (typeof item.ingredientId === 'object') return item.ingredientId.name?.trim() ?? '';
  return '';
};

const productKeywords = (product: ProductWithHealthRisk): string[] => [
  product.name,
  product.description,
  ...((product.recipe ?? []).map(getRecipeName)),
  ...(product.tags ?? []),
  ...(product.healthTags ?? []),
].filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));

const findConflicts = (product: ProductWithHealthRisk, forbidden: string[]): string[] => {
  const found: string[] = [];

  for (const keyword of productKeywords(product)) {
    for (const forbiddenKeyword of forbidden) {
      if (fuzzyMatch(forbiddenKeyword, keyword) && !found.includes(keyword)) {
        found.push(keyword);
      }
    }
  }

  return found;
};

const isDietaryKeyword = (diet: unknown, keywords: string[]): boolean =>
  keywords.some((keyword) => fuzzyMatch(keyword, diet));

const toAllergenId = (value: unknown) => normalize(value).replace(/\s+/g, '_');

export function checkProductAllergies(
  product: ProductWithHealthRisk | null | undefined,
  userAllergies: unknown[],
  userDietary: unknown[] = [],
): AllergyCheckResult {
  if (!product) return { level: 'safe', conflictIngredients: [], warningMessage: '' };

  const healthRisk = product.healthRisk;
  const serverRiskLevel = healthRisk?.level;
  if (serverRiskLevel && serverRiskLevel !== 'safe') {
    const matchedIngredients = Array.isArray(healthRisk.matchedIngredients)
      ? healthRisk.matchedIngredients.map(String).filter(Boolean)
      : [];
    const matchedAllergens = Array.isArray(healthRisk.matchedAllergens)
      ? healthRisk.matchedAllergens.map(String).filter(Boolean)
      : [];

    return {
      level: serverRiskLevel,
      conflictIngredients: matchedIngredients.length ? matchedIngredients : matchedAllergens,
      warningMessage: healthRisk.message ?? '',
    };
  }

  const allergyIds = new Set(userAllergies.map(toAllergenId).filter(Boolean));
  if (allergyIds.size > 0) {
    const conflictIngredients = (product.recipe ?? [])
      .filter((item) => {
        const directTags = item.allergenTags ?? [];
        const ingredientTags = typeof item.ingredientId === 'object' ? item.ingredientId.allergenTags ?? [] : [];
        return [...directTags, ...ingredientTags].some((tag) => allergyIds.has(toAllergenId(tag)));
      })
      .map(getRecipeName)
      .filter((name): name is string => Boolean(name));

    if (conflictIngredients.length > 0) {
      const uniqueConflicts = [...new Set(conflictIngredients)];
      return {
        level: 'danger',
        conflictIngredients: uniqueConflicts,
        warningMessage: `M\u00f3n n\u00e0y c\u00f3 ${uniqueConflicts.join(', ')}, c\u00f3 th\u1ec3 kh\u00f4ng ph\u00f9 h\u1ee3p v\u1edbi h\u1ed3 s\u01a1 d\u1ecb \u1ee9ng c\u1ee7a b\u1ea1n.`,
      };
    }
  }

  if (userDietary.length > 0) {
    const isVegetarian = userDietary.some((diet) => isDietaryKeyword(diet, VEGETARIAN_KEYWORDS));
    if (isVegetarian) {
      const conflicts = findConflicts(product, [...MEAT_INGREDIENTS, ...SEAFOOD_INGREDIENTS]);
      if (conflicts.length > 0) {
        return {
          level: 'warning',
          conflictIngredients: conflicts,
          warningMessage: `B\u1ea1n \u0111ang \u0103n chay, m\u00f3n n\u00e0y c\u00f3 th\u1ec3 ch\u1ee9a: ${conflicts.join(', ')}`,
        };
      }
    }

    const isPescatarian = userDietary.some((diet) => isDietaryKeyword(diet, PESCATARIAN_KEYWORDS));
    if (isPescatarian && !isVegetarian) {
      const conflicts = findConflicts(product, MEAT_INGREDIENTS);
      if (conflicts.length > 0) {
        return {
          level: 'warning',
          conflictIngredients: conflicts,
          warningMessage: `B\u1ea1n kh\u00f4ng \u0103n th\u1ecbt \u0111\u1ecf, m\u00f3n n\u00e0y c\u00f3 th\u1ec3 ch\u1ee9a: ${conflicts.join(', ')}`,
        };
      }
    }

    const isLowCarb = userDietary.some((diet) => isDietaryKeyword(diet, LOW_CARB_KEYWORDS));
    if (isLowCarb) {
      const conflicts = findConflicts(product, HIGH_CARB_INGREDIENTS);
      if (conflicts.length > 0) {
        return {
          level: 'warning',
          conflictIngredients: conflicts,
          warningMessage: `Ch\u1ebf \u0111\u1ed9 Low-carb/Keto, m\u00f3n n\u00e0y ch\u1ee9a nhi\u1ec1u tinh b\u1ed9t: ${conflicts.join(', ')}`,
        };
      }
    }
  }

  if (product.healthWarning?.trim()) {
    return {
      level: 'warning',
      conflictIngredients: [],
      warningMessage: product.healthWarning,
    };
  }

  return { level: 'safe', conflictIngredients: [], warningMessage: '' };
}

export function useAllergyCheck(product: Product | null | undefined): AllergyCheckResult {
  const user = useAuthStore((state) => state.user);
  const userAllergies = user?.preferences?.allergies ?? EMPTY_PREFERENCES;
  const userDietary = user?.preferences?.dietary ?? EMPTY_PREFERENCES;

  return useMemo(
    () => checkProductAllergies(product, userAllergies, userDietary),
    [product, userAllergies, userDietary],
  );
}
