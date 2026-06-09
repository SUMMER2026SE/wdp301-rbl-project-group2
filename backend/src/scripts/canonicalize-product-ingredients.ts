import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { IngredientModel } from '@/models/ingredient.model';
import { inferIngredientAllergenTags } from '@/utils/infer-ingredient-allergens';
import {
  INVALID_INGREDIENT_NAMES,
  REMAPPED_INGREDIENT_NAMES,
  SPLIT_INGREDIENT_NAMES,
  canonicalizeRecipeIngredient,
} from '@/utils/ingredient-canonical';

dotenv.config();

const APPLY = process.argv.includes('--apply');

type PopulatedRecipeItem = {
  ingredientId?: {
    _id: mongoose.Types.ObjectId;
    name: string;
  };
  quantity: number;
  unit: string;
};

const getIngredient = async (name: string) => {
  const allergenTags = inferIngredientAllergenTags(name);
  return IngredientModel.findOneAndUpdate(
    { name },
    {
      $setOnInsert: {
        name,
        description: '',
        allergenTags,
        allergenReviewStatus: allergenTags.length > 0 ? 'reviewed' : 'pending',
        allergenSource: 'manual',
      },
    },
    { upsert: true, new: true }
  ).lean();
};

const sameRecipe = (left: any[], right: any[]) => {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const next = right[index];
    return (
      String(item.ingredientId?._id ?? item.ingredientId) === String(next.ingredientId) &&
      Number(item.quantity) === Number(next.quantity) &&
      String(item.unit ?? '') === String(next.unit ?? '')
    );
  });
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);

  const products = await ProductModel.find({})
    .populate({ path: 'recipe.ingredientId', select: 'name' })
    .lean();

  const ingredientCache = new Map<string, any>();
  const getCachedIngredient = async (name: string) => {
    const cached = ingredientCache.get(name);
    if (cached) return cached;
    const ingredient = await getIngredient(name);
    ingredientCache.set(name, ingredient);
    return ingredient;
  };

  const changes: string[] = [];
  let updated = 0;

  for (const product of products) {
    const recipe = Array.isArray(product.recipe) ? product.recipe as unknown as PopulatedRecipeItem[] : [];
    const nextRecipeMap = new Map<string, { ingredientId: mongoose.Types.ObjectId; quantity: number; unit: string; name: string }>();

    for (const item of recipe) {
      const sourceName = item.ingredientId?.name;
      if (!sourceName) continue;

      const canonicalItems = canonicalizeRecipeIngredient({
        name: sourceName,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'phần',
      });

      for (const canonicalItem of canonicalItems) {
        const ingredient = await getCachedIngredient(canonicalItem.name);
        if (!ingredient?._id) continue;

        const key = `${String(ingredient._id)}::${canonicalItem.unit}`;
        const existing = nextRecipeMap.get(key);
        if (existing) {
          existing.quantity += canonicalItem.quantity;
        } else {
          nextRecipeMap.set(key, {
            ingredientId: ingredient._id,
            quantity: canonicalItem.quantity,
            unit: canonicalItem.unit,
            name: canonicalItem.name,
          });
        }
      }
    }

    const nextRecipe = [...nextRecipeMap.values()].map((item) => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
    }));

    if (!sameRecipe(recipe, nextRecipe)) {
      changes.push(`- ${product.name}: ${recipe.map((item) => item.ingredientId?.name).filter(Boolean).join(', ')} -> ${[...nextRecipeMap.values()].map((item) => item.name).join(', ')}`);
      if (APPLY) {
        await ProductModel.updateOne({ _id: product._id }, { $set: { recipe: nextRecipe } });
        updated += 1;
      }
    }
  }

  const usedIngredientIds = await ProductModel.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $unwind: '$recipe' },
    { $group: { _id: '$recipe.ingredientId' } },
  ]);
  const usedIds = new Set(usedIngredientIds.map((item) => String(item._id)));

  const ingredients = await IngredientModel.find({}).lean();
  const obsoleteNames = new Set([
    ...INVALID_INGREDIENT_NAMES,
    ...REMAPPED_INGREDIENT_NAMES,
    ...SPLIT_INGREDIENT_NAMES,
  ]);

  const obsoleteUnused = ingredients.filter((ingredient) =>
    obsoleteNames.has(ingredient.name) && !usedIds.has(String(ingredient._id))
  );

  console.log(`[canonicalize:ingredients] Mode: ${APPLY ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`[canonicalize:ingredients] Products scanned: ${products.length}`);
  console.log(`[canonicalize:ingredients] Products ${APPLY ? 'updated' : 'to update'}: ${APPLY ? updated : changes.length}`);
  for (const change of changes.slice(0, 80)) console.log(change);
  console.log(`[canonicalize:ingredients] Obsolete unused ingredients ${APPLY ? 'deleted' : 'to delete'}: ${obsoleteUnused.length}`);
  for (const ingredient of obsoleteUnused.slice(0, 80)) console.log(`- ${ingredient.name}`);

  if (APPLY && obsoleteUnused.length > 0) {
    await IngredientModel.deleteMany({ _id: { $in: obsoleteUnused.map((ingredient) => ingredient._id) } });
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[canonicalize:ingredients] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
