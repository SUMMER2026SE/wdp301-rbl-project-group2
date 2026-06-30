import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { GEMINI_API_KEY, GROQ_API_KEY } from '@/constants/env';
import axios from 'axios';
import { z } from 'zod';
import ProductModel from '@/models/product.model';
import { CampaignModel } from '@/models/campaign.model';
import OrderModel from '@/models/order.model';
import VoucherModel from '@/models/voucher.model';
import UserVoucherModel from '@/models/user-voucher.model';
import { StoreModel } from '@/models/store.model';
import { ALLERGEN_CATALOG } from '@/constants/allergen-catalog';

export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
export const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
export const groq = new Groq({ apiKey: GROQ_API_KEY });
export const embeddingModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-2' });

const dotProduct = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);
const magnitude = (a: number[]) => Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
export const cosineSimilarity = (a: number[], b: number[]) => {
  if (!a || !b || a.length !== b.length) return 0;
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
};

const reviewModerationSchema = z.object({
  action: z.enum(['allow', 'delete']),
  toxic: z.boolean(),
  category: z
    .enum(['none', 'profanity', 'harassment', 'hate', 'sexual', 'threat', 'spam', 'malicious'])
    .default('none'),
  confidence: z.number().min(0).max(1).default(0),
  reason: z.string().max(200).default(''),
});

export type ReviewModerationResult = z.infer<typeof reviewModerationSchema>;

const normalizeReviewModerationText = (comment: string) =>
  comment
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/([a-z0-9])\1{2,}/g, '$1')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const explicitProfanityPattern =
  /\b(dm|dmm|dcm|dit|djt|dit me|du ma|vl|vcl|vkl|lon|cac|buoi|fuck|shit|bitch|asshole|kill yourself)\b/i;
const explicitHarassmentPattern =
  /\b(ngu|oc cho|vo hoc|do rac|rac ruoi|cho chet|con di|thang dien|do dien)\b/i;

const moderateExplicitToxicLanguage = (comment: string): ReviewModerationResult | null => {
  const normalized = normalizeReviewModerationText(comment);

  if (explicitProfanityPattern.test(normalized)) {
    return {
      action: 'delete',
      toxic: true,
      category: 'profanity',
      confidence: 0.98,
      reason: 'Phat hien ngon ngu tho tuc hoac tieng long xuc pham',
    };
  }

  if (explicitHarassmentPattern.test(normalized)) {
    return {
      action: 'delete',
      toxic: true,
      category: 'harassment',
      confidence: 0.95,
      reason: 'Phat hien noi dung cong kich hoac xuc pham',
    };
  }

  return null;
};

const toxicKeywordPattern =
  /\b(dm|dmm|dit|djt|lon|lồn|cặc|cac|buồi|buoi|đụ|du ma|địt mẹ|đĩ|cho chet|chó chết|fuck|shit|bitch|asshole|kill yourself)\b/i;

