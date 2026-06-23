import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { IngredientModel } from '@/models/ingredient.model';
import { sanitizeAllergenTags } from '@/constants/allergen-catalog';
import { inferIngredientAllergenTags } from '@/utils/infer-ingredient-allergens';
import { canonicalizeRecipeIngredient } from '@/utils/ingredient-canonical';

dotenv.config();

type CsvRow = Record<string, string>;

type RecipeCsvItem = {
  name: string;
  quantity: number;
  unit: string;
};

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const UPDATE_EXISTING = args.includes('--update-existing');
const getValue = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const csvPath = path.resolve(getValue('--csv') ?? path.resolve(process.cwd(), 'src/foa.products.csv'));

const parseCsv = (content: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;
  if (!header) return [];

  return dataRows.map((values) =>
    header.reduce<CsvRow>((acc, key, index) => {
      acc[key] = values[index] ?? '';
      return acc;
    }, {})
  );
};

const compact = (values: string[]) => values.map((value) => value.trim()).filter(Boolean);

const parseBoolean = (value: string) => value.trim().toLowerCase() !== 'false';

const parseNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseQuantity = (value: string): { quantity: number; unit: string } => {
  const raw = value.trim();
  if (!raw) return { quantity: 1, unit: 'phần' };

  const match = raw.match(/^([\d.,]+)\s*(.*)$/);
  if (!match) return { quantity: 1, unit: raw };

  const quantity = Number(match[1].replace(',', '.'));
  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit: match[2].trim() || 'phần',
  };
};

const inferAllergenTags = (name: string): string[] => {
  const text = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = new Set(text.split(' ').filter(Boolean));
  const has = (phrase: string) => {
    const normalized = phrase
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
  if (has('hạnh nhân') || has('óc chó') || has('hạt điều') || has('macca')) tags.push('tree_nuts');
  if (has('mè') || has('vừng')) tags.push('sesame');
  if (has('hành') || has('tỏi')) tags.push('allium');
  if (has('bột ngọt') || has('mì chính') || has('msg')) tags.push('msg');
  return sanitizeAllergenTags(tags);
};

const getRecipeItems = (row: CsvRow): RecipeCsvItem[] => {
  const result: RecipeCsvItem[] = [];

  for (let index = 0; index < 20; index += 1) {
    const name = row[`recipe[${index}].name`]?.trim();
    if (!name) continue;
    const quantityValue = row[`recipe[${index}].quantity`] ?? '';
    const { quantity, unit } = parseQuantity(quantityValue);
    result.push(...canonicalizeRecipeIngredient({ name, quantity, unit }));
  }

  return result;
};

const ensureIngredients = async (recipeItems: RecipeCsvItem[]) => {
  const ingredientByName = new Map<string, any>();
  const uniqueNames = [...new Set(recipeItems.map((item) => item.name))];

  for (const name of uniqueNames) {
    const allergenTags = inferIngredientAllergenTags(name);
    const ingredient = await IngredientModel.findOneAndUpdate(
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
    ingredientByName.set(name, ingredient);
  }

  return ingredientByName;
};

const buildProductDocument = (row: CsvRow, ingredientByName: Map<string, any>) => {
  const recipeItems = getRecipeItems(row);
  const recipe = recipeItems
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

  return {
    _id: new mongoose.Types.ObjectId(row._id),
    storeId: new mongoose.Types.ObjectId(row.storeId),
    status: 'active',
    nameEmbedding: row.name,
    imgEmbedding: row.image || row.name,
    name: row.name,
    description: row.description,
    image: row.image,
    price: parseNumber(row.price, 1),
    category: row.category,
    restaurant: row.restaurant,
    time: row.time,
    rating: parseNumber(row.rating, 0),
    reviewCount: parseNumber(row.reviewCount, 0),
    recipe,
    allergenTags: compact([row['allergenTags[0]'], row['allergenTags[1]'], row['allergenTags[2]']]),
    healthWarning: row.health_warning || undefined,
    healthTags: compact([row['tags[0]'], row['tags[1]'], row['tags[2]']]),
    isAvailable: parseBoolean(row.isAvailable),
    tags: compact([row['tags[0]'], row['tags[1]'], row['tags[2]']]),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  };
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');
  if (!fs.existsSync(csvPath)) throw new Error(`CSV file not found: ${csvPath}`);

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8')).filter((row) => row._id && row.name && row.storeId);
  const ids = rows.map((row) => new mongoose.Types.ObjectId(row._id));

  console.log(`[sync:products] CSV: ${csvPath}`);
  console.log(`[sync:products] Mode: ${APPLY ? 'APPLY' : 'DRY_RUN'}${UPDATE_EXISTING ? ' UPDATE_EXISTING' : ' INSERT_MISSING_ONLY'}`);
  console.log(`[sync:products] CSV products: ${rows.length}`);

  await mongoose.connect(mongoUri);

  const existingCount = await ProductModel.collection.countDocuments({ _id: { $in: ids } });
  const missingCount = rows.length - existingCount;
  const allRecipeItems = rows.flatMap(getRecipeItems);
  const uniqueIngredientCount = new Set(allRecipeItems.map((item) => item.name)).size;

  console.log(`[sync:products] Existing products by CSV _id: ${existingCount}`);
  console.log(`[sync:products] Missing products by CSV _id: ${missingCount}`);
  console.log(`[sync:products] Recipe ingredient names in CSV: ${uniqueIngredientCount}`);

  const preview = rows.slice(0, 10).map((row) => `- ${row.name} (${row._id})`);
  console.log('[sync:products] Preview:');
  for (const line of preview) console.log(line);

  if (!APPLY) {
    await mongoose.disconnect();
    return;
  }

  const ingredientByName = await ensureIngredients(allRecipeItems);
  const operations = rows.map((row) => {
    const doc = buildProductDocument(row, ingredientByName);
    if (UPDATE_EXISTING) {
      const { _id, ...set } = doc;
      return {
        updateOne: {
          filter: { _id },
          update: {
            $set: set,
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      };
    }

    return {
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $setOnInsert: {
            ...doc,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  const result = operations.length > 0
    ? await ProductModel.collection.bulkWrite(operations, { ordered: false })
    : null;

  console.log(`[sync:products] Upserted: ${result?.upsertedCount ?? 0}`);
  console.log(`[sync:products] Modified: ${result?.modifiedCount ?? 0}`);
  console.log(`[sync:products] Matched: ${result?.matchedCount ?? 0}`);

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[sync:products] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
