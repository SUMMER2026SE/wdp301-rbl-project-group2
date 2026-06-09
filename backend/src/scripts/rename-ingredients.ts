import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { IngredientModel } from '@/models/ingredient.model';

dotenv.config();

const updates = [
  { from: 'bò viên', to: 'Bò viên' },
  { from: 'mỡ heo', to: 'Mỡ heo' },
  { from: 'tỏi', to: 'Tỏi' },
  { from: 'ớt', to: 'Ớt' },
];

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);

  for (const item of updates) {
    const res = await IngredientModel.updateMany(
      { name: new RegExp(`^${item.from}$`, 'i') },
      { $set: { name: item.to } }
    );
    const matchedCount = (res as any).matchedCount ?? (res as any).n ?? 0;
    const modifiedCount = (res as any).modifiedCount ?? (res as any).nModified ?? 0;
    console.log(`[rename:ingredients] ${item.from} -> ${item.to}: matched=${matchedCount}, modified=${modifiedCount}`);
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[rename:ingredients] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
