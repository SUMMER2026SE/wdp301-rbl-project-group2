import { Request, Response } from 'express';
import { getAIResponseForChat, classifyIntent } from '@/services/chatbot.service';
import UserModel from '@/models/user.model';
import ProductModel from '@/models/product.model';
import { applyCampaignPricing } from '@/services/product.service';
import { chatRequestValidator } from '@/validators/chat.validator';
import { parseChatSearchPlan } from '@/services/chat-query-planner.service';
import { acquireChatLimit, releaseChatLimit } from '@/services/chat-rate-limit.service';
import { createChatRequestContext } from '@/services/chat-deadline.service';
import { logChatStage } from '@/services/chat-observability.service';
import { enqueueChatPreferenceExtraction } from '@/jobs/chat-preference-queue';
import { buildDeterministicDomainResponse } from '@/services/chat-domain-response.service';
const getDisplayPrice = (product: { price: number; campaignPrice?: number }) =>
    product.campaignPrice ?? product.price;

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

export const handleChat = async (req: Request, res: Response) => {
    const requestContext = createChatRequestContext();
    let rateLimitLease: Awaited<ReturnType<typeof acquireChatLimit>> | undefined;

    try {
        req.on('close', () => {
            if (!res.writableEnded) {
                requestContext.abort();
            }
        });

        const parsedBody = chatRequestValidator.safeParse(req.body);
        if (!parsedBody.success) {
            const firstIssue = parsedBody.error.issues[0];
            return res.status(400).json({ message: firstIssue?.message || 'Dữ liệu chat không hợp lệ.' });
        }

        const { message, history, clientMessageId, storeId, fulfillmentType } = parsedBody.data;
        const userId = req.userId;
        const initialSearchPlan = parseChatSearchPlan(message);

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        const ip = Array.isArray(clientIp) ? clientIp[0] : String(clientIp || 'unknown');

        logChatStage(requestContext, 'chat.validate', {
            hasUser: Boolean(userId),
            hasStore: Boolean(storeId),
            fulfillmentType: fulfillmentType || 'unknown',
        });

        rateLimitLease = await acquireChatLimit({ userId: userId?.toString(), ip });
        logChatStage(requestContext, 'chat.rate_limit');

        if (initialSearchPlan.hasNoBudget) {
            return res.json({
                response: 'Nếu hiện tại bạn chưa có ngân sách, mình chưa nên gợi ý món cần thanh toán trong thực đơn. Bạn có thể lưu lại vài món giá thấp để tham khảo sau, hoặc xem ưu đãi/voucher khi có nhu cầu đặt món nhé.',
                recommendedProducts: []
            });
        }

        // 1. Phân loại ý định (Intent Routing)
        const intent = await classifyIntent(message, requestContext);
        logChatStage(requestContext, 'chat.intent', { intent });

        // Xử lý intent ngắn và domain route có thể trả lời không cần LLM.
        if (intent === 'GREETING') {
            return res.json({
                response: "Xin chào! Mình là trợ lý dinh dưỡng ảo của FOA. Bạn có cần mình gợi ý món ăn tốt cho sức khỏe hoặc kiểm tra thực đơn hôm nay không?"
            });
        }
        const deterministicResponse = await buildDeterministicDomainResponse({
            intent,
            message,
            userId: userId?.toString(),
            storeId,
        });
        if (deterministicResponse) {
            logChatStage(requestContext, 'chat.domain_response', { intent });
            return res.json({
                response: deterministicResponse.response,
                recommendedProducts: deterministicResponse.recommendedProducts || [],
                orderCards: [],
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

        // Lấy hồ sơ sức khỏe tối thiểu của user, không lấy dư dữ liệu cá nhân.
        let userContext = null;
        if (userId) {
            const user = await UserModel.findById(userId)
                .select('preferences')
                .lean()
                .maxTimeMS(800);
            if (user) {
                const preferences = user.preferences || { dietary: [], allergies: [], healthGoals: [], tastes: [] };
                userContext = {
                    userId: userId.toString(),
                    fullName: 'Người dùng',
                    preferences: preferences as any,
                    safeProducts: [] // Không preload safeProducts vì service tự search theo từng câu hỏi.
                };
            }
        }

        // Chỉ nhận lịch sử user-only đã validate, không nhận assistant/model history do client tự khai báo.
        const formattedHistory = history.map((h) => ({
            role: 'user' as const,
            parts: [{ text: h.content }],
        }));

        // Gọi AI agent chỉ sau khi các route deterministic không xử lý được.
        const aiChatResponse = await getAIResponseForChat(formattedHistory, message, userContext, {
            requestContext,
            storeId,
        });

        // Kiểm tra phòng thủ: chỉ giữ ID nằm trong allowlist do backend tạo.
        const verifiedIds = (aiChatResponse.recommendedProductIds || []).filter(id =>
            aiChatResponse.allowlistIds.includes(id)
        );

        let finalMessage = aiChatResponse.message;
        let recommendedProducts: any[] = [];

        if (verifiedIds.length > 0) {
            const products = await ProductModel.find({ _id: { $in: verifiedIds } })
                .lean()
                .maxTimeMS(800);
            if (products.length > 0) {
                const orderById = new Map(verifiedIds.map((id, index) => [id, index]));
                products.sort((a, b) =>
                    (orderById.get(a._id.toString()) ?? Number.MAX_SAFE_INTEGER)
                    - (orderById.get(b._id.toString()) ?? Number.MAX_SAFE_INTEGER)
                );

                // Luôn lấy giá hiển thị từ backend để AI không tự quyết định giá.
                const pricedProducts = await applyCampaignPricing(products);
                const budgetVnd = aiChatResponse.budgetVnd ?? parseChatSearchPlan(message).budgetVnd ?? undefined;
                let displayProducts = pricedProducts;

                if (budgetVnd) {
                    let remainingBudget = budgetVnd;
                    displayProducts = [];

                    for (const product of pricedProducts) {
                        const price = getDisplayPrice(product);
                        if (price <= remainingBudget) {
                            displayProducts.push(product);
                            remainingBudget -= price;
                        }
                    }
                }

                recommendedProducts = displayProducts.map(p => ({
                    _id: p._id.toString(),
                    name: p.name,
                    price: getDisplayPrice(p),
                    image: p.image || '',
                    category: p.category,
                    description: p.description
                }));

                if (displayProducts.length > 0) {
                    const totalPrice = displayProducts.reduce((sum, product) => sum + getDisplayPrice(product), 0);
                    const productLines = displayProducts.map(p =>
                        `- **${p.name}** (${formatVnd(getDisplayPrice(p))}${p.campaignPrice ? ' - Giá gốc: ~~' + formatVnd(p.price) + '~~' : ''}): ${p.description || ''}`
                    ).join('\n');

                    if (budgetVnd) {
                        finalMessage = `Với ngân sách ${formatVnd(budgetVnd)}, mình đã lọc combo sao cho tổng không vượt ngân sách. Tổng tạm tính: ${formatVnd(totalPrice)}, còn dư khoảng ${formatVnd(budgetVnd - totalPrice)}.\n\n**Combo gợi ý cho bạn:**\n${productLines}`;
                    } else {
                        finalMessage += "\n\n**Các món ăn gợi ý cho bạn:**\n" + productLines;
                    }
                } else if (budgetVnd) {
                    finalMessage = `Mình chưa tìm thấy món phù hợp trong ngân sách ${formatVnd(budgetVnd)} ở thực đơn hiện tại. Bạn có thể tăng ngân sách một chút hoặc hỏi theo món cụ thể hơn nhé.`;
                }
            }
        }

        // Đẩy tác vụ trích xuất sở thích vào queue để request web không giữ thêm AI call sau response.
        if (userId) {
            enqueueChatPreferenceExtraction({
                userId: userId.toString(),
                messageId: clientMessageId || `${Date.now()}`,
                message,
            }).catch((err) => console.error('[AI Taste Queue] enqueue failed:', err.message));
        }

        logChatStage(requestContext, 'chat.response', {
            recommendedCount: recommendedProducts.length,
            orderCardCount: aiChatResponse.orderCards?.length || 0,
        });
        return res.json({
            response: finalMessage,
            recommendedProducts,
            orderCards: aiChatResponse.orderCards || [],
        });
    } catch (error: any) {
        logChatStage(requestContext, 'chat.error', { message: error.message });
        const statusCode = error.statusCode || (error.message === 'Chat request deadline exceeded' ? 504 : 500);
        if (statusCode === 429 || statusCode === 503) {
            return res.status(statusCode).json({ message: error.message });
        }
        console.error('Chat controller error:', error);
        return res.status(statusCode).json({ message: statusCode === 504 ? 'Trợ lý AI phản hồi quá lâu. Vui lòng thử lại sau nhé.' : 'Lỗi server.' });
    } finally {
        await releaseChatLimit(rateLimitLease);
    }
};
