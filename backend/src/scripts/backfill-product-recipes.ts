import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { IngredientModel } from '@/models/ingredient.model';
import { sanitizeAllergenTags } from '@/constants/allergen-catalog';

dotenv.config();

type IngredientSeed = {
  name: string;
  allergenTags?: string[];
};

type RecipePlanItem = {
  name: string;
  quantity: number;
  unit: string;
  allergenTags?: string[];
};

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');

const normalize = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

const hasAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(normalize(keyword)));

const INGREDIENTS: IngredientSeed[] = [
  { name: 'Thịt bò', allergenTags: ['beef'] },
  { name: 'Thịt heo', allergenTags: ['pork'] },
  { name: 'Thịt gà', allergenTags: ['chicken'] },
  { name: 'Cá', allergenTags: ['fish'] },
  { name: 'Tôm', allergenTags: ['shrimp', 'shellfish'] },
  { name: 'Cua', allergenTags: ['crab', 'shellfish'] },
  { name: 'Mực', allergenTags: ['squid', 'shellfish'] },
  { name: 'Hải sản', allergenTags: ['fish', 'shrimp', 'crab', 'squid', 'shellfish'] },
  { name: 'Trứng', allergenTags: ['eggs'] },
  { name: 'Sữa', allergenTags: ['dairy'] },
  { name: 'Phô mai', allergenTags: ['dairy'] },
  { name: 'Bột mì', allergenTags: ['gluten'] },
  { name: 'Mì', allergenTags: ['gluten'] },
  { name: 'Đậu nành', allergenTags: ['soy'] },
  { name: 'Đậu hũ', allergenTags: ['soy'] },
  { name: 'Đậu phộng', allergenTags: ['peanuts'] },
  { name: 'Hạt cây', allergenTags: ['tree_nuts'] },
  { name: 'Mè', allergenTags: ['sesame'] },
  { name: 'Hành tỏi', allergenTags: ['allium'] },
  { name: 'Bột ngọt', allergenTags: ['msg'] },
  { name: 'Nước mắm', allergenTags: ['fish'] },
  { name: 'Mayonnaise', allergenTags: ['eggs'] },
  { name: 'Cơm', allergenTags: [] },
  { name: 'Bún', allergenTags: [] },
  { name: 'Phở', allergenTags: [] },
  { name: 'Bánh mì', allergenTags: ['gluten'] },
  { name: 'Rau sống', allergenTags: [] },
  { name: 'Rau củ', allergenTags: [] },
  { name: 'Nấm', allergenTags: [] },
  { name: 'Khoai tây', allergenTags: [] },
  { name: 'Dầu ăn', allergenTags: [] },
  { name: 'Đường', allergenTags: [] },
  { name: 'Đá', allergenTags: [] },
  { name: 'Muối', allergenTags: [] },
  { name: 'Tiêu', allergenTags: [] },
  { name: 'Trà', allergenTags: [] },
  { name: 'Cà phê', allergenTags: [] },
  { name: 'Matcha', allergenTags: [] },
  { name: 'Sả', allergenTags: [] },
  { name: 'Thảo mộc', allergenTags: [] },
  { name: 'Trái cây', allergenTags: [] },
  { name: 'Nước dùng', allergenTags: [] },
  { name: 'Sốt đặc biệt', allergenTags: [] },
  { name: 'Thành phần tổng hợp', allergenTags: [] },
];

const addUnique = (items: RecipePlanItem[], item: RecipePlanItem) => {
  if (items.some((existing) => existing.name === item.name)) return;
  items.push(item);
};

