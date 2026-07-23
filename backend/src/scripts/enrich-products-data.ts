import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import ProductModel from '@/models/product.model';
import { IngredientModel } from '@/models/ingredient.model';
import { ALLERGEN_CATALOG } from '@/constants/allergen-catalog';

dotenv.config();

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is missing in environment variables');
  process.exit(1);
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('ERROR: GROQ_API_KEY is missing in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-2' });
const groqClient = new Groq({ apiKey: GROQ_API_KEY });
const GROQ_ENRICHMENT_MODEL = process.env.GROQ_ENRICHMENT_MODEL || process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-20b';

// Helper delay để tránh chạm rate limit khi chạy script enrich dữ liệu.
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureIngredientInDb = async (name: string, allergenTags: string[]): Promise<mongoose.Types.ObjectId> => {
  // Chuẩn hóa viết hoa tên nguyên liệu trước khi lưu.
  const capitalizedName = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  let ingredient = await IngredientModel.findOne({ name: capitalizedName });
  if (!ingredient) {
    if (APPLY) {
      ingredient = await IngredientModel.create({
        name: capitalizedName,
        allergenTags: allergenTags,
        allergenReviewStatus: 'reviewed',
        allergenSource: 'ai',
      });
      console.log(`[Database] Created missing ingredient: "${capitalizedName}"`);
    } else {
      // Object giả lập cho chế độ dry run, không ghi DB.
      return new mongoose.Types.ObjectId();
    }
  } else if (APPLY && allergenTags.length > 0) {
    // Gộp thêm allergen tag còn thiếu cho nguyên liệu đã tồn tại.
    const existingTags = new Set(ingredient.allergenTags || []);
    let updated = false;
    for (const tag of allergenTags) {
      if (!existingTags.has(tag)) {
        ingredient.allergenTags.push(tag);
        updated = true;
      }
    }
    if (updated) {
      await ingredient.save();
      console.log(`[Database] Updated allergens for ingredient: "${capitalizedName}" -> ${ingredient.allergenTags.join(', ')}`);
    }
  }
  return ingredient._id as mongoose.Types.ObjectId;
};

const getAIEnrichmentForProduct = async (product: any, retries = 5): Promise<any> => {
  const prompt = `You are a food nutrition database expert. Analyze this food product and deduce its standard recipe ingredients and its allergen tags.
Product Name: "${product.name}"
Product Description: "${product.description || ''}"
Category: "${product.category}"

ALLERGEN CATALOG (Possible Allergen Tags you can use, only use these IDs):
${JSON.stringify(ALLERGEN_CATALOG.map((c) => ({ id: c.id, label: c.label })), null, 2)}

Instructions:
1. Deduce a realistic list of ingredients (recipes) with approximate quantities and units (e.g. "g", "ml", "cái", "phần").
2. Standardize the ingredient names in Vietnamese (e.g. "Thịt heo", "Tôm", "Nước mắm", "Bột mì", "Bơ sữa").
3. Determine the list of allergens (from the ID list in ALLERGEN CATALOG) that are present in this food. If there's any cross-contamination risk or "may contain", identify those as well.
4. Output JSON format only:
{
  "ingredients": [
    { "name": "Tên nguyên liệu", "quantity": 100, "unit": "g", "allergenTags": ["shrimp"] }
  ],
  "allergenTags": ["egg", "gluten"],
  "mayContain": ["peanuts"],
  "crossContaminationRisk": true
}`;

  try {
    const result = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: GROQ_ENRICHMENT_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });
    const text = result.choices[0]?.message?.content;
    if (!text) throw new Error('No content in Groq response');
    return JSON.parse(text);
  } catch (error: any) {
    if (error.message?.includes('429') && retries > 0) {
      console.log(`  -> [Groq 429 Too Many Requests] Rate limit hit. Waiting 30 seconds before retry... (${retries} retries left)`);
      await delay(30000);
      return getAIEnrichmentForProduct(product, retries - 1);
    }
    console.error(`[AI Error] Failed to generate details for product: ${product.name}`, error.message);
    return null;
  }
};

