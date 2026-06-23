import Groq from 'groq-sdk';
import mongoose from 'mongoose';
import { GROQ_API_KEY } from '@/constants/env';
import { ALLERGEN_CATALOG, sanitizeAllergenTags } from '@/constants/allergen-catalog';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { IngredientModel, ProductModel, UserModel } from '@/models';
import appAssert from '@/utils/app-assert';
import {
  aiAllergenSuggestionSchema,
  IngredientInput,
  UpdateIngredientInput,
} from '@/validators/ingredient.validator';

const groq = new Groq({ apiKey: GROQ_API_KEY });

const invalidateAiCachesForIngredient = async (ingredientId: string) => {
  await ProductModel.updateMany(
    { 'recipe.ingredientId': new mongoose.Types.ObjectId(ingredientId) },
    { $set: { updatedAt: new Date() } }
  );

  await UserModel.updateMany(
    { aiRecommendationsCache: { $exists: true } },
    {
      $set: {
        aiRecommendationsCache: {
          data: null,
          safeFoodsData: null,
          updatedAt: null,
        },
      },
    }
  );
};

export const listIngredients = async () => {
  const [ingredients, productRefs] = await Promise.all([
    IngredientModel.find().sort({ name: 1 }).lean(),
    ProductModel.aggregate([
      { $unwind: '$recipe' },
      { $group: { _id: '$recipe.ingredientId', usedInProducts: { $sum: 1 } } },
    ]),
  ]);

  const counts = new Map(productRefs.map((row: any) => [String(row._id), Number(row.usedInProducts) || 0]));

  return ingredients.map((ingredient: any) => ({
    id: String(ingredient._id),
    _id: String(ingredient._id),
    name: ingredient.name,
    description: ingredient.description ?? '',
    allergenTags: ingredient.allergenTags ?? [],
    allergenSuggestion: ingredient.allergenSuggestion ?? null,
    allergenReviewStatus: ingredient.allergenReviewStatus ?? 'pending',
    allergenConfidence: ingredient.allergenConfidence ?? null,
    allergenSource: ingredient.allergenSource ?? 'manual',
    usedInProducts: counts.get(String(ingredient._id)) ?? 0,
    createdAt: ingredient.createdAt,
    updatedAt: ingredient.updatedAt,
  }));
};

export const createIngredient = async (input: IngredientInput) => {
  const ingredient = await IngredientModel.create({
    ...input,
    name: input.name
      .trim()
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
      .join(' '),
    allergenTags: sanitizeAllergenTags(input.allergenTags),
    allergenReviewStatus: 'reviewed',
    allergenSource: 'manual',
  });
  return ingredient.toObject();
};

export const updateIngredient = async (id: string, input: UpdateIngredientInput) => {
  appAssert(mongoose.Types.ObjectId.isValid(id), BAD_REQUEST, 'Invalid ingredient id');

  const existing = await IngredientModel.findById(id).select('allergenSource allergenSuggestion').lean();
  appAssert(existing, NOT_FOUND, 'Ingredient not found');

  const update: Record<string, unknown> = { ...input };
  if (input.allergenTags) {
    update.allergenTags = sanitizeAllergenTags(input.allergenTags);
    update.allergenReviewStatus = 'reviewed';
    update.allergenSource = existing.allergenSource === 'ai' || existing.allergenSuggestion ? 'ai_confirmed' : 'manual';
  }

  const ingredient = await IngredientModel.findByIdAndUpdate(id, update, { new: true });
  appAssert(ingredient, NOT_FOUND, 'Ingredient not found');

  await invalidateAiCachesForIngredient(id);
  return ingredient.toObject();
};

export const deleteIngredient = async (id: string) => {
  appAssert(mongoose.Types.ObjectId.isValid(id), BAD_REQUEST, 'Invalid ingredient id');
  const inUse = await ProductModel.exists({ 'recipe.ingredientId': id });
  appAssert(!inUse, BAD_REQUEST, 'Cannot delete ingredient that is used in products');

  const deleted = await IngredientModel.findByIdAndDelete(id);
  appAssert(deleted, NOT_FOUND, 'Ingredient not found');
  return { id };
};

export const suggestAllergensForIngredient = async (input: { name: string; description?: string }) => {
  const allowedTags = ALLERGEN_CATALOG.map((item) => ({
    id: item.id,
    label: item.label,
    aliases: item.aliases,
  }));

  const prompt = `You are helping classify food ingredients for allergy safety.
Return JSON only. Pick suggestedTags only from allowedTags ids. If uncertain, return fewer tags and lower confidence.

Ingredient:
${JSON.stringify({ name: input.name, description: input.description ?? '' })}

allowedTags:
${JSON.stringify(allowedTags)}

JSON shape:
{"suggestedTags":["shrimp"],"confidence":0.9,"reason":"short Vietnamese reason"}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = aiAllergenSuggestionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error('Invalid allergen suggestion shape');

    return {
      ...parsed.data,
      suggestedTags: sanitizeAllergenTags(parsed.data.suggestedTags),
      source: 'ai',
    };
  } catch (error) {
    return {
      suggestedTags: [] as string[],
      confidence: 0,
      reason: 'AI chưa đưa ra được gợi ý đáng tin cậy. Vui lòng chọn tag thủ công.',
      source: 'fallback',
    };
  }
};

export const saveIngredientAiSuggestion = async (
  id: string,
  suggestion: { suggestedTags: string[]; confidence: number; reason: string }
) => {
  appAssert(mongoose.Types.ObjectId.isValid(id), BAD_REQUEST, 'Invalid ingredient id');
  const ingredient = await IngredientModel.findByIdAndUpdate(
    id,
    {
      allergenSuggestion: {
        suggestedTags: sanitizeAllergenTags(suggestion.suggestedTags),
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        suggestedAt: new Date(),
      },
      allergenReviewStatus: 'pending',
      allergenConfidence: suggestion.confidence,
      allergenSource: 'ai',
    },
    { new: true }
  );
  appAssert(ingredient, NOT_FOUND, 'Ingredient not found');
  return ingredient.toObject();
};
