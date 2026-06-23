import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { IngredientModel } from '@/models/ingredient.model';
import { sanitizeAllergenTags } from '@/constants/allergen-catalog';
import { inferIngredientAllergenTags } from '@/utils/infer-ingredient-allergens';

dotenv.config();

const APPLY = process.argv.includes('--apply');

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const inferAllergenTags = (name: string): string[] => {
  const rawText = name
    .toLowerCase()
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const rawTokens = new Set(rawText.split(' ').filter(Boolean));
  const text = normalize(name);
  const tokens = new Set(text.split(' ').filter(Boolean));
  const has = (phrase: string) => {
    const rawPhrase = phrase.toLowerCase().trim();
    const shouldKeepAccent = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/iu.test(rawPhrase);
    if (shouldKeepAccent) {
      const rawParts = rawPhrase.split(/\s+/).filter(Boolean);
      return rawParts.length === 1 ? rawTokens.has(rawPhrase) : rawText.includes(rawPhrase);
    }

    const normalized = normalize(phrase);
    if (!normalized) return false;
    const parts = normalized.split(' ');
    return parts.length === 1 ? tokens.has(normalized) : text.includes(normalized);
  };

  const tags: string[] = [];
  if (has('bò') || has('thịt bò') || has('bò viên')) tags.push('beef');
  if (has('heo') || has('lợn') || has('thịt heo') || has('thịt lợn') || has('ba chỉ') || has('sườn') || has('chả lụa') || has('giò') || has('xá xíu') || has('mỡ heo') || has('tóp mỡ')) tags.push('pork');
  if (has('gà') || has('thịt gà') || has('ức gà')) tags.push('chicken');
  if (has('cá') || has('nước mắm') || has('mắm')) tags.push('fish');
  if (has('tôm')) tags.push('shrimp', 'shellfish');
  if (has('cua') || has('ghẹ')) tags.push('crab', 'shellfish');
  if (has('mực')) tags.push('squid', 'shellfish');
  if (has('nghêu') || has('sò') || has('ốc') || has('hến') || has('hải sản')) tags.push('shellfish');
  if (has('trứng')) tags.push('eggs');
  if (has('sữa') || has('phô mai') || has('kem') || has('yogurt')) tags.push('dairy');
  if (has('đậu phộng') || has('lạc')) tags.push('peanuts');
  if (has('đậu nành') || has('đậu hũ') || has('tofu') || has('nước tương') || has('xì dầu')) tags.push('soy');
  if (has('bột mì') || has('bánh mì') || has('mì quảng') || has('mì') || has('noodle') || has('pasta') || has('ramen') || has('quẩy')) tags.push('gluten');
  if (has('hạt cây') || has('hạnh nhân') || has('óc chó') || has('hạt điều') || has('macca')) tags.push('tree_nuts');
  if (has('mè') || has('vừng')) tags.push('sesame');
  if (has('hành') || has('tỏi')) tags.push('allium');
  if (has('mayonnaise')) tags.push('eggs');
  if (has('bột ngọt') || has('mì chính') || has('msg')) tags.push('msg');
  return sanitizeAllergenTags(tags);
};

const sameTags = (a: string[], b: string[]) => {
  const left = [...a].sort().join('|');
  const right = [...b].sort().join('|');
  return left === right;
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(mongoUri);

  const ingredients = await IngredientModel.find({}).sort({ name: 1 }).lean();
  const changes = ingredients
    .map((ingredient) => ({
      id: ingredient._id,
      name: ingredient.name,
      from: sanitizeAllergenTags(ingredient.allergenTags ?? []),
      to: inferIngredientAllergenTags(ingredient.name),
    }))
    .filter((change) => !sameTags(change.from, change.to));

  console.log(`[repair:ingredients] Mode: ${APPLY ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`[repair:ingredients] Ingredients scanned: ${ingredients.length}`);
  console.log(`[repair:ingredients] Ingredients to update: ${changes.length}`);
  for (const change of changes.slice(0, 80)) {
    console.log(`- ${change.name}: [${change.from.join(', ')}] -> [${change.to.join(', ')}]`);
  }

  if (APPLY) {
    for (const change of changes) {
      await IngredientModel.updateOne(
        { _id: change.id },
        {
          $set: {
            allergenTags: change.to,
            allergenReviewStatus: change.to.length > 0 ? 'reviewed' : 'pending',
            allergenSource: 'manual',
          },
        }
      );
    }
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[repair:ingredients] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
