import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { IngredientModel } from '@/models/ingredient.model';

dotenv.config();

const APPLY = process.argv.includes('--apply');

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((word) => word ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : word)
    .join(' ');

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);

  const ingredients = await IngredientModel.find({}).lean();
  const changes = ingredients
    .map((ingredient) => ({
      id: ingredient._id,
      from: ingredient.name,
      to: toTitleCase(ingredient.name),
    }))
    .filter((item) => item.from !== item.to);

  console.log(`[normalize:ingredients] Mode: ${APPLY ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`[normalize:ingredients] Ingredients scanned: ${ingredients.length}`);
  console.log(`[normalize:ingredients] Ingredients to update: ${changes.length}`);
  for (const change of changes.slice(0, 100)) {
    console.log(`- ${change.from} -> ${change.to}`);
  }

  if (APPLY) {
    for (const change of changes) {
      await IngredientModel.updateOne(
        { _id: change.id },
        { $set: { name: change.to } }
      );
    }
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[normalize:ingredients] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
