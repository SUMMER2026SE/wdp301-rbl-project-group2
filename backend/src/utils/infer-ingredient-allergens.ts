import { sanitizeAllergenTags } from '@/constants/allergen-catalog';

const normalizeFolded = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeRaw = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasAccentedVietnamese = (value: string) => /[\u00c0-\u1ef9]/u.test(value);

const createMatcher = (name: string) => {
  const rawText = normalizeRaw(name);
  const rawTokens = new Set(rawText.split(' ').filter(Boolean));
  const foldedText = normalizeFolded(name);
  const foldedTokens = new Set(foldedText.split(' ').filter(Boolean));

  return (phrase: string) => {
    const shouldKeepAccent = hasAccentedVietnamese(phrase);
    const text = shouldKeepAccent ? rawText : foldedText;
    const tokens = shouldKeepAccent ? rawTokens : foldedTokens;
    const normalized = shouldKeepAccent ? normalizeRaw(phrase) : normalizeFolded(phrase);
    if (!normalized) return false;

    const parts = normalized.split(' ');
    return parts.length === 1 ? tokens.has(normalized) : text.includes(normalized);
  };
};

export const inferIngredientAllergenTags = (name: string): string[] => {
  const has = createMatcher(name);
  const tags: string[] = [];

  if (has('b\u00f2') || has('th\u1ecbt b\u00f2') || has('b\u00f2 vi\u00ean')) tags.push('beef');
  if (
    has('heo') ||
    has('l\u1ee3n') ||
    has('th\u1ecbt heo') ||
    has('th\u1ecbt l\u1ee3n') ||
    has('ba ch\u1ec9') ||
    has('s\u01b0\u1eddn') ||
    has('ch\u1ea3 l\u1ee5a') ||
    has('gi\u00f2') ||
    has('x\u00e1 x\u00edu') ||
    has('m\u1ee1 heo') ||
    has('t\u00f3p m\u1ee1')
  ) {
    tags.push('pork');
  }
  if (has('g\u00e0') || has('th\u1ecbt g\u00e0') || has('\u1ee9c g\u00e0')) tags.push('chicken');
  if (has('c\u00e1') || has('n\u01b0\u1edbc m\u1eafm') || has('m\u1eafm')) tags.push('fish');
  if (has('t\u00f4m')) tags.push('shrimp', 'shellfish');
  if (has('cua') || has('gh\u1eb9')) tags.push('crab', 'shellfish');
  if (has('m\u1ef1c')) tags.push('squid', 'shellfish');
  if (has('ngh\u00eau') || has('s\u00f2') || has('\u1ed1c') || has('h\u1ebfn')) tags.push('shellfish');
  if (has('h\u1ea3i s\u1ea3n')) tags.push('fish', 'shrimp', 'crab', 'squid', 'shellfish');

  if (has('tr\u1ee9ng') || has('mayonnaise')) tags.push('eggs');
  if (has('s\u1eefa') || has('ph\u00f4 mai') || has('kem') || has('yogurt')) tags.push('dairy');
  if (has('\u0111\u1eadu ph\u1ed9ng') || has('l\u1ea1c')) tags.push('peanuts');
  if (has('\u0111\u1eadu n\u00e0nh') || has('\u0111\u1eadu h\u0169') || has('tofu') || has('n\u01b0\u1edbc t\u01b0\u01a1ng') || has('x\u00ec d\u1ea7u')) tags.push('soy');
  if (has('b\u1ed9t m\u00ec') || has('b\u00e1nh m\u00ec') || has('m\u00ec qu\u1ea3ng') || has('m\u00ec') || has('noodle') || has('pasta') || has('ramen') || has('qu\u1ea9y')) {
    tags.push('gluten');
  }
  if (has('h\u1ea1t c\u00e2y') || has('h\u1ea1nh nh\u00e2n') || has('\u00f3c ch\u00f3') || has('h\u1ea1t \u0111i\u1ec1u') || has('macca')) {
    tags.push('tree_nuts');
  }
  if (has('m\u00e8') || has('v\u1eebng')) tags.push('sesame');
  if (has('h\u00e0nh') || has('t\u1ecfi')) tags.push('allium');
  if (has('b\u1ed9t ng\u1ecdt') || has('m\u00ec ch\u00ednh') || has('msg')) tags.push('msg');

  return sanitizeAllergenTags(tags);
};