const fallbackModerateReviewComment = (comment: string): ReviewModerationResult => {
  if (toxicKeywordPattern.test(comment)) {
    return {
      action: 'delete',
      toxic: true,
      category: 'profanity',
      confidence: 0.8,
      reason: 'Phat hien ngon ngu tho tuc bang bo loc du phong',
    };
  }

  return {
    action: 'allow',
    toxic: false,
    category: 'none',
    confidence: 0,
    reason: 'Khong phat hien vi pham bang bo loc du phong',
  };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('AI moderation timeout')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const moderateReviewComment = async (comment?: string | null): Promise<ReviewModerationResult> => {
  const normalizedComment = comment?.trim();
  if (!normalizedComment) {
    return { action: 'allow', toxic: false, category: 'none', confidence: 1, reason: 'Empty comment' };
  }

  const explicitViolation = moderateExplicitToxicLanguage(normalizedComment);
  if (explicitViolation) {
    return explicitViolation;
  }

  const commentForAi = normalizedComment.slice(0, 1000);

  const prompt = `You are a content moderation classifier for customer food reviews.
Only inspect the review text. Do not infer anything about the customer.
Delete only if the text contains toxic intent, profanity, harassment, hate, sexual content, threats, spam, or malicious abuse.
Allow normal negative feedback about food, delivery, price, or service.
Vietnamese slang, obfuscated profanity, and elongated insults such as "nguuu", "vl", "vcl", or "dm" are violations.

Review text:
${JSON.stringify(commentForAi)}

Return JSON only:
{
  "action": "allow" | "delete",
  "toxic": boolean,
  "category": "none" | "profanity" | "harassment" | "hate" | "sexual" | "threat" | "spam" | "malicious",
  "confidence": number,
  "reason": "short Vietnamese reason"
}`;

  try {
    const completion = await withTimeout(
      groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      8000
    );

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = reviewModerationSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error('Invalid review moderation shape');

    if (parsed.data.action === 'delete' && parsed.data.confidence < 0.65) {
      return {
        action: 'allow',
        toxic: false,
        category: 'none',
        confidence: parsed.data.confidence,
        reason: 'AI confidence below delete threshold',
      };
    }

    return parsed.data;
  } catch {
    return fallbackModerateReviewComment(normalizedComment);
  }
};

// ── Custom AI Microservice ────────────────────────────────────────────────────
const AI_MICROSERVICE_URL = process.env.AI_MICROSERVICE_URL || 'http://localhost:8001';

async function isMicroserviceAvailable(): Promise<boolean> {
  try {
    const res = await axios.get(`${AI_MICROSERVICE_URL}/health`, { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface ProductForAI {
  _id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  healthTags?: string[];
  recipe: { name: string; quantity?: string }[];
  price: number;
  rating: number;
}

interface Preferences {
  dietary: string[];
  allergies: string[];
  healthGoals: string[];
  tastes?: string[];
}

export interface AIRecommendation {
  productId: string;
  reason: string;
  healthScore: number; // 1-10
}

export const getAIRecommendations = async (
  products: ProductForAI[],
  preferences: Preferences,
  similarUsersTopProducts?: string[], // Collaborative filtering context (legacy)
  userId?: string
): Promise<AIRecommendation[]> => {

  const productList = products.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    description: p.description,
    category: p.category,
    tags: p.tags,
    health_tags: p.healthTags ?? [],
    recipe: p.recipe,
    ingredients: p.recipe.map((r) => r.name),
    price: p.price,
    rating: p.rating,
  }));

  if (productList.length === 0) {
    return [];
  }

  const nRecommend = Math.min(6, productList.length);

  // ── 1. Try Custom ML Microservice ─────────────────────────────────────────
  if (userId && await isMicroserviceAvailable()) {
    try {
      const res = await axios.post(`${AI_MICROSERVICE_URL}/recommend`, {
        user_id: userId,
        products: productList,
        preferences,
        n: nRecommend,
      }, { timeout: 10000 });

      const results = res.data as AIRecommendation[];
      if (results && results.length > 0) {
        console.log('[AI] Using Custom ML Microservice for recommendations');
        return results;
      }
    } catch (err) {
      console.warn('[AI] Microservice recommend failed, falling back to Groq:', err);
    }
  }

  // ── 2. Fallback: Groq (LLM prompt-based) ─────────────────────────────────
  const collaborativeSection =
    similarUsersTopProducts && similarUsersTopProducts.length > 0
      ? `\nHÀNH VI CỦA NGƯỜI DÙNG TƯƠNG TỰ (Collaborative Filtering):\nNhững người dùng có cùng hồ sơ sức khỏe thường đặt nhiều các món sau:\n${similarUsersTopProducts.map((name, i) => `  ${i + 1}. ${name}`).join('\n')}\nHãy xem xét những món này nếu chúng phù hợp với hồ sơ sức khỏe của người dùng hiện tại.\n`
      : '';

  const maxPick = nRecommend;
  const prompt = `Bạn là chuyên gia dinh dưỡng. Hãy LỰA CHỌN tối đa ${maxPick} gợi ý phù hợp nhất từ danh sách món ăn (có thể ít hơn ${maxPick} nếu chỉ có vài món thật sự phù hợp — KHÔNG được bịa thêm món ngoài danh sách).
QUAN TRỌNG: Đa dạng giữa các lần gọi; không luôn chọn cùng một bộ món nếu có nhiều lựa chọn phù hợp.

HỒ SƠ SỨC KHỎE NGƯỜI DÙNG:
- Dị ứng: ${preferences.allergies.length > 0 ? preferences.allergies.join(', ') : 'Không có'}
- Chế độ ăn kiêng (Dietary): ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'Không có'}
- Mục tiêu sức khỏe: ${preferences.healthGoals.length > 0 ? preferences.healthGoals.join(', ') : 'Không có'}
${collaborativeSection}
DANH SÁCH MÓN ĂN:
${JSON.stringify(productList, null, 2)}

YÊU CẦU:
1. TUYỆT ĐỐI KHÔNG gợi ý món chứa nguyên liệu người dùng bị dị ứng
2. Ưu tiên món phù hợp với mục tiêu ăn uống và bệnh lý
3. Trả về JSON duy nhất với format:
{
  "recommendations": [
    {
      "productId": "id của sản phẩm",
      "reason": "Lý do ngắn gọn bằng tiếng Việt (tối đa 20 từ)",
      "healthScore": 8
    }
  ]
}
Chỉ trả về JSON, không giải thích thêm.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(text);
    return parsed.recommendations as AIRecommendation[];
  } catch (err) {
    console.error('Groq Recommendations error:', err);
    return products
      .sort((a, b) => b.rating - a.rating)
      .slice(0, Math.min(6, products.length))
      .map((p) => ({
        productId: p._id.toString(),
        reason: 'Được đánh giá cao bởi người dùng',
        healthScore: 7,
      }));
  }
};




export const parseOrderNoteForStaff = async (rawNote?: string): Promise<string[]> => {
  if (!rawNote?.trim()) return [];

  // ── 1. Try Custom AI Microservice ─────────────────────────────────────────
  if (await isMicroserviceAvailable()) {
    try {
      const res = await axios.post(`${AI_MICROSERVICE_URL}/chat/parse-note`, {
        note: rawNote,
      }, { timeout: 8000 });
      const items = res.data?.items as string[];
      if (items && items.length > 0) {
        console.log('[AI] Using Microservice for order note parsing');
        return items;
      }
    } catch (err) {
      console.warn('[AI] Microservice parse-note failed, falling back to Gemini:', err);
    }
  }

  // ── 2. Fallback: Gemini ───────────────────────────────────────────────────
  const prompt = `
Bạn là trợ lý xử lý đơn cho cửa hàng đồ ăn.

Nhiệm vụ:
Phân tích ghi chú của khách và chuyển thành danh sách ngắn gọn để nhân viên bếp đọc nhanh.

MỤC TIÊU OUTPUT:
- Mỗi ý là một chuỗi ngắn, rõ ràng, hành động được.
- Ưu tiên cách viết ngắn theo văn phong vận hành bếp.
- Không giải thích dài dòng.
- Không thêm thông tin ngoài ghi chú khách.

QUY TẮC CHUẨN HÓA:
1. Nếu khách nói bị dị ứng với thành phần nào, chuyển thành dạng "không <thành phần>".
2. Nếu khách nói "không bỏ/lấy X", "bỏ X", "không X", chuyển thành "không X".
4. Nếu khách nói "thêm X", chuyển thành "thêm X".
5. Nếu có nhiều ý, tách thành nhiều phần tử trong mảng theo đúng thứ tự xuất hiện trong ghi chú.
6. Chỉ trả về JSON hợp lệ, duy nhất, không kèm markdown, không kèm giải thích:
{
  "items": ["...", "..."]
}
Ghi chú khách:
"${rawNote}"
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.items)) throw new Error('Invalid items format');

    return parsed.items
      .map((item: unknown) => String(item).trim())
      .filter(Boolean)
      .slice(0, 10);
  } catch (error) {
    console.error('parseOrderNoteForStaff error:', error);

    return [rawNote.trim()];
  }
};

