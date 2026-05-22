import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { GEMINI_API_KEY, GROQ_API_KEY } from '@/constants/env';
import axios from 'axios';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const groq = new Groq({ apiKey: GROQ_API_KEY });

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
  health_tags?: string[];
  recipe: { name: string; quantity?: string }[];
  price: number;
  rating: number;
}

interface Preferences {
  dietary: string[];
  allergies: string[];
  health_goals: string[];
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
    health_tags: p.health_tags ?? [],
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
- Mục tiêu sức khỏe: ${preferences.health_goals.length > 0 ? preferences.health_goals.join(', ') : 'Không có'}
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
      model: 'llama3-70b-8192',
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
          health_tags: p.health_tags ?? [],
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
    health_tags: p.health_tags ?? [],
  }));

  const prompt = `Bạn là chuyên gia dinh dưỡng. Trách nhiệm của bạn là giải thích TẠI SAO các món ăn dưới đây an toàn. Tất cả món đều 100% không chứa chất gây dị ứng của họ.
HỒ SƠ SỨC KHỎE:
- Dị ứng: ${preferences.allergies.join(', ')}
- Ăn kiêng: ${preferences.dietary.join(', ')}
- Mục tiêu: ${preferences.health_goals.join(', ')}

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

  // ── 1. Try Custom AI Microservice (Ollama / fine-tuned model) ─────────────
  if (await isMicroserviceAvailable()) {
    try {
      const res = await axios.post(`${AI_MICROSERVICE_URL}/chat/message`, {
        message,
        history,
        userContext,
      }, { timeout: 30000 });

      const response = res.data?.response as string;
      if (response) {
        console.log('[AI] Using Microservice (Ollama) for chat');
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
            - Mục tiêu sức khỏe: ${preferences.health_goals.length > 0 ? preferences.health_goals.join(', ') : 'Không có'}
            
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