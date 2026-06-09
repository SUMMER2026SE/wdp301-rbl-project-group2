/**
 * FSS-40: useAllergyCheck
 * Client-side hook that checks a product against:
 *   1. User's declared allergies (preferences.allergies[])  → danger level
 *   2. User's dietary restrictions (preferences.dietary[])  → warning level
 *      e.g. 'chay', 'vegan', 'vegetarian' → warns on meat/seafood
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

const EMPTY_PREFERENCES: string[] = [];

const normalize = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const fuzzyMatch = (a: unknown, b: unknown): boolean => {
  const na = normalize(a);
  const nb = normalize(b);
  return nb.includes(na) || na.includes(nb);
}

// ─── Dietary restriction rules ─────────────────────────────────────────────

/** Ingredients that are NOT vegetarian/vegan */
const MEAT_INGREDIENTS = [
  'thịt bò', 'thịt heo', 'thịt lợn', 'thịt gà', 'thịt vịt', 'thịt dê',
  'bò', 'heo', 'lợn', 'gà', 'vịt', 'dê', 'trâu', 'cừu',
  'thịt xá xíu', 'xá xíu', 'thịt xông khói', 'bacon', 'thịt xay',
  'xúc xích', 'giăm bông', 'ham', 'lạp xưởng', 'chả lụa', 'chả giò',
  'thịt nướng', 'bò viên', 'gân bò', 'nạm bò',
];

/** Ingredients that are NOT pescatarian-safe (seafood) */
const SEAFOOD_INGREDIENTS = [
  'tôm', 'cua', 'mực', 'nghêu', 'sò', 'ngêu', 'hải sản', 'cá',
  'cá hồi', 'cá ngừ', 'cá lóc', 'cá thu', 'sò điệp', 'tôm hùm',
  'tôm sú', 'surimi', 'chả cá', 'mắm', 'mắm tôm', 'mắm ruốc',
];

const VEGETARIAN_KEYWORDS = ['chay', 'vegan', 'vegetarian', 'thu\u1ea7n chay', '\u0103n chay'];
const PESCATARIAN_KEYWORDS = ['pescatarian', '\u0103n c\u00e1', 'no meat'];
const LOW_CARB_KEYWORDS = ['keto', 'low carb', 'low-carb', '\u00edt carb'];
const HIGH_CARB_INGREDIENTS = ['c\u01a1m', 'b\u00fan', 'm\u00ec', 'b\u00e1nh m\u00ec', 'khoai t\u00e2y', 'b\u00e1nh g\u1ea1o', 'b\u1ed9t m\u00ec', 'm\u00ec g\u1ea1o'];

const getRecipeName = (item: Product['recipe'][number]): string => {
  if (item.name?.trim()) return item.name.trim();
  if (typeof item.ingredientId === 'object') return item.ingredientId.name?.trim() ?? '';
  return '';
};

const productKeywords = (product: Product): string[] => [
  product.name,
  product.description,
  ...((product.recipe ?? []).map(getRecipeName)),
  ...(product.tags ?? []),
  ...(product.healthTags ?? []),
].filter((value): value is string => typeof value === 'string' && Boolean(value.trim()));