export interface AISafeFoodInsight {
  productId: string;
  aiReason: string;
}

export const getAISafeFoodInsights = async (
  safeProducts: ProductForAI[],
  preferences: Preferences
): Promise<AISafeFoodInsight[]> => {
  const productsToAnalyze = safeProducts.slice(0, 20);
  if (productsToAnalyze.length === 0) return [];

  // ── 1. Try Custom AI Microservice ─────────────────────────────────────────
  if (await isMicroserviceAvailable()) {
    try {
      const res = await axios.post(`${AI_MICROSERVICE_URL}/chat/safe-food-insights`, {
        products: productsToAnalyze.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          description: p.description,
          recipe: p.recipe,
          tags: p.tags,
          health_tags: p.healthTags ?? [],
        })),
        preferences,
      }, { timeout: 10000 });

      const insights = res.data?.insights as { productId: string; aiReason: string }[];
      if (insights && insights.length > 0) {
        console.log('[AI] Using Microservice for safe food insights');
        return insights;
      }
    } catch (err) {
      console.warn('[AI] Microservice safe-food-insights failed, falling back to Gemini:', err);
    }
  }

  // ── 2. Fallback: Gemini ───────────────────────────────────────────────────
  const productList = productsToAnalyze.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    ingredients: p.recipe.map((r) => r.name),
    health_tags: p.healthTags ?? [],
  }));

  const prompt = `Bạn là chuyên gia dinh dưỡng. Trách nhiệm của bạn là giải thích TẠI SAO các món ăn dưới đây an toàn. Tất cả món đều 100% không chứa chất gây dị ứng của họ.
HỒ SƠ SỨC KHỎE:
- Dị ứng: ${preferences.allergies.join(', ')}
- Ăn kiêng: ${preferences.dietary.join(', ')}
- Mục tiêu: ${preferences.healthGoals.join(', ')}

DANH SÁCH:
${JSON.stringify(productList, null, 2)}

YÊU CẦU:
1. Giải thích ngắn (max 25 từ) cho MỖI món.
2. Trả về JSON:
{
  "insights": [{"productId": "...", "aiReason": "..."}]
}

Bắt buộc trả về thuần JSON, không có text giải thích bên ngoài.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in safe foods AI response');

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.insights as AISafeFoodInsight[];
  } catch (err) {
    console.error('Gemini Safe Foods Insight error:', err);
    return productsToAnalyze.map((p) => ({
      productId: p._id.toString(),
      aiReason: 'Món ăn an toàn, đã được sàng lọc không chứa thành phần gây dị ứng của bạn.',
    }));
  }
};

