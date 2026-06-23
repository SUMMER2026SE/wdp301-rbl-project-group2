import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { IngredientModel } from '@/models/ingredient.model';

dotenv.config();

const APPLY = process.argv.includes('--apply');

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);

  const usedIngredientIds = await ProductModel.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $unwind: '$recipe' },
    { $group: { _id: '$recipe.ingredientId' } },
  ]);
  const usedIds = new Set(usedIngredientIds.map((item) => String(item._id)));

  const ingredients = await IngredientModel.find({}).lean();
  const unusedIngredients = ingredients.filter((ingredient) => !usedIds.has(String(ingredient._id)));

  console.log(`[cleanup:ingredients] Mode: ${APPLY ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`[cleanup:ingredients] Ingredients scanned: ${ingredients.length}`);
  console.log(`[cleanup:ingredients] Ingredients unused in products: ${unusedIngredients.length}`);
  for (const ingredient of unusedIngredients.slice(0, 100)) {
    console.log(`- ${ingredient.name}`);
  }

  if (APPLY && unusedIngredients.length > 0) {
    await IngredientModel.deleteMany({ _id: { $in: unusedIngredients.map((ingredient) => ingredient._id) } });
    console.log(`[cleanup:ingredients] Deleted: ${unusedIngredients.length}`);
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[cleanup:ingredients] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