const getAIEmbeddingForProduct = async (productName: string, description: string, ingredientsText: string, allergensText: string, retries = 5): Promise<any> => {
  const textToEmbed = `Tên món: ${productName}\nMô tả: ${description}\nThành phần: ${ingredientsText}\nDị ứng: ${allergensText}`;
  try {
    const result = await embeddingModel.embedContent(textToEmbed);
    return result.embedding.values;
  } catch (error: any) {
    if (error.message?.includes('429') && retries > 0) {
      console.log(`  -> [429 Too Many Requests] Rate limit hit. Waiting 45 seconds before retry... (${retries} retries left)`);
      await delay(45000);
      return getAIEmbeddingForProduct(productName, description, ingredientsText, allergensText, retries - 1);
    }
    console.error(`[AI Error] Failed to generate embedding for: ${productName}`, error.message);
    return null;
  }
};

const main = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is missing');

  console.log(`[enrich:products] Starting. Mode: ${APPLY ? 'APPLY (Writing to DB)' : 'DRY_RUN (Read only)'}${FORCE ? ' | FORCE (Overwriting existing)' : ''}`);
  await mongoose.connect(mongoUri);

  const products = await ProductModel.find({});
  console.log(`[enrich:products] Found ${products.length} products to evaluate.`);

  let updatedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n[${i + 1}/${products.length}] Product: "${product.name}"`);

    const hasRecipe = Array.isArray(product.recipe) && product.recipe.length > 0;
    const hasEmbedding = Array.isArray(product.embedding) && product.embedding.length > 0;
    const hasAllergens = Array.isArray(product.allergenTags) && product.allergenTags.length > 0;

    if (hasRecipe && hasEmbedding && hasAllergens && !FORCE) {
      console.log(`  -> Skipping. Already has recipe, allergens, and embedding.`);
      continue;
    }

    // 1. Fetch AI details (Recipe + Allergens)
    console.log(`  -> Asking Gemini for recipe and allergens...`);
    const enrichment = await getAIEnrichmentForProduct(product);
    if (!enrichment) {
      console.log(`  -> Failed to enrich. Skipping.`);
      continue;
    }

    console.log(`  -> Gemini deduced ingredients:`, enrichment.ingredients.map((ing: any) => ing.name).join(', '));
    console.log(`  -> Gemini deduced allergens:`, enrichment.allergenTags.join(', '));
    console.log(`  -> Gemini deduced cross contamination:`, enrichment.crossContaminationRisk, `(May contain: ${enrichment.mayContain?.join(', ') || 'None'})`);

    // 2. Resolve ingredient IDs and build recipe array
    const recipeItems = [];
    for (const ing of enrichment.ingredients) {
      const ingredientId = await ensureIngredientInDb(ing.name, ing.allergenTags || []);
      recipeItems.push({
        ingredientId,
        quantity: Number(ing.quantity) || 1,
        unit: String(ing.unit) || 'g',
      });
    }

    // 3. Generate Embedding
    const ingredientsText = enrichment.ingredients.map((ing: any) => ing.name).join(', ');
    const allergensText = [...enrichment.allergenTags, ...(enrichment.mayContain || [])].join(', ');
    console.log(`  -> Generating vector embedding using Gemini text-embedding-004...`);
    const embedding = await getAIEmbeddingForProduct(product.name, product.description || '', ingredientsText, allergensText);

    if (APPLY) {
      product.recipe = recipeItems as any;
      product.allergenTags = enrichment.allergenTags || [];
      product.mayContain = enrichment.mayContain || [];
      product.crossContaminationRisk = enrichment.crossContaminationRisk || false;
      if (embedding) {
        product.embedding = embedding;
      }
      await product.save();
      console.log(`  -> [Database] Successfully updated product "${product.name}"`);
    } else {
      console.log(`  -> [Dry Run] Product "${product.name}" would be updated.`);
    }

    updatedCount++;
    // Tạm nghỉ giữa các request để tôn trọng giới hạn API.
    await delay(2500);
  }

  console.log(`\n[enrich:products] Completed. Processed/Updated: ${updatedCount} products.`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('[enrich:products] Fatal execution error:', err);
  process.exit(1);
});
