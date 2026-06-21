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

const ALLERGEN_ALIASES: Record<string, string[]> = {
  beef: ['beef', 'bo', 'thit bo'],
  pork: ['pork', 'heo', 'lon', 'thit heo', 'thit lon', 'suon', 'ba chi', 'cha lua', 'gio', 'nem'],
  chicken: ['chicken', 'ga', 'thit ga'],
  fish: ['fish', 'ca', 'cha ca', 'ca hoi', 'ca ngu', 'ca loc', 'ca thu', 'ca basa', 'nuoc mam'],
  shrimp: ['shrimp', 'tom', 'tom hum', 'tom su', 'tom kho', 'mam tom'],
  crab: ['crab', 'cua', 'ghe', 'cang cua'],
  squid: ['squid', 'muc'],
  shellfish: ['shellfish', 'hai san', 'hai san co vo', 'ngheu', 'so', 'oc', 'hen'],
  eggs: ['eggs', 'egg', 'trung', 'trung ga', 'trung vit', 'trung cut', 'trung muoi'],
  dairy: ['dairy', 'milk', 'sua', 'pho mai', 'kem', 'sua chua', 'yogurt', 'bo sua', 'sua dac'],
  peanuts: ['peanuts', 'peanut', 'dau phong', 'lac', 'bo dau phong'],
  soy: ['soy', 'dau nanh', 'tuong', 'tofu', 'dau hu'],
  gluten: ['gluten', 'lua mi', 'banh mi', 'bot mi', 'hoanh thanh', 'ramen'],
  tree_nuts: ['tree_nuts', 'tree nuts', 'hat cay', 'hanh nhan', 'oc cho', 'hat dieu', 'macca'],
  sesame: ['sesame', 'me', 'vung', 'dau me'],
  allium: ['allium', 'hanh', 'hanh la', 'hanh tay', 'toi', 'kieu', 'he'],
  msg: ['msg', 'bot ngot', 'mi chinh'],
};

const ALLERGEN_ALIAS_TO_ID = Object.entries(ALLERGEN_ALIASES).reduce<Record<string, string>>(
  (acc, [id, aliases]) => {
    acc[normalize(id).replace(/\s+/g, '_')] = id;
    for (const alias of aliases) {
      acc[normalize(alias).replace(/\s+/g, '_')] = id;
    }
    return acc;
  },
  {},
);

const toAllergenId = (value: unknown) => {
  const normalized = normalize(value).replace(/\s+/g, '_');
  return ALLERGEN_ALIAS_TO_ID[normalized] ?? normalized;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsNormalizedPhrase = (text: string, phrase: string) => {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;

  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedPhrase)}($|[^a-z0-9])`);
  return pattern.test(text);
};

const warningMentionsCurrentAllergy = (warning: string | undefined, allergyIds: Set<string>) => {
  const normalizedWarning = normalize(warning);
  if (!normalizedWarning) return false;

  return [...allergyIds].some((id) =>
    (ALLERGEN_ALIASES[id] ?? [id]).some((alias) => containsNormalizedPhrase(normalizedWarning, alias)),
  );
};

export function checkProductAllergies(
  product: Product | null | undefined,
  userAllergies: unknown[],
  userDietary: unknown[] = [],
): AllergyCheckResult {
  if (!product) return { level: 'safe', conflictIngredients: [], warningMessage: '' };

  const allergyIds = new Set(userAllergies.map(toAllergenId).filter(Boolean));
  const hasUserAllergies = allergyIds.size > 0;

  if (hasUserAllergies && product.healthRisk && product.healthRisk.level !== 'safe') {
    const matchedIngredients = Array.isArray(product.healthRisk.matchedIngredients)
      ? product.healthRisk.matchedIngredients.filter(Boolean)
      : [];
    const matchedAllergens = Array.isArray(product.healthRisk.matchedAllergens)
      ? product.healthRisk.matchedAllergens.filter(Boolean)
      : [];
    const matchesCurrentProfile = matchedAllergens.some((tag) => allergyIds.has(toAllergenId(tag)));

    if (matchesCurrentProfile) {
      return {
        level: product.healthRisk.level,
        conflictIngredients: matchedIngredients.length ? matchedIngredients : matchedAllergens,
        warningMessage: product.healthRisk.message ?? '',
      };
    }
  }

  if (hasUserAllergies) {
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

  if (hasUserAllergies && warningMentionsCurrentAllergy(product.healthWarning, allergyIds)) {
    return {
      level: 'warning',
      conflictIngredients: [],
      warningMessage: product.healthWarning ?? '',
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
