import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { VariationModel, VariationOptionModel } from '@/models/variation.model';
import {
  getSharedToppingRulesForProduct,
  SHARED_TOPPING_GROUP_NAME,
  SIDE_DISH_CATEGORY,
  SHARED_TOPPING_RULES,
} from '@/config/shared-toppings';

dotenv.config();

interface CsvProductRow {
  _id: string;
  name: string;
  category: string;
  price: string;
  storeId: string;
  [key: string]: string;
}

type VariantGroup = {
  name: string;
  required: boolean;
  multiple: boolean;
  maxChoices: number;
  options: { choice: string; extraPrice: number }[];
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getValue = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  return {
    apply: args.includes('--apply'),
    csvPreview: args.includes('--csv-preview'),
    csvPath: getValue('--csv') ?? path.resolve(process.cwd(), 'src/foa.products.csv'),
  };
};

const parseCsv = (content: string): CsvProductRow[] => {
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
    header.reduce<CsvProductRow>((acc, key, index) => {
      acc[key] = values[index] ?? '';
      return acc;
    }, {} as CsvProductRow),
  );
};

const readCsvProducts = (csvPath: string) => {
  const absolutePath = path.resolve(csvPath);
  const csv = fs.readFileSync(absolutePath, 'utf8');
  return parseCsv(csv).filter((row) => row._id && row.name && row.storeId);
};

const buildToppingPriceByStore = (rows: CsvProductRow[]) => {
  const result = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (row.category !== SIDE_DISH_CATEGORY) continue;

    const storeToppings = result.get(row.storeId) ?? new Map<string, number>();
    storeToppings.set(row.name, Number(row.price) || 0);
    result.set(row.storeId, storeToppings);
  }

  return result;
};

const buildToppingVariant = (
  product: { name: string; category: string; tags?: string[] },
  storeToppingPrices: Map<string, number> | undefined,
): VariantGroup | null => {
  const options = getSharedToppingRulesForProduct(product).map((rule) => ({
    choice: rule.sourceProductName,
    extraPrice: storeToppingPrices?.get(rule.sourceProductName) ?? rule.fallbackPrice,
  }));

  if (options.length === 0) return null;

  return {
    name: SHARED_TOPPING_GROUP_NAME,
    required: false,
    multiple: true,
    maxChoices: Math.min(3, options.length),
    options,
  };
};

const main = async () => {
  const { apply, csvPreview, csvPath } = parseArgs();
  const rows = readCsvProducts(csvPath);
  const storeToppingPrices = buildToppingPriceByStore(rows);
  const storeIds = Array.from(new Set(rows.map((row) => row.storeId)));

  console.log(`[setup:toppings] CSV products: ${rows.length}`);
  console.log(`[setup:toppings] Stores: ${storeIds.length}`);
  console.log(`[setup:toppings] Shared topping catalog: ${SHARED_TOPPING_RULES.length}`);
  console.log(`[setup:toppings] Mode: ${csvPreview ? 'CSV_PREVIEW' : apply ? 'APPLY' : 'DRY_RUN'}`);

  if (csvPreview) {
    let planned = 0;
    const preview: string[] = [];

    for (const row of rows) {
      if (row.category === SIDE_DISH_CATEGORY) continue;

      const toppingGroup = buildToppingVariant(
        { name: row.name, category: row.category, tags: [row['tags[0]'], row['tags[1]'], row['tags[2]']].filter(Boolean) },
        storeToppingPrices.get(row.storeId),
      );

      if (!toppingGroup) continue;
      planned += 1;
      if (preview.length < 25) {
        preview.push(
          `- ${row.name}: ${toppingGroup.options
            .map((option) => `${option.choice} (+${option.extraPrice})`)
            .join(', ')}`,
        );
      }
    }

    console.log(`[setup:toppings] CSV products with toppings: ${planned}`);
    console.log('[setup:toppings] CSV preview:');
    for (const item of preview) console.log(item);
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. The script needs DB access to update products.');
  }

  await mongoose.connect(mongoUri);

  let scanned = 0;
  let changed = 0;
  const preview: string[] = [];

  // Find or create the Shared Toppings Variation
  let toppingVariation = await VariationModel.findOne({ name: SHARED_TOPPING_GROUP_NAME });
  if (!toppingVariation && apply) {
    toppingVariation = await VariationModel.create({
      name: SHARED_TOPPING_GROUP_NAME,
      description: 'Shared toppings variation group',
    });
  }

  for (const storeId of storeIds) {
    const products = await ProductModel.find({
      storeId,
      category: { $ne: SIDE_DISH_CATEGORY },
    });

    for (const product of products) {
      scanned += 1;

      const toppingGroup = buildToppingVariant(
        {
          name: product.name,
          category: product.category,
          tags: product.tags ?? [],
        },
        storeToppingPrices.get(storeId),
      );

      if (!toppingGroup) continue;

      // Check if product already references the Shared Toppings Variation
      const hasTopping = toppingVariation && product.variationIds.includes(toppingVariation._id);

      if (!hasTopping) {
        changed += 1;
        if (preview.length < 25) {
          const optionNames = toppingGroup.options.map((option) => `${option.choice} (+${option.extraPrice})`).join(', ');
          preview.push(`- ${product.name}: ${optionNames}`);
        }

        if (apply && toppingVariation) {
          // Add options under the topping variation
          for (const opt of toppingGroup.options) {
            await VariationOptionModel.findOneAndUpdate(
              { variationId: toppingVariation._id, name: opt.choice },
              { $set: { extraPrice: opt.extraPrice, isAvailable: true } },
              { upsert: true }
            );
          }
          // Push Variation ID to product
          await ProductModel.updateOne(
            { _id: product._id },
            { $addToSet: { variationIds: toppingVariation._id } }
          );
        }
      }
    }
  }

  console.log(`[setup:toppings] Scanned products: ${scanned}`);
  console.log(`[setup:toppings] Products ${apply ? 'updated' : 'to update'}: ${changed}`);
  if (preview.length > 0) {
    console.log('[setup:toppings] Preview:');
    for (const item of preview) console.log(item);
  }

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('[setup:toppings] Failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
