import { z } from 'zod';
import { ALLERGEN_TAG_IDS, sanitizeAllergenTags } from '@/constants/allergen-catalog';

const allergenTagsSchema = z
  .array(z.string())
  .optional()
  .default([])
  .transform((tags) => sanitizeAllergenTags(tags));

const normalizeIngredientName = (value: string) => {
  const trimmed = value.trim();
  return trimmed
    ? trimmed
        .split(/\s+/)
        .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    : trimmed;
};

export const ingredientValidator = z.object({
  name: z.string().min(1, 'Ingredient name is required').trim().transform(normalizeIngredientName),
  description: z.string().trim().optional().default(''),
  allergenTags: allergenTagsSchema,
});

export const updateIngredientValidator = ingredientValidator.partial();

export const suggestIngredientAllergensValidator = z.object({
  name: z.string().min(1, 'Ingredient name is required').trim(),
  description: z.string().trim().optional().default(''),
});

export const aiAllergenSuggestionSchema = z.object({
  suggestedTags: z.array(z.enum(ALLERGEN_TAG_IDS as [string, ...string[]])).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0),
  reason: z.string().trim().max(300).default(''),
});

export type IngredientInput = z.infer<typeof ingredientValidator>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientValidator>;