const findConflicts = (product: Product, forbidden: string[]): string[] => {
  const found: string[] = [];

/** Dietary keywords for low-carb / keto users */
const LOW_CARB_KEYWORDS = ['keto', 'low carb', 'low-carb', 'ít carb'];

/** High-carb ingredients to warn low-carb users */
const HIGH_CARB_INGREDIENTS = [
  'cơm', 'bún', 'mì', 'bánh mì', 'khoai tây', 'bánh gạo', 'bột mì', 'mì gạo',
];

function isDietaryKeyword(diet: string, keywords: string[]): boolean {
  return keywords.some(k => fuzzyMatch(k, diet));
}

function containsIngredient(product: Product, ingredients: string[]): string[] {
  const found: string[] = [];
  if (!product.recipe) return found;
  for (const item of product.recipe) {
    for (const ing of ingredients) {
      if (fuzzyMatch(ing, item.name) && !found.includes(item.name)) {
        found.push(item.name);
      }
    }
  }
  return found;
};

const isDietaryKeyword = (diet: unknown, keywords: string[]): boolean =>
  keywords.some((keyword) => fuzzyMatch(keyword, diet));

const toAllergenId = (value: unknown) => normalize(value).replace(/\s+/g, '_');

export function checkProductAllergies(
  product: Product | null | undefined,
  userAllergies: unknown[],
  userDietary: unknown[] = [],
): AllergyCheckResult {
  if (!product) return { level: 'safe', conflictIngredients: [], warningMessage: '' };

  if (product.healthRisk && product.healthRisk.level !== 'safe') {
    const matchedIngredients = Array.isArray(product.healthRisk.matchedIngredients)
      ? product.healthRisk.matchedIngredients.filter(Boolean)
      : [];
    const matchedAllergens = Array.isArray(product.healthRisk.matchedAllergens)
      ? product.healthRisk.matchedAllergens.filter(Boolean)
      : [];

    return {
      level: product.healthRisk.level,
      conflictIngredients: matchedIngredients.length ? matchedIngredients : matchedAllergens,
      warningMessage: product.healthRisk.message ?? '',
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
      return {
        level: 'danger',
        conflictIngredients,
        warningMessage: `Món này chứa nguyên liệu bạn dị ứng: ${conflictIngredients.join(', ')}`,
      };
    }

    // healthTags match (WARNING)
    const tagConflicts: string[] = [];
    for (const tag of product.healthTags ?? []) {
      for (const allergen of userAllergies) {
        if (fuzzyMatch(allergen, tag) && !tagConflicts.includes(tag)) {
          tagConflicts.push(tag);
        }
      }
    }
    if (tagConflicts.length > 0) {
      return {
        level: 'warning',
        conflictIngredients: tagConflicts,
        warningMessage: `Món này có thể không phù hợp với hồ sơ sức khỏe của bạn`,
      };
    }
  }

  // ── Step 2: Check dietary restrictions (WARNING) ─────────────────────────
  if (userDietary.length > 0) {
    // 2a. Vegetarian / Vegan
    const isVegetarian = userDietary.some(d => isDietaryKeyword(d, VEGETARIAN_KEYWORDS));
    if (isVegetarian) {
      const meatFound = containsIngredient(product, MEAT_INGREDIENTS);
      const seafoodFound = containsIngredient(product, SEAFOOD_INGREDIENTS);
      const allConflicts = [...meatFound, ...seafoodFound];

      if (allConflicts.length > 0) {
        return {
          level: 'warning',
          conflictIngredients: allConflicts,
          warningMessage: `Bạn đang ăn chay — món này chứa: ${allConflicts.join(', ')}`,
        };
      }

      // Check healthTags for meat/seafood hints
      const meatTags = (product.healthTags ?? []).filter(t =>
        MEAT_INGREDIENTS.some(m => fuzzyMatch(m, t)) ||
        SEAFOOD_INGREDIENTS.some(s => fuzzyMatch(s, t))
      );
      if (meatTags.length > 0) {
        return {
          level: 'warning',
          conflictIngredients: meatTags,
          warningMessage: `Bạn đang ăn chay — món này có thể chứa thịt hoặc hải sản`,
        };
      }
    }

    // 2b. Pescatarian (no red meat, fish ok)
    const isPescatarian = userDietary.some(d => isDietaryKeyword(d, PESCATARIAN_KEYWORDS));
    if (isPescatarian && !isVegetarian) {
      const meatFound = containsIngredient(product, MEAT_INGREDIENTS);
      if (meatFound.length > 0) {
        return {
          level: 'warning',
          conflictIngredients: meatFound,
          warningMessage: `Bạn không ăn thịt đỏ — món này chứa: ${meatFound.join(', ')}`,
        };
      }
    }

    // 2c. Low-carb / Keto
    const isLowCarb = userDietary.some(d => isDietaryKeyword(d, LOW_CARB_KEYWORDS));
    if (isLowCarb) {
      const carbFound = containsIngredient(product, HIGH_CARB_INGREDIENTS);
      if (carbFound.length > 0) {
        return {
          level: 'warning',
          conflictIngredients: carbFound,
          warningMessage: `Chế độ Low-carb/Keto — món này chứa nhiều tinh bột: ${carbFound.join(', ')}`,
        };
      }
    }
  }

  // ── Step 3: Generic product healthWarning ────────────────────────────────
  if (product.healthWarning?.trim()) {
    return {
      level: 'warning',
      conflictIngredients: [],
      warningMessage: product.healthWarning,
    };
  }

  return { level: 'safe', conflictIngredients: [], warningMessage: '' };
}

// ─── Hook (reads from auth store automatically) ────────────────────────────

export function useAllergyCheck(product: Product | null | undefined): AllergyCheckResult {
  const user = useAuthStore((state) => state.user);
  const userAllergies = user?.preferences?.allergies ?? EMPTY_PREFERENCES;
  const userDietary = user?.preferences?.dietary ?? EMPTY_PREFERENCES;

  return useMemo(
    () => checkProductAllergies(product, userAllergies, userDietary),
    [product, userAllergies, userDietary],
  );
}
