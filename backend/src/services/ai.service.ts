import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { GEMINI_API_KEY, GROQ_API_KEY } from '@/constants/env';
import axios from 'axios';
import { z } from 'zod';
import { OrderStatus } from '@/types';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const groq = new Groq({ apiKey: GROQ_API_KEY });

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

const campaignSuggestionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1).default('discount'),
  summary: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  products: z.array(z.object({
    productId: z.string().min(1),
    name: z.string().min(1),
    reason: z.string().min(1),
    discount: z.number().min(0).max(100).optional(),
    fixedPrice: z.number().min(0).nullable().optional(),
    soldQuantity: z.number().int().nonnegative().optional(),
  })).min(1),
});

export interface CampaignSuggestionProduct {
  productId: string;
  name: string;
  reason: string;
  discount?: number;
  fixedPrice?: number | null;
  soldQuantity?: number;
}

export interface CampaignSuggestion {
  name: string;
  type: string;
  summary: string;
  startTime?: string;
  endTime?: string;
  products: CampaignSuggestionProduct[];
}

interface Preferences {
  dietary: string[];
  allergies: string[];
  healthGoals: string[];
}

export interface AIRecommendation {
  productId: string;
  reason: string;
  healthScore: number; // 1-10
}

const buildFallbackCampaignSuggestion = (context: {
  products: Array<{ _id: string; name: string; price: number; category?: string; rating?: number; reviewCount?: number }>;
  orders: Array<{ status?: string; items?: Array<{ productId: string; quantity: number; subTotal?: number }> }>;
  days: number;
}): CampaignSuggestion => {
  const relevantStatuses = new Set<string>([
    OrderStatus.COMPLETED,
    OrderStatus.DELIVERED,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.DELIVERING,
  ]);

  const salesByProduct = new Map<string, { productId: string; name: string; price: number; quantity: number; revenue: number }>();

  context.orders.forEach((order) => {
    if (!order.items?.length || !relevantStatuses.has(order.status ?? '')) return;

    order.items.forEach((item) => {
      const existing = salesByProduct.get(item.productId) ?? { productId: item.productId, name: '', price: 0, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.subTotal ?? 0;
      salesByProduct.set(item.productId, existing);
    });
  });

  const products = context.products.map((product) => {
    const stat = salesByProduct.get(product._id.toString());
    return {
      ...product,
      quantity: stat?.quantity ?? 0,
      revenue: stat?.revenue ?? 0,
    };
  });

  const rankedProducts = products
    .sort((a, b) => (b.quantity * 1000 + b.revenue) - (a.quantity * 1000 + a.revenue))
    .slice(0, 3);

  const fallbackProducts = rankedProducts.length > 0
    ? rankedProducts.map((product, index) => ({
      productId: product._id.toString(),
      name: product.name,
      reason: index === 0 ? 'Món có nhiều lượt đặt nhất trong khoảng thời gian phân tích' : 'Món có sức hút tốt và phù hợp để kích hoạt ưu đãi',
      discount: Math.max(8, 18 - index * 4),
    }))
    : context.products.slice(0, 3).map((product, index) => ({
      productId: product._id.toString(),
      name: product.name,
      reason: 'Món đang có điểm đánh giá tốt, phù hợp cho khuyến mãi hấp dẫn',
      discount: 10 + index * 2,
    }));

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return {
    name: `Ưu đãi bán chạy ${context.days} ngày`,
    type: 'discount',
    summary: `Gợi ý ưu đãi theo dữ liệu bán hàng trong ${context.days} ngày gần nhất, ưu tiên các món có lượng đặt cao và doanh thu ổn định.`,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    products: fallbackProducts,
  };
};

export const suggestCampaignFromAnalytics = async (context: {
  products: Array<{ _id: string; name: string; price: number; category?: string; rating?: number; reviewCount?: number }>;
  orders: Array<{ status?: string; items?: Array<{ productId: string; quantity: number; subTotal?: number }> }>;
  days: number;
}): Promise<CampaignSuggestion> => {
  if (context.products.length === 0) {
    return buildFallbackCampaignSuggestion(context);
  }

  const prompt = `Bạn là trợ lý bán hàng cho hệ thống đặt đồ ăn. Dựa trên dữ liệu bán hàng gần đây, hãy đề xuất một chiến dịch khuyến mãi ngắn hạn bằng tiếng Việt. Chỉ trả về JSON.

Dữ liệu sản phẩm:
${JSON.stringify(context.products.slice(0, 10), null, 2)}

Dữ liệu đơn hàng gần đây:
${JSON.stringify(context.orders.slice(0, 20), null, 2)}

Yêu cầu:
- Chọn 3 sản phẩm phù hợp nhất để khuyến mãi.
- Gợi ý tên chiến dịch, loại ưu đãi, mô tả ngắn, thời gian bắt đầu/kết thúc và mức giảm phù hợp.
- Trả về JSON đúng schema: {"name":"","type":"discount","summary":"","startTime":"","endTime":"","products":[{"productId":"","name":"","reason":"","discount":10}]}
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = campaignSuggestionSchema.safeParse(JSON.parse(raw));

    if (parsed.success) {
      return parsed.data;
    }
  } catch (error) {
    console.warn('Campaign suggestion AI fallback triggered:', error);
  }

  return buildFallbackCampaignSuggestion(context);
};

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

export const getAIResponseForChat = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  message: string,
  userContext?: {
    fullName: string;
    preferences: Preferences;
    safeProducts: { name: string; description: string }[]
  } | null
): Promise<string> => {

  // ── 1. Try Custom AI Microservice ─────────────────────────────────────────
  if (await isMicroserviceAvailable()) {
    try {
      const res = await axios.post(`${AI_MICROSERVICE_URL}/chat/message`, {
        message,
        history,
        userContext,
      }, { timeout: 30000 });

      const response = res.data?.response as string;
      if (response) {
        console.log('[AI] Using Microservice for chat');
        return response;
      }
    } catch (err) {
      console.warn('[AI] Microservice chat failed, falling back to Groq:', err);
    }
  }

  // ── 2. Fallback: Groq ─────────────────────────────────────────────────────
  const messages = history.map((h) => ({
    role: h.role === 'model' ? 'assistant' : 'user',
    content: h.parts[0].text,
  }));

  let contextSnippet = '';
  if (userContext) {
    const { fullName, preferences, safeProducts } = userContext;
    contextSnippet = `
            THÔNG TIN NGƯỜI DÙNG HIỆN TẠI:
            - Tên: ${fullName}
            - Dị ứng: ${preferences.allergies.length > 0 ? preferences.allergies.join(', ') : 'Không có'}
            - Chế độ ăn kiêng: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'Không có'}
            - Mục tiêu sức khỏe: ${preferences.healthGoals.length > 0 ? preferences.healthGoals.join(', ') : 'Không có'}
            
            DANH SÁCH MÓN ĂN AN TOÀN GỢI Ý (Bạn hãy ưu tiên nhắc đến những món này):
            ${safeProducts.map(p => `- ${p.name}: ${p.description}`).join('\n')}
            
            HƯỚNG DẪN: hãy chào ${fullName} một cách thân thiện. Sử dụng thông tin sức khỏe trên để tư vấn món ăn. 
            Nếu người dùng hỏi về món ăn không nằm trong danh sách an toàn, hãy nhắc nhở họ kiểm tra kỹ thành phần.`;
  }

  const systemPrompt = {
    role: 'system',
    content: `Bạn là Chatbot hỗ trợ thông minh của FOA (Food Order App). 
            FOA là ứng dụng gọi món ăn tập trung vào sức khỏe người dùng, 
            giúp gợi ý món ăn dựa trên hồ sơ sức khỏe, dị ứng và mục tiêu dinh dưỡng.
            
            QUY TẮC CỐT LÕI:
            1. Bạn PHẢI nhận diện và chào người dùng bằng tên nếu được cung cấp ở phần THÔNG TIN NGƯỜI DÙNG bên dưới.
            2. Bạn đã nắm rõ Dị ứng, Chế độ ăn và Mục tiêu của họ. Tuyệt đối không nói "Tôi không biết bạn là ai" nếu có thông tin bên dưới.
            3. Trả lời bằng Tiếng Việt, lịch sự, thân thiện và hữu ích.${contextSnippet}
            
            Nếu được hỏi về các món ăn ngoài danh sách gợi ý an toàn, hãy nhắc nhở người dùng kiểm tra kỹ thành phần và khuyến khích họ cập nhật hồ sơ sức khỏe trong phần cài đặt.`,
  };

  try {
    const completion = await groq.chat.completions.create({
      messages: [systemPrompt, ...messages, { role: 'user', content: message }] as any,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || 'Xin lỗi, tôi không nhận được phản hồi.';
  } catch (err: any) {
    console.error('Groq Chat error:', err);
    if (err.status === 429) {
      return 'Hệ thống AI hiện đang bận do quá tải yêu cầu. Vui lòng thử lại sau 1 phút nhé! 🕒';
    }
    return 'Xin lỗi, tôi đang gặp lỗi kỹ thuật. Vui lòng thử lại sau nhé!';
  }
};
// ── AI Campaign Suggestions ──────────────────────────────────────────────────
// Accept both 'summary' and 'tagline' from AI output, coerce null→undefined for optional numbers
export const aiCampaignSuggestionResponseSchema = z.object({
  name: z.string().min(1),
  // AI sometimes returns 'tagline' instead of 'summary'
  summary: z.string().optional(),
  tagline: z.string().optional(),
  type: z.enum(['discount', 'fixed_price']),
  durationDays: z.number().int().min(1).max(30).default(7),
  products: z.array(
    z.object({
      productId: z.string(),
      name: z.string().optional(), // may be missing in some AI responses
      // null coercion: AI often returns null for fields not applicable to current type
      discount: z.union([z.number().min(1).max(100), z.null()]).optional().transform(v => v ?? undefined),
      fixedPrice: z.union([z.number().min(0), z.null()]).optional().transform(v => v ?? undefined),
      reason: z.string().default(''),
    })
  ),
  rationale: z.string().default(''),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).transform(data => ({
  ...data,
  // normalize: prefer summary, fallback to tagline
  summary: data.summary || data.tagline || '',
}));

export type TAICampaignSuggestionResponse = z.infer<typeof aiCampaignSuggestionResponseSchema>;

export const buildContextualProductRanking = ({
  bestSellers,
  allAvailableProducts,
  weatherInfo,
  occasion,
  goal,
  days,
  productCount,
  salesByProduct = {},
}: {
  bestSellers: { productId: string; name: string; price: number; totalQtySold: number; description?: string }[];
  allAvailableProducts: { productId: string; name: string; price: number; category: string; tags: string[] }[];
  weatherInfo: { temp?: number; description?: string; type: string };
  occasion: string;
  goal: string;
  days: number;
  productCount: number;
  salesByProduct?: Record<string, number>;
}) => {
  const preferredCount = Math.min(6, Math.max(2, productCount));

  // ── Build unified candidate pool ─────────────────────────────────────────
  // For boost_sales: only include products that actually have sales data.
  // For other goals: include catalog products too (needed for clear_stock).
  const bestSellerIds = new Set(bestSellers.map((s) => s.productId));

  const candidateProducts = [
    ...bestSellers.map((product) => ({
      ...product,
      source: 'seller' as const,
      sales: salesByProduct[product.productId] ?? product.totalQtySold ?? 0,
    })),
    ...allAvailableProducts
      .filter((product) => !bestSellerIds.has(product.productId))
      .map((product) => ({
        ...product,
        totalQtySold: salesByProduct[product.productId] ?? 0,
        description: '',
        source: 'catalog' as const,
        sales: salesByProduct[product.productId] ?? 0,
      })),
  ];

  const scoredProducts = candidateProducts
    .filter((product, index, arr) => arr.findIndex((p) => p.productId === product.productId) === index)
    .map((product) => {
      const category = 'category' in product ? (product as any).category : '';
      const tags = 'tags' in product ? (product as any).tags as string[] : [];
      const text = `${product.name} ${category} ${tags.join(' ')} ${(product as any).description ?? ''}`.toLowerCase();
      const soldQuantity = Number(product.sales ?? product.totalQtySold ?? 0);
      let score = 0;

      // ── Goal scoring ────────────────────────────────────────────────────
      if (goal === 'boost_sales') {
        // Hard-rank by actual sales. No catalog products allowed.
        // Weather/occasion do NOT change product selection here — they only
        // influence the AI prompt (campaign name, tagline, rationale).
        if (product.source !== 'seller' || soldQuantity === 0) return null;
        score += soldQuantity * 10;
        // Return early — skip context scoring for boost_sales
        return { ...product, score };
      } else if (goal === 'clear_stock') {
        // Prefer items with low or zero sales in the analysis window.
        score += Math.max(0, 10 - Math.min(10, soldQuantity)) * 8;
        if (soldQuantity === 0) score += 40;
        else if (soldQuantity <= 2) score += 20;
        if (soldQuantity >= 8) score -= 50; // definitively exclude top sellers
        if (product.source !== 'seller') score += 5; // catalog = never appeared in top sellers
      } else if (goal === 'contextual') {
        // Weather/season-first: include all products, heavily weight context fit.
        // Sales is a secondary tiebreaker only.
        score += soldQuantity * 2; // low weight — context matters more than raw sales
        if (product.source === 'seller') score += 5;
      } else {
        // engagement: balanced
        score += soldQuantity * 4;
        if (product.source === 'seller') score += 8;
      }

      // ── Weather scoring — only applies to non boost_sales goals ─────────
      if (weatherInfo.type === 'hot' || weatherInfo.type === 'sunny') {
        if (/(trà|tea|nước|juice|soda|cam|đào|gỏi|salad|mát|ice|đá|kem|smoothie|fresh)/i.test(text)) score += 20;
        if (/(súp|lẩu|cà ri|nóng|hầm|cháo)/i.test(text)) score -= 15;
      } else if (weatherInfo.type === 'rainy' || weatherInfo.type === 'cold') {
        if (/(súp|lẩu|cà ri|nóng|hầm|cháo|mì nóng|phở)/i.test(text)) score += 20;
        if (/(gỏi|salad|mát|ice|đá|soda)/i.test(text)) score -= 12;
      }

      // ── Occasion scoring — only applies to non boost_sales goals ────────
      if (occasion === 'summer') {
        if (/(trà|nước|gỏi|salad|kem|mát|fresh|juice|soda|đá|smoothie)/i.test(text)) score += 18;
        if (/(súp|lẩu|hầm|nóng)/i.test(text)) score -= 10;
      } else if (occasion === 'tet') {
        if (/(combo|set|gà|thịt|bánh|bún|mì|gỏi|chả|tôm|cá|nem)/i.test(text)) score += 18;
      } else if (occasion === 'christmas') {
        if (/(combo|set|đặc biệt|gà|thịt|nước|dessert|tráng miệng|bánh)/i.test(text)) score += 18;
      } else if (occasion === 'valentine') {
        if (/(combo|set|đặc biệt|lãng mạn|dessert|tráng miệng|chocolate|ngọt)/i.test(text)) score += 18;
      }

      return { ...product, score };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // ── Sort & slice ──────────────────────────────────────────────────────────
  const rankedProducts = scoredProducts.sort((a, b) => {
    if (goal === 'boost_sales') {
      // Primary: score (= sales * 10 + weather/occasion bonuses)
      // Tie-break: raw sales descending, then name
      return b.score - a.score || b.sales - a.sales || a.name.localeCompare(b.name);
    }
    if (goal === 'clear_stock') {
      return b.score - a.score || a.sales - b.sales || a.name.localeCompare(b.name);
    }
    return b.score - a.score || a.name.localeCompare(b.name);
  });

  return rankedProducts.slice(0, preferredCount);
};

export const getAICampaignSuggestion = async (
  bestSellers: { productId: string; name: string; price: number; totalQtySold: number; description?: string }[],
  allAvailableProducts: { productId: string; name: string; price: number; category: string; tags: string[] }[],
  weatherInfo: { temp?: number; description?: string; type: string },
  occasion: string,
  goal: string,
  days: number,
  productCount: number,
  salesByProduct?: Record<string, number>
): Promise<TAICampaignSuggestionResponse> => {
  const weatherText = weatherInfo.description
    ? `${weatherInfo.description} (Nhiệt độ khoảng ${weatherInfo.temp}°C, phân loại: ${weatherInfo.type})`
    : `Thời tiết phân loại: ${weatherInfo.type}`;

  const preferredCount = Math.min(6, Math.max(2, productCount));
  const contextualCandidates = buildContextualProductRanking({
    bestSellers,
    allAvailableProducts,
    weatherInfo,
    occasion,
    goal,
    days,
    productCount,
    salesByProduct,
  });

  // If boost_sales has no candidates with actual sales, log a clear warning
  if (goal === 'boost_sales' && contextualCandidates.length === 0) {
    console.warn('[AI Campaign] boost_sales: contextualCandidates is empty — no products with sales > 0 found in the analysis window. Check order status filtering and DB data.');
  }
  // ── Build prompt — chỉ đưa contextualCandidates vào AI (đã pre-rank, ngắn gọn)
  // Tránh truyền toàn bộ catalog (gây prompt quá dài → token limit / timeout)
  // For boost_sales when no sales exist in the selected window, fall back to bestSellers
  // and expose totalQtySold (30-day window) as soldInWindow so the AI sees real data.
  const candidatesForPrompt = contextualCandidates.length > 0
    ? contextualCandidates
    : bestSellers.slice(0, preferredCount).map((p) => ({
      productId: p.productId,
      name: p.name,
      price: p.price,
      source: 'seller' as const,
      // Use 30-day totalQtySold when the shorter window has no data
      sales: salesByProduct?.[p.productId] || p.totalQtySold || 0,
      totalQtySold: p.totalQtySold,
      description: p.description || '',
      score: 0,
    }));

  // Build bestSellers lookup for soldQuantity enrichment in result
  const bestSellersSoldMap: Record<string, number> = {};
  bestSellers.forEach((b) => { bestSellersSoldMap[b.productId] = b.totalQtySold ?? 0; });

  // Build goal-specific mandatory instruction for the AI
  const goalMandate = goal === 'boost_sales'
    ? `QUAN TRỌNG — MỤC TIÊU "boost_sales":
  - Danh sách trên đã được sắp xếp từ bán chạy nhất đến bán chậm nhất (soldInWindow cao = bán chạy).
  - BẮT BUỘC chọn các món có soldInWindow CAO NHẤT trong danh sách.
  - KHÔNG được chọn món có soldInWindow thấp hơn các món khác nếu vẫn còn lựa chọn tốt hơn.`
    : goal === 'clear_stock'
    ? `QUAN TRỌNG — MỤC TIÊU "clear_stock":
  - Danh sách trên đã được sắp xếp ưu tiên các món BÁN CHẬM / TỒN KHO nhất (soldInWindow thấp = bán chậm).
  - BẮT BUỘC chọn các món có soldInWindow THẤP NHẤT trong danh sách.
  - TUYỆT ĐỐI KHÔNG được chọn các món có soldInWindow cao nếu vẫn còn món ít bán hơn.
  - Mục tiêu là giải phóng hàng tồn, không phải quảng bá hàng bán chạy.`
    : `QUAN TRỌNG — MỤC TIÊU "contextual":
  - Danh sách đã được sắp xếp theo độ phù hợp với thời tiết và dịp lễ.
  - Ưu tiên chọn các món phù hợp nhất với ngữ cảnh (thời tiết ${weatherText}, dịp ${occasion}).`;

  const prompt = `Bạn là một chuyên gia tư vấn marketing và tối ưu hóa doanh thu cho nhà hàng FoodieDash.
Nhiệm vụ của bạn là đề xuất 1 chiến dịch khuyến mãi (Campaign) phù hợp dựa trên các dữ liệu ngữ cảnh sau:

MỤC TIÊU CHIẾN DỊCH: ${goal}
- boost_sales: Ưu tiên hàng bán chạy để tối đa doanh thu và tăng tốc độ bán.
- clear_stock: Ưu tiên hàng bán chậm / ít lượt bán để giải phóng tồn kho.
- contextual: Ưu tiên hàng phù hợp với thời tiết, mùa và dịp lễ hiện tại.

${goalMandate}

NGỮ CẢNH DỊP LỄ / MÙA: ${occasion} (Ví dụ: tết, giáng sinh, mùa hè, valentine, hoặc không có)

THỜI TIẾT HIỆN TẠI: ${weatherText}

DANH SÁCH MÓN ĂN ĐÃ ĐƯỢC HỆ THỐNG PRE-RANK PHÙ HỢP NHẤT (${candidatesForPrompt.length} món, thứ tự ưu tiên giảm dần theo mục tiêu):
${JSON.stringify(candidatesForPrompt.map(p => ({
    productId: p.productId,
    name: p.name,
    price: p.price,
    // If the selected window has no data, show the 30-day totalQtySold so AI sees real sales
    soldInWindow: salesByProduct?.[p.productId] || ('sales' in p ? (p as any).sales : 0) || bestSellersSoldMap[p.productId] || 0,
  })), null, 2)}

YÊU CẦU ĐỀ XUẤT CHIẾN DỊCH:
1. Đặt tên chiến dịch (name) hấp dẫn, phù hợp ngữ cảnh thời tiết/lễ hội/mục tiêu (Ví dụ: "Combo Giải Nhiệt Mùa Hè Rực Rỡ", "Ấm Lòng Ngày Mưa").
2. Soạn một slogan ngắn gọn mô tả tóm tắt chiến dịch (summary) để thu hút khách hàng.
3. Chọn loại chiến dịch (type): 'discount' (khuyến mãi phần trăm giảm giá) hoặc 'fixed_price' (bán với giá cố định).
4. Đề xuất số ngày chạy chiến dịch (durationDays) từ 1 đến 30 ngày, nên phù hợp với ${days} ngày phân tích.
5. Chọn đúng ${preferredCount} món từ danh sách trên (TUYỆT ĐỐI không bịa thêm sản phẩm khác, chỉ dùng productId từ danh sách).
   - Nếu type là 'discount', đề xuất phần trăm giảm giá "discount" (từ 5 đến 50).
   - Nếu type là 'fixed_price', đề xuất giá mới "fixedPrice" (thấp hơn giá gốc từ 10% đến 50%).
   - Cung cấp lý do ngắn gọn "reason" vì sao chọn món này (1-2 câu).
6. Viết lý do tổng quan (rationale) vì sao chiến dịch này hiệu quả với mục tiêu, thời tiết và dịp lễ đã chọn.

QUY TẮC PHẢN HỒI:
Trả về duy nhất dữ liệu dạng JSON hợp lệ theo cấu trúc sau, không kèm bất kỳ giải thích nào khác bên ngoài:
{
  "name": "Tên chiến dịch",
  "summary": "Slogan quảng cáo / Tóm tắt ngắn gọn",
  "type": "discount",
  "durationDays": 7,
  "products": [
    {
      "productId": "ID_sản_phẩm",
      "name": "Tên sản phẩm tương ứng",
      "discount": 15,
      "fixedPrice": null,
      "reason": "Lý do ngắn gọn bằng tiếng Việt"
    }
  ],
  "rationale": "Lý do tổng quan..."
}
`;

  try {
    console.log('[AI Campaign] Calling Gemini with occasion=%s goal=%s weather=%s', occasion, goal, weatherInfo.type);
    const result = await withTimeout(model.generateContent(prompt), 30000);
    const text = result.response.text();
    console.log('[AI Campaign] Raw response:', text.slice(0, 500));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI campaign suggestion response');

    let rawData: unknown;
    try {
      rawData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[AI Campaign] JSON parse error:', parseErr, '\nRaw match:', jsonMatch[0].slice(0, 300));
      throw new Error('AI response is not valid JSON');
    }

    const parsed = aiCampaignSuggestionResponseSchema.safeParse(rawData);
    if (!parsed.success) {
      console.error('[AI Campaign] Zod validation failed:', JSON.stringify(parsed.error.format(), null, 2));
      console.error('[AI Campaign] Raw data that failed:', JSON.stringify(rawData, null, 2));
      throw new Error('Invalid AI campaign suggestion shape');
    }

    return buildAICampaignResult(parsed.data, { contextualCandidates, bestSellers, allAvailableProducts, salesByProduct, bestSellersSoldMap, preferredCount, goal, days, weatherInfo, occasion });
  } catch (geminiError) {
    console.error('[AI Campaign] Gemini FAILED:', geminiError instanceof Error ? geminiError.message : String(geminiError));
    console.log('[AI Campaign] Trying Groq fallback...');

    // ── Groq fallback ─────────────────────────────────────────────────────
    try {
      const completion = await withTimeout(
        groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.4,
          response_format: { type: 'json_object' },
        }),
        25000
      );

      const raw = completion.choices[0]?.message?.content ?? '{}';
      console.log('[AI Campaign] Groq raw response:', raw.slice(0, 500));

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in Groq campaign response');

      const rawData = JSON.parse(jsonMatch[0]);
      const parsed = aiCampaignSuggestionResponseSchema.safeParse(rawData);
      if (!parsed.success) {
        console.error('[AI Campaign] Groq Zod validation failed:', JSON.stringify(parsed.error.format(), null, 2));
        throw new Error('Invalid Groq campaign suggestion shape');
      }

      console.log('[AI Campaign] Groq succeeded.');
      return buildAICampaignResult(parsed.data, { contextualCandidates, bestSellers, allAvailableProducts, salesByProduct, bestSellersSoldMap, preferredCount, goal, days, weatherInfo, occasion });
    } catch (groqError) {
      console.error('[AI Campaign] Groq FAILED:', groqError instanceof Error ? groqError.message : String(groqError));
    }

    // ── Deterministic fallback (both AI providers failed) ─────────────────
    return buildDeterministicFallback({ contextualCandidates, bestSellers, salesByProduct, bestSellersSoldMap, preferredCount, goal, days, weatherInfo, occasion });
  }
};

const buildAICampaignResult = (
  aiData: TAICampaignSuggestionResponse,
  ctx: {
    contextualCandidates: any[];
    bestSellers: any[];
    allAvailableProducts: any[];
    salesByProduct?: Record<string, number>;
    bestSellersSoldMap?: Record<string, number>;
    preferredCount: number;
    goal: string;
    days: number;
    weatherInfo: any;
    occasion: string;
  }
): TAICampaignSuggestionResponse => {
  const products = aiData.products.map((p) => {
    const matched = ctx.allAvailableProducts.find((ap) => ap.productId === p.productId)
      || ctx.bestSellers.find((bs) => bs.productId === p.productId);
    // Use window sales; fall back to 30-day bestSeller count if window has no data
    const windowSales = ctx.salesByProduct?.[p.productId] ?? 0;
    const soldQuantity = windowSales > 0 ? windowSales : (ctx.bestSellersSoldMap?.[p.productId] ?? 0);
    return {
      ...p,
      name: matched ? matched.name : p.name,
      soldQuantity,
    };
  });

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (aiData.durationDays || 7));

  return {
    ...aiData,
    products,
    startTime: aiData.startTime || start.toISOString(),
    endTime: aiData.endTime || end.toISOString(),
  };
};

const buildDeterministicFallback = (ctx: {
  contextualCandidates: any[];
  bestSellers: any[];
  salesByProduct?: Record<string, number>;
  bestSellersSoldMap?: Record<string, number>;
  preferredCount: number;
  goal: string;
  days: number;
  weatherInfo: any;
  occasion: string;
}): TAICampaignSuggestionResponse => {
  const candidates = ctx.contextualCandidates.length > 0
    ? ctx.contextualCandidates
    : ctx.bestSellers;

  const chosen = candidates.slice(0, ctx.preferredCount);

  // Goal-aware product reason
  const productReason = (p: any): string => {
    const soldQty = ctx.salesByProduct?.[p.productId] || ctx.bestSellersSoldMap?.[p.productId] || p.totalQtySold || 0;
    if (ctx.goal === 'boost_sales') {
      return `Món bán chạy với ${soldQty} suất trong khoảng phân tích — phù hợp để khuếch đại doanh thu.`;
    }
    if (ctx.goal === 'clear_stock') {
      return `Món bán chậm (${soldQty} suất) — cần đẩy tồn kho qua khuyến mãi hấp dẫn.`;
    }
    return `Món phù hợp với ngữ cảnh ${ctx.occasion !== 'none' ? ctx.occasion : ctx.weatherInfo?.type ?? ''} — tạo trải nghiệm ẩm thực đặc biệt.`;
  };

  const products = chosen.map((p) => {
    const windowSales = ctx.salesByProduct?.[p.productId] ?? 0;
    const soldQuantity = windowSales > 0 ? windowSales : (ctx.bestSellersSoldMap?.[p.productId] ?? p.totalQtySold ?? 0);
    return {
      productId: p.productId,
      name: p.name,
      discount: ctx.goal === 'clear_stock' ? 20 : 15,
      fixedPrice: undefined as number | undefined,
      reason: productReason(p),
      soldQuantity,
    };
  });

  // Contextual fallback name based on goal + occasion
  const occasionNames: Record<string, string> = {
    tet: 'Tết Nguyên Đán', christmas: 'Giáng Sinh', valentine: 'Valentine',
    summer: 'Mùa Hè', none: '', auto: '',
  };
  const weatherNames: Record<string, string> = {
    hot: 'Nắng Nóng', rainy: 'Ngày Mưa', cold: 'Tiết Lạnh', sunny: 'Nắng Đẹp', normal: '',
  };
  const occasionLabel = occasionNames[ctx.occasion] || '';
  const weatherLabel = weatherNames[ctx.weatherInfo?.type] || '';
  const contextLabel = occasionLabel || weatherLabel || '';

  const fallbackNames: Record<string, string> = {
    boost_sales: contextLabel ? `Bùng Nổi Doanh Thu ${contextLabel}` : 'Ưu Đãi Hàng Bán Chạy',
    clear_stock: contextLabel ? `Giải Phóng Tồn Kho ${contextLabel}` : 'Thanh Lý Tồn Kho Cuối Kỳ',
    contextual: contextLabel ? `Đặc Sản ${contextLabel}` : 'Ưu Đãi Theo Mùa',
  };
  const fallbackName = fallbackNames[ctx.goal] || 'Chiến Dịch Ưu Đãi Đặc Biệt';

  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return {
    name: fallbackName,
    summary: ctx.goal === 'clear_stock'
      ? 'Cơ hội vàng dọn kho — giảm giá sâu các món cần được khách hàng khám phá thêm!'
      : contextLabel
        ? `Ưu đãi đặc biệt mùa ${contextLabel} — đừng bỏ lỡ!`
        : 'Chiến dịch ưu đãi tự động dựa trên hiệu suất bán hàng gần nhất.',
    type: 'discount',
    durationDays: 7,
    products,
    rationale: '⚠ Gợi ý tự động do hệ thống AI tạm thời không phản hồi. Sản phẩm được xếp hạng theo dữ liệu bán hàng thực tế.',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
};


