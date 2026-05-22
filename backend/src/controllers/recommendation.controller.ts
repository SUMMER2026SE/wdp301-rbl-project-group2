import { Request, Response } from 'express';
import { filterSafeProducts } from '@/utils/healthFilter';
import { catchErrors } from '@/utils/asyncHandler';
import { OK } from '@/constants/http';
import UserModel from '@/models/users.model';
import ProductModel from '@/models/product.model';
import FileModel from '@/models/file.model';
import OrderModel from '@/models/order.model';
import { sanitizeAiRecommendations } from '@/utils/recommendationAi.util';
import appAssert from '@/utils/appAssert';
import { NOT_FOUND } from '@/constants/http';
import { OrderStatus } from '@/types/order.type';
import { getAIRecommendations } from '@/services/ai.service';

/**
 * Tìm danh sách top sản phẩm được đặt bởi users có healthProfile tương tự.
 * Dùng cho Collaborative Filtering.
 */
async function getSimilarUsersTopProducts(
    currentUserId: string,
    preferences: { dietary: string[]; allergies: string[]; health_goals: string[] }
): Promise<string[]> {

    // 1. Tìm users có ít nhất 1 điểm chung trong preferences
    const similarUserQuery: any = { _id: { $ne: currentUserId } };
    const orConditions: any[] = [];

    if (preferences.allergies.length > 0) {
        orConditions.push({ 'preferences.allergies': { $in: preferences.allergies } });
    }
    if (preferences.dietary.length > 0) {
        orConditions.push({ 'preferences.dietary': { $in: preferences.dietary } });
    }
    if (preferences.health_goals.length > 0) {
        orConditions.push({ 'preferences.health_goals': { $in: preferences.health_goals } });
    }

    if (orConditions.length === 0) return []; // Không có preferences → skip

    similarUserQuery.$or = orConditions;
    const similarUsers = await UserModel.find(similarUserQuery).select('_id email').lean();

    if (similarUsers.length === 0) {
        console.log('[Collaborative] Không tìm thấy user tương tự');
        return [];
    }

    console.log(`[Collaborative] Tìm thấy ${similarUsers.length} user(s) tương tự: ${similarUsers.map(u => u.email).join(', ')}`);

    // 2. Lấy các đơn hàng đã hoàn thành của nhóm users tương tự
    const similarUserIds = similarUsers.map(u => u._id);
    const orders = await OrderModel.find({
        user_id: { $in: similarUserIds },
        status: OrderStatus.COMPLETED,
    }).lean();

    if (orders.length === 0) {
        console.log('[Collaborative] Nhóm users tương tự chưa có đơn hàng');
        return [];
    }

    // 3. Đếm tần suất mỗi product_id trong các đơn hàng
    const productCount = new Map<string, number>();
    for (const order of orders) {
        for (const item of order.items) {
            const pid = item.product_id.toString();
            productCount.set(pid, (productCount.get(pid) ?? 0) + item.quantity);
        }
    }

    // 4. Lấy top 5 products phổ biến nhất, resolve tên
    const top5Ids = [...productCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

    const topProducts = await ProductModel.find({ _id: { $in: top5Ids } }).select('name').lean();

    // Giữ đúng thứ tự sort
    const nameMap = new Map(topProducts.map(p => [p._id.toString(), p.name]));
    const topNames = top5Ids.map(id => nameMap.get(id)).filter(Boolean) as string[];

    console.log(`[Collaborative] Top sản phẩm phổ biến: ${topNames.join(', ')}`);
    return topNames;
}

export const getRecommendationsHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;

    // 1. Get User Profile
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, 'User not found');

    const preferences = user.preferences || { dietary: [], allergies: [], health_goals: [] };

    // 2. Cache Check Strategy
    const latestProduct = await ProductModel.findOne({ isAvailable: true })
        .sort({ updatedAt: -1 })
        .select('updatedAt');

    const lastProductUpdatedTime = (latestProduct as any)?.updatedAt
        ? new Date((latestProduct as any).updatedAt).getTime()
        : 0;

    const cache = user.aiRecommendationsCache;
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh && cache && cache.data && cache.updatedAt) {
        if (cache.updatedAt.getTime() > lastProductUpdatedTime) {
            console.log(`[AI Cache Hit] Returning cached recommendations for user ${user.email}`);
            return res.status(OK).json({
                data: cache.data,
                message: 'Lấy danh sách gợi ý thành công (Tự động)'
            });
        }
    }

    console.log(`[AI Cache Miss / Force Refresh] Generating new recommendations for user ${user.email}...`);

    // 3. Get Products for AI
    const dbProducts = await ProductModel.find({ isAvailable: true })
        .sort({ rating: -1, review_count: -1 })
        .limit(100);

    // Strictly filter out any items conflicting with allergies or dietary preferences
    const safeDbProducts = filterSafeProducts(dbProducts, preferences);

    const productsForAI = safeDbProducts.slice(0, 50).map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        category: p.category,
        tags: p.tags,
        health_tags: p.health_tags ?? [],
        recipe: p.recipe,
        price: p.price,
        rating: p.rating,
    }));

    const allowedIdsForAi = new Set(productsForAI.map((p) => p._id));

    // 4. Collaborative Filtering: get similar users' top products
    const similarUsersTopProducts = await getSimilarUsersTopProducts(userId!.toString(), preferences);

    // 5. Call AI Service (tries custom ML first, then Groq fallback)
    let recommendations: any[] = [];
    try {
        recommendations = await getAIRecommendations(
            productsForAI,
            preferences,
            similarUsersTopProducts,
            userId!.toString() // Pass userId for CF-based personalization in the ML microservice
        );
    } catch (error) {
        console.error("Gemini AI API Error in Recommendations:", error);
        // Fallback: top rated từ pool đã lọc (không ép đủ 6)
        recommendations = productsForAI.slice(0, Math.min(6, productsForAI.length)).map(p => ({
            productId: p._id,
            reason: 'Sản phẩm được đánh giá cao (Gợi ý dự phòng do lỗi kết nối AI)',
            healthScore: 8
        }));
    }

    // 5b. Chỉ giữ ID đã gửi cho AI + xác minh lại an toàn trên bản ghi DB; bổ sung nếu thiếu
    const candidateIds = [...new Set(recommendations.map((r: any) => String(r.productId)).filter(Boolean))];
    const fetchedForSanitize = await ProductModel.find({ _id: { $in: candidateIds } }).lean();
    recommendations = sanitizeAiRecommendations(recommendations, {
        allowedIds: allowedIdsForAi,
        preferences,
        fetchedProducts: fetchedForSanitize,
        maxCount: 6,
    });

    // 6. Fetch full product data for returned IDs
    const aiProductIds = recommendations.map(r => r.productId);
    const fullProducts = await ProductModel.find({ _id: { $in: aiProductIds } }).lean();

    // 7. Resolve image URLs directly from FileModel (avoids Mixed cache serialization issues)
    const imageIds = fullProducts.map(p => p.image).filter(Boolean);
    const imageFiles = await FileModel.find({ _id: { $in: imageIds } }).lean();
    const imageMap = new Map(imageFiles.map(f => [f._id.toString(), f.secure_url]));

    // 8. Merge AI reasons with full product data
    const finalResult = recommendations.map(rec => {
        const fullProduct = fullProducts.find(p => p._id.toString() === rec.productId);
        if (!fullProduct) return null;

        const imageUrl = imageMap.get((fullProduct.image as any)?.toString() ?? '') ?? null;

        return {
            product: { ...fullProduct, image: imageUrl },
            aiReason: rec.reason,
            healthScore: rec.healthScore
        };
    }).filter(item => item !== null);

    // 9. Save to Cache
    const currentUser = await UserModel.findById(userId).select('aiRecommendationsCache').lean();
    const currentCache = currentUser?.aiRecommendationsCache || { data: null, safeFoodsData: null, updatedAt: null };

    await UserModel.updateOne({ _id: userId }, {
        $set: {
            'aiRecommendationsCache': {
                ...currentCache,
                data: finalResult,
                updatedAt: new Date()
            }
        }
    });

    return res.status(OK).json({
        data: finalResult,
        message: 'Lấy danh sách gợi ý thành công'
    });
});