const buildRecipePlan = (product: any): RecipePlanItem[] => {
  const text = normalize([
    product.name,
    product.description,
    product.category,
    ...(Array.isArray(product.tags) ? product.tags : []),
    ...(Array.isArray(product.healthTags) ? product.healthTags : []),
  ].join(' '));

  const recipe: RecipePlanItem[] = [];

  if (hasAny(text, ['drink', 'trà', 'tea', 'nước', 'cà phê', 'coffee', 'matcha', 'sinh tố', 'nước ép'])) {
    if (hasAny(text, ['trà', 'tea'])) addUnique(recipe, { name: 'Trà', quantity: 1, unit: 'phần' });
    if (hasAny(text, ['cà phê', 'coffee', 'cafe'])) addUnique(recipe, { name: 'Cà phê', quantity: 1, unit: 'phần' });
    if (hasAny(text, ['matcha'])) addUnique(recipe, { name: 'Matcha', quantity: 5, unit: 'g' });
    if (hasAny(text, ['đào', 'cam', 'chanh', 'dâu', 'xoài', 'trái cây', 'fruit', 'sinh tố', 'nước ép'])) {
      addUnique(recipe, { name: 'Trái cây', quantity: 150, unit: 'g' });
    }
    if (hasAny(text, ['sả'])) addUnique(recipe, { name: 'Sả', quantity: 10, unit: 'g' });
    if (hasAny(text, ['sâm', 'thảo mộc'])) addUnique(recipe, { name: 'Thảo mộc', quantity: 20, unit: 'g' });
    addUnique(recipe, { name: 'Đường', quantity: 20, unit: 'g' });
    addUnique(recipe, { name: 'Đá', quantity: 1, unit: 'phần' });
    return recipe;
  }

  if (hasAny(text, ['cơm', 'rice'])) addUnique(recipe, { name: 'Cơm', quantity: 180, unit: 'g' });
  if (hasAny(text, ['bún'])) addUnique(recipe, { name: 'Bún', quantity: 180, unit: 'g' });
  if (hasAny(text, ['phở', 'pho'])) addUnique(recipe, { name: 'Phở', quantity: 180, unit: 'g' });
  if (hasAny(text, ['bánh mì', 'banh mi', 'burger', 'sandwich'])) addUnique(recipe, { name: 'Bánh mì', quantity: 1, unit: 'phần', allergenTags: ['gluten'] });
  if (hasAny(text, ['mì', 'mi ', 'ramen', 'spaghetti', 'pasta', 'noodle'])) addUnique(recipe, { name: 'Mì', quantity: 180, unit: 'g', allergenTags: ['gluten'] });

  if (hasAny(text, ['bò', 'beef', 'steak'])) addUnique(recipe, { name: 'Thịt bò', quantity: 120, unit: 'g', allergenTags: ['beef'] });
  if (hasAny(text, ['heo', 'lợn', 'sườn', 'ba chỉ', 'pork', 'chả lụa'])) addUnique(recipe, { name: 'Thịt heo', quantity: 120, unit: 'g', allergenTags: ['pork'] });
  if (hasAny(text, ['gà', 'chicken'])) addUnique(recipe, { name: 'Thịt gà', quantity: 120, unit: 'g', allergenTags: ['chicken'] });
  if (hasAny(text, ['cá', 'fish', 'surimi', 'chả cá', 'cá viên'])) addUnique(recipe, { name: 'Cá', quantity: 120, unit: 'g', allergenTags: ['fish'] });
  if (hasAny(text, ['tôm', 'shrimp'])) addUnique(recipe, { name: 'Tôm', quantity: 100, unit: 'g', allergenTags: ['shrimp', 'shellfish'] });
  if (hasAny(text, ['cua', 'ghẹ', 'crab'])) addUnique(recipe, { name: 'Cua', quantity: 100, unit: 'g', allergenTags: ['crab', 'shellfish'] });
  if (hasAny(text, ['mực', 'squid'])) addUnique(recipe, { name: 'Mực', quantity: 100, unit: 'g', allergenTags: ['squid', 'shellfish'] });
  if (hasAny(text, ['hải sản', 'seafood'])) addUnique(recipe, { name: 'Hải sản', quantity: 150, unit: 'g', allergenTags: ['fish', 'shrimp', 'crab', 'squid', 'shellfish'] });

  if (hasAny(text, ['trứng', 'egg'])) addUnique(recipe, { name: 'Trứng', quantity: 1, unit: 'quả', allergenTags: ['eggs'] });
  if (hasAny(text, ['sữa', 'milk', 'kem', 'cream', 'yogurt', 'lactose'])) addUnique(recipe, { name: 'Sữa', quantity: 50, unit: 'ml', allergenTags: ['dairy'] });
  if (hasAny(text, ['phô mai', 'cheese'])) addUnique(recipe, { name: 'Phô mai', quantity: 30, unit: 'g', allergenTags: ['dairy'] });
  if (hasAny(text, ['đậu hũ', 'tofu'])) addUnique(recipe, { name: 'Đậu hũ', quantity: 100, unit: 'g', allergenTags: ['soy'] });
  if (hasAny(text, ['đậu nành', 'soy', 'nước tương', 'xì dầu'])) addUnique(recipe, { name: 'Đậu nành', quantity: 20, unit: 'ml', allergenTags: ['soy'] });
  if (hasAny(text, ['đậu phộng', 'lạc', 'peanut'])) addUnique(recipe, { name: 'Đậu phộng', quantity: 20, unit: 'g', allergenTags: ['peanuts'] });
  if (hasAny(text, ['hạnh nhân', 'óc chó', 'hạt điều', 'macca', 'tree nut'])) addUnique(recipe, { name: 'Hạt cây', quantity: 20, unit: 'g', allergenTags: ['tree_nuts'] });
  if (hasAny(text, ['mè', 'vừng', 'sesame'])) addUnique(recipe, { name: 'Mè', quantity: 5, unit: 'g', allergenTags: ['sesame'] });
  if (hasAny(text, ['hành', 'tỏi', 'allium'])) addUnique(recipe, { name: 'Hành tỏi', quantity: 10, unit: 'g', allergenTags: ['allium'] });
  if (hasAny(text, ['bột ngọt', 'msg', 'mì chính'])) addUnique(recipe, { name: 'Bột ngọt', quantity: 2, unit: 'g', allergenTags: ['msg'] });
  if (hasAny(text, ['nước mắm', 'mắm nêm', 'mắm ruốc'])) addUnique(recipe, { name: 'Nước mắm', quantity: 10, unit: 'ml', allergenTags: ['fish'] });
  if (hasAny(text, ['mayonnaise', 'aioli', 'tartar'])) addUnique(recipe, { name: 'Mayonnaise', quantity: 20, unit: 'g', allergenTags: ['eggs'] });

  if (hasAny(text, ['salad', 'rau', 'gỏi'])) addUnique(recipe, { name: 'Rau sống', quantity: 80, unit: 'g' });
  if (hasAny(text, ['nấm', 'mushroom'])) addUnique(recipe, { name: 'Nấm', quantity: 80, unit: 'g' });
  if (hasAny(text, ['khoai', 'potato'])) addUnique(recipe, { name: 'Khoai tây', quantity: 120, unit: 'g' });
  if (hasAny(text, ['trà', 'tea'])) addUnique(recipe, { name: 'Trà', quantity: 1, unit: 'phần' });
  if (hasAny(text, ['cà phê', 'coffee', 'cafe'])) addUnique(recipe, { name: 'Cà phê', quantity: 1, unit: 'phần' });
  if (hasAny(text, ['matcha'])) addUnique(recipe, { name: 'Matcha', quantity: 5, unit: 'g' });
  if (hasAny(text, ['sinh tố', 'nước ép', 'trái cây', 'fruit', 'xoài', 'dâu', 'cam', 'chanh'])) addUnique(recipe, { name: 'Trái cây', quantity: 150, unit: 'g' });

  if (recipe.length > 0) {
    if (!recipe.some((item) => item.name === 'Dầu ăn') && hasAny(text, ['chiên', 'rán', 'xào', 'fried'])) {
      addUnique(recipe, { name: 'Dầu ăn', quantity: 10, unit: 'ml' });
    }
    if (!recipe.some((item) => item.name === 'Sốt đặc biệt') && hasAny(text, ['sốt', 'sauce'])) {
      addUnique(recipe, { name: 'Sốt đặc biệt', quantity: 20, unit: 'g' });
    }
    addUnique(recipe, { name: 'Muối', quantity: 1, unit: 'g' });
    return recipe;
  }

  return [{ name: 'Thành phần tổng hợp', quantity: 1, unit: 'phần' }];
};

