import { Request, Response } from 'express';
import { getAIResponseForChat, classifyIntent, extractPreferencesFromMessage } from '@/services/chatbot.service';
import UserModel from '@/models/user.model';
import ProductModel from '@/models/product.model';
import Redis from 'ioredis';
import { redisConfig } from '@/config/redis';

const redis = new Redis({
    host: (redisConfig as any).host,
    port: (redisConfig as any).port,
    password: (redisConfig as any).password,
});

export const handleChat = async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;
        const userId = req.userId;

        if (!message) {
            return res.status(400).json({ message: 'Vui lòng nhập tin nhắn.' });
        }

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

        // Rate Limiter for Logged-in Users (20 requests per day)
        if (userId) {
            try {
                const today = new Date().toISOString().split('T')[0];
                const redisKey = `chat_limit:${userId}:${today}`;
                const currentCount = await redis.get(redisKey);
                const count = currentCount ? parseInt(currentCount, 10) : 0;

                if (count >= 20) {
                    return res.status(429).json({
                        message: 'Bạn đã dùng hết 20 lượt tư vấn AI hôm nay. Hãy quay lại vào ngày mai nhé!'
                    });
                }

                // Increment count and set 24h expiry
                await redis.set(redisKey, count + 1, 'EX', 86400);
            } catch (redisError) {
                console.error('[Redis Rate Limiter] Failed, allowing chat to proceed:', redisError);
            }
        } else {
            // Rate Limiter for Guest Users (5 requests per day by IP)
            try {
                const today = new Date().toISOString().split('T')[0];
                const sanitizedIp = String(clientIp).replace(/[^a-zA-Z0-9]/g, '_');
                const redisKey = `chat_limit:guest:${sanitizedIp}:${today}`;
                const currentCount = await redis.get(redisKey);
                const count = currentCount ? parseInt(currentCount, 10) : 0;

                if (count >= 5) {
                    return res.status(429).json({
                        message: 'Địa chỉ IP của bạn đã dùng hết 5 lượt hỏi thử miễn phí hôm nay. Hãy đăng ký hoặc đăng nhập để tiếp tục nhận tư vấn sức khỏe!'
                    });
                }

                // Increment count and set 24h expiry
                await redis.set(redisKey, count + 1, 'EX', 86400);
            } catch (redisError) {
                console.error('[Redis Guest Rate Limiter] Failed, allowing chat to proceed:', redisError);
            }
        }

        // 1. Phân loại ý định (Intent Routing)
        const intent = await classifyIntent(message);
        console.log(`[Chatbot] Classified intent: ${intent} for message: "${message.slice(0, 40)}"`);

        // Xử lý các intent ngắn (Rule-based templates)
        if (intent === 'GREETING') {
            return res.json({
                response: "Xin chào! Mình là trợ lý dinh dưỡng ảo của FOA. Bạn có cần mình gợi ý món ăn tốt cho sức khỏe hoặc kiểm tra thực đơn hôm nay không?"
            });
        }
        if (intent === 'STORE_HOURS') {
            return res.json({
                response: "Cửa hàng FOA của tụi mình mở cửa phục vụ từ 7:00 sáng đến 10:00 tối tất cả các ngày trong tuần nhé!"
            });
        }
        if (intent === 'DELIVERY_FEE') {
            return res.json({
                response: "Phí giao hàng của FOA được tính dựa trên khoảng cách: Miễn phí cho đơn hàng dưới 2km. Từ 2km trở lên, phí ship dao động từ 15,000đ - 25,000đ tùy khoảng cách cụ thể nha."
            });
        }
        if (intent === 'PROMOTION') {
            return res.json({
                response: "FOA đang có chương trình khuyến mãi giảm ngay 10% cho đơn hàng đầu tiên của bạn đó! Bạn có thể xem thêm chi tiết trong mục 'Ưu đãi' trên ứng dụng nha."
            });
        }
        if (intent === 'OUT_OF_SCOPE') {
            return res.json({
                response: "Mình là trợ lý đặt món của FOA, chỉ có thể hỗ trợ các thông tin về thực đơn, dinh dưỡng, an toàn thực phẩm và đơn hàng thôi nè. Bạn vui lòng hỏi những chủ đề liên quan nhé!"
            });
        }
        if (intent === 'JAILBREAK') {
            return res.json({
                response: "Yêu cầu này không thuộc phạm vi hỗ trợ của mình. Mình chỉ có thể giúp bạn tìm kiếm món ăn an toàn và tư vấn dinh dưỡng thôi nhé!"
            });
        }
        if (intent === 'ORDER_STATUS') {
            return res.json({
                response: "Để kiểm tra trạng thái đơn hàng nhanh nhất, bạn vui lòng truy cập vào mục 'Lịch sử đơn hàng' trên ứng dụng FOA để xem cập nhật thời gian thực từ shipper nhé!"
            });
        }

        // Fetch User Context
        let userContext = null;
        if (userId) {
            const user = await UserModel.findById(userId).lean();
            if (user) {
                const preferences = user.preferences || { dietary: [], allergies: [], healthGoals: [], tastes: [] };
                userContext = {
                    fullName: (user.username || user.fullName || 'Người dùng').toString(),
                    preferences: preferences as any,
                    safeProducts: [] // Keep empty as we do tool calling now
                };
            }
        }

        // Format history for Gemini/Groq
        const formattedHistory = (history || []).map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content || h.parts[0].text }],
        }));

        // Call the AI Agent
        const aiChatResponse = await getAIResponseForChat(formattedHistory, message, userContext);

        // Defensive output validation: check recommendedProductIds against allowlistIds
        const verifiedIds = (aiChatResponse.recommendedProductIds || []).filter(id =>
            aiChatResponse.allowlistIds.includes(id)
        );

        let finalMessage = aiChatResponse.message;
        let recommendedProducts: any[] = [];

        if (verifiedIds.length > 0) {
            const products = await ProductModel.find({ _id: { $in: verifiedIds } }).lean();
            if (products.length > 0) {
                recommendedProducts = products.map(p => ({
                    _id: p._id.toString(),
                    name: p.name,
                    price: p.price,
                    image: p.image || '',
                    category: p.category,
                    description: p.description
                }));
                finalMessage += "\n\n**Các món ăn gợi ý cho bạn:**\n" + products.map(p =>
                    `- **${p.name}** (${p.price.toLocaleString()}đ): ${p.description || ''}`
                ).join('\n');
            }
        }

        // Asynchronously extract and update tastes in the background
        if (userId) {
            extractAndUpdateUserTastes(userId.toString(), message).catch(err =>
                console.error('[AI Taste Tracker] Async error:', err)
            );
        }

        return res.json({ response: finalMessage, recommendedProducts });
    } catch (error: any) {
        console.error('Chat controller error:', error);
        return res.status(500).json({ message: 'Lỗi server.', error: error.message });
    }
};

const extractAndUpdateUserTastes = async (userId: string, message: string) => {
    try {
        const newTastes = await extractPreferencesFromMessage(message);
        if (newTastes && newTastes.length > 0) {
            const user = await UserModel.findById(userId);
            if (user) {
                if (!user.preferences) {
                    user.preferences = { dietary: [], allergies: [], healthGoals: [], tastes: [] };
                }
                const currentTastes = user.preferences.tastes || [];
                const updatedTastes = [...new Set([...currentTastes, ...newTastes])];
                user.preferences.tastes = updatedTastes;
                await user.save();
                console.log(`[AI Taste Tracker] Updated tastes for user ${user.fullName || userId}:`, updatedTastes);
            }
        }
    } catch (err) {
        console.error('[AI Taste Tracker] Failed to update user tastes:', err);
    }
};