/**
 * GET /products/safe-foods
 * Trả về danh sách các món ăn AN TOÀN cho người dùng,
 * tức là các món KHÔNG chứa thành phần mà người dùng bị dị ứng.
 */
export const getSafeFoodsHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;

    // 1. Get User Profile
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, 'User not found');

    const preferences = user.preferences || { dietary: [], allergies: [], health_goals: [] };
    const userAllergies = preferences.allergies.map((a: string) => a.toLowerCase().trim());

    // 2. Cache Check Strategy
    const latestProduct = await ProductModel.findOne({ isAvailable: true })
        .sort({ updatedAt: -1 })
        .select('updatedAt');

    const lastProductUpdatedTime = (latestProduct as any)?.updatedAt
        ? new Date((latestProduct as any).updatedAt).getTime()
        : 0;

    // We reuse the aiRecommendationsCache structure but store safe-foods specifically
    // To avoid schema changes, we can store it in aiRecommendationsCache.safeFoodsData if we modify the type
    // Or we just recalculate since safe-foods UI is accessed less frequently. 
    // Wait, the user has `aiRecommendationsCache` which is currently an object. Let's cast it to any to add safeFoods.
    const cache = (user as any).aiRecommendationsCache;
    console.log(`[SafeFoods Debug] cache exists?`, !!cache, `safeFoodsData exists?`, !!cache?.safeFoodsData, `updatedAt exists?`, !!cache?.updatedAt);
    if (cache && cache.safeFoodsData && cache.updatedAt) {
        console.log(`[SafeFoods Debug] cache.updatedAt:`, cache.updatedAt, `lastProductUpdatedTime:`, new Date(lastProductUpdatedTime));
        if (cache.updatedAt.getTime() > lastProductUpdatedTime) {
            console.log(`[SafeFoods Cache Hit] Returning cached safe foods for user ${user.email}`);
            return res.status(OK).json(cache.safeFoodsData);
        } else {
            console.log(`[SafeFoods Debug] Cache is obsolete.`);
        }
    }

    console.log(`[SafeFoods Cache Miss] Generating new AI insights for safe foods for user ${user.email}...`);

    // 3. Get all available products
    const allProducts = await ProductModel.find({ isAvailable: true })
        .sort({ rating: -1, review_count: -1 })
        .lean();

    // 4. Rule-Based Filter: strictly exclude products conflicting with dietary or allergies
    let safeProducts = filterSafeProducts(allProducts, preferences);
    let unsafeCount = allProducts.length - safeProducts.length;

    // Shuffle and pick 6 items to match the "AI suggestions" behavior
    safeProducts = safeProducts.sort(() => 0.5 - Math.random()).slice(0, 6);

    // 5. Get AI Insights for the Safe Products
    const productsForAI = safeProducts.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        category: p.category,
        tags: p.tags,
        health_tags: p.health_tags ?? [],
        recipe: p.recipe,
        price: p.price,
        rating: p.rating,
    }));

    // Import this at the top of file or use the existing import
    const { getAISafeFoodInsights } = require('@/services/ai.service');
    let aiInsights: any[] = [];
    try {
        aiInsights = await getAISafeFoodInsights(productsForAI, preferences);
    } catch (error) {
        console.error("Gemini AI API Error in Safe Foods:", error);
        // Fallback: Empty insights list, default reason will be used
        aiInsights = [];
    }

    // Create a map for quick lookup of AI reasons
    const insightMap = new Map(aiInsights.map((i: any) => [i.productId, i.aiReason]));

    // 6. Resolve image URLs
    const imageIds = safeProducts.map(p => p.image).filter(Boolean);
    const imageFiles = await FileModel.find({ _id: { $in: imageIds } }).lean();
    const imageMap = new Map(imageFiles.map(f => [f._id.toString(), f.secure_url]));

    const result = safeProducts.map(product => ({
        ...product,
        image: imageMap.get((product.image as any)?.toString() ?? '') ?? null,
        aiReason: insightMap.get(product._id.toString()) || 'Món ăn an toàn, đã được sàng lọc không chứa thành phần gây dị ứng của bạn.'
    }));

    const responsePayload = {
        data: result,
        filters: {
            allergies: preferences.allergies,
            dietary: preferences.dietary,
            health_goals: preferences.health_goals,
        },
        stats: {
            total: allProducts.length,
            safe: safeProducts.length,
            excluded: unsafeCount,
        },
        message: `Tìm thấy ${safeProducts.length} món an toàn cho bạn (đã loại ${unsafeCount} món chứa chất gây dị ứng)`
    };

    // 7. Save to Cache
    const currentUser = await UserModel.findById(userId).select('aiRecommendationsCache').lean();
    const currentCache = currentUser?.aiRecommendationsCache || { data: null, safeFoodsData: null, updatedAt: null };

    await UserModel.updateOne({ _id: userId }, {
        $set: {
            'aiRecommendationsCache': {
                ...currentCache,
                safeFoodsData: responsePayload,
                updatedAt: new Date()
            }
        }
    });

    return res.status(OK).json(responsePayload);
});