const getExistingIngredients = async () => {
  const names = INGREDIENTS.map((seed) => seed.name);
  const ingredients = await IngredientModel.find({ name: { $in: names } }).lean();
  return new Map(ingredients.map((ingredient) => [ingredient.name, ingredient]));
};

const ensureIngredients = async () => {
  const result = new Map<string, any>();
  for (const seed of INGREDIENTS) {
    const allergenTags = sanitizeAllergenTags(seed.allergenTags ?? []);
    const ingredient = await IngredientModel.findOneAndUpdate(
      { name: seed.name },
      {
        $setOnInsert: {
          name: seed.name,
          allergenTags,
          allergenReviewStatus: 'reviewed',
          allergenSource: 'manual',
        },
      },
      { upsert: true, new: true }
    ).lean();
    result.set(seed.name, ingredient);
  }
  return result;
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  console.log(`[backfill:recipes] Mode: ${APPLY ? 'APPLY' : 'DRY_RUN'}${FORCE ? ' FORCE' : ''}`);
  await mongoose.connect(mongoUri);

  const ingredientByName = APPLY ? await ensureIngredients() : await getExistingIngredients();
  const products = await ProductModel.find({}).sort({ name: 1 }).lean();

  let scanned = 0;
  let alreadyHasRecipe = 0;
  let planned = 0;
  let updated = 0;
  const preview: string[] = [];

  for (const product of products) {
    scanned += 1;
    const hasRecipe = Array.isArray(product.recipe) && product.recipe.length > 0;
    if (hasRecipe && !FORCE) {
      alreadyHasRecipe += 1;
      continue;
    }

    const plan = buildRecipePlan(product);
    const missingIngredientNames = plan
      .filter((item) => !ingredientByName.get(item.name)?._id)
      .map((item) => item.name);

    const recipe = plan
      .map((item) => {
        const ingredient = ingredientByName.get(item.name);
        if (!ingredient?._id) return null;
        return {
          ingredientId: ingredient._id,
          quantity: item.quantity,
          unit: item.unit,
        };
      })
      .filter(Boolean);

    if (recipe.length === 0 && APPLY) continue;
    planned += 1;

    if (preview.length < 40) {
      const missingNote = !APPLY && missingIngredientNames.length > 0
        ? ` | will create: ${missingIngredientNames.join(', ')}`
        : '';
      preview.push(`- ${product.name}: ${plan.map((item) => `${item.name} ${item.quantity}${item.unit}`).join(', ')}${missingNote}`);
    }

    if (APPLY) {
      await ProductModel.updateOne({ _id: product._id }, { $set: { recipe } });
      updated += 1;
    }
  }

  console.log(`[backfill:recipes] Products scanned: ${scanned}`);
  console.log(`[backfill:recipes] Products already with recipe: ${alreadyHasRecipe}`);
  console.log(`[backfill:recipes] Products ${APPLY ? 'updated' : 'to update'}: ${APPLY ? updated : planned}`);
  if (preview.length > 0) {
    console.log('[backfill:recipes] Preview:');
    for (const line of preview) console.log(line);
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[backfill:recipes] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
