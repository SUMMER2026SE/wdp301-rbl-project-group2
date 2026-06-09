import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { catchErrors } from '@/utils/async-handler';
import { OK } from '@/constants/http';
import UserModel from '@/models/user.model';
import ProductModel from '@/models/product.model';
import FileModel from '@/models/file.model';
import OrderModel from '@/models/order.model';
import { sanitizeAiRecommendations } from '@/utils/recommendation-ai.util';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { OrderStatus } from '@/types/order.type';
import { getAIRecommendations, getAISafeFoodInsights } from '@/services/ai.service';
import { evaluateProductHealthRisk, filterSafeProductsByHealthRisk } from '@/services/health-risk.service';

const PRODUCT_RECIPE_POPULATE = {
    path: 'recipe.ingredientId',
    select: 'name allergenTags',
};

const mapRecipeForAI = (recipe: any[] = []) =>
    recipe.map((item) => ({
        name: item?.name ?? item?.ingredientId?.name ?? '',
        quantity: item?.quantity,
        unit: item?.unit,
        allergenTags: item?.allergenTags ?? item?.ingredientId?.allergenTags ?? [],
    }));

const normalizeProductName = (name: unknown) =>
    String(name ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const dedupeProductsByName = <T extends { name?: string }>(products: T[]): T[] => {
    const seen = new Set<string>();
    return products.filter((product) => {
        const key = normalizeProductName(product.name);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const dedupeRecommendationResults = <T extends { product?: { name?: string } }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = normalizeProductName(item.product?.name);
        if (!key) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const getStoreFilter = (req: Request): { storeId?: string; filter: { storeId?: string } } => {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId.trim() : '';
    if (!storeId) return { storeId: undefined, filter: {} };
    appAssert(mongoose.isValidObjectId(storeId), BAD_REQUEST, 'storeId không hợp lệ');
    return { storeId, filter: { storeId } };
};

/**
 * Tìm danh sách top sản phẩm được đặt bởi users có healthProfile tương tự.
 * Dùng cho Collaborative Filtering.
 */
async function getSimilarUsersTopProducts(
    currentUserId: string,
    preferences: { dietary: string[]; allergies: string[]; healthGoals: string[] }
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
    if (preferences.healthGoals.length > 0) {
        orConditions.push({ 'preferences.healthGoals': { $in: preferences.healthGoals } });
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
        cusId: { $in: similarUserIds },
        status: OrderStatus.COMPLETED,
    }).lean();

    if (orders.length === 0) {
        console.log('[Collaborative] Nhóm users tương tự chưa có đơn hàng');
        return [];
    }

    // 3. Đếm tần suất mỗi productId trong các đơn hàng
    const productCount = new Map<string, number>();
    for (const order of orders) {
        for (const item of order.items) {
            const pid = item.productId.toString();
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
    const { storeId, filter: storeFilter } = getStoreFilter(req);

    // 1. Get User Profile
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, 'User not found');

    const preferences = user.preferences || { dietary: [], allergies: [], healthGoals: [] };

    // 2. Cache Check Strategy
    const latestProduct = await ProductModel.findOne({ isAvailable: true, ...storeFilter })
        .sort({ updatedAt: -1 })
        .select('updatedAt');

    const lastProductUpdatedTime = (latestProduct as any)?.updatedAt
        ? new Date((latestProduct as any).updatedAt).getTime()
        : 0;

    const cache = user.aiRecommendationsCache;
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh && cache && cache.data && cache.updatedAt) {
        const cacheStoreId = (cache as any).storeId ?? null;
        if (cache.updatedAt.getTime() > lastProductUpdatedTime && cacheStoreId === (storeId ?? null)) {
            console.log(`[AI Cache Hit] Returning cached recommendations for user ${user.email}`);
            return res.status(OK).json({
                data: dedupeRecommendationResults(cache.data),
                message: 'Lấy danh sách gợi ý thành công (Tự động)'
            });
        }
    }

    console.log(`[AI Cache Miss / Force Refresh] Generating new recommendations for user ${user.email}...`);

    // 3. Get Products for AI
    const dbProducts = await ProductModel.find({ isAvailable: true, ...storeFilter })
        .populate(PRODUCT_RECIPE_POPULATE)
        .sort({ rating: -1, reviewCount: -1 })
        .limit(100);

    // Strictly filter out any items conflicting with allergies or dietary preferences
    const safeDbProducts = dedupeProductsByName(filterSafeProductsByHealthRisk(dbProducts, preferences));

    const productsForAI = safeDbProducts.slice(0, 50).map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        category: p.category,
        tags: p.tags,
        healthTags: p.healthTags ?? [],
        recipe: mapRecipeForAI(p.recipe as any[]),
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
    const fetchedForSanitize = await ProductModel.find({ _id: { $in: candidateIds } })
        .populate(PRODUCT_RECIPE_POPULATE)
        .lean();
    recommendations = sanitizeAiRecommendations(recommendations, {
        allowedIds: allowedIdsForAi,
        preferences,
        fetchedProducts: fetchedForSanitize,
        maxCount: 6,
    });

    // 6. Fetch full product data for returned IDs
    const aiProductIds = recommendations.map(r => r.productId);
    const fullProducts = await ProductModel.find({ _id: { $in: aiProductIds } })
        .populate(PRODUCT_RECIPE_POPULATE)
        .lean();

    // 8. Merge AI reasons with full product data
    const finalResult = dedupeRecommendationResults(recommendations.map(rec => {
        const fullProduct = fullProducts.find(p => p._id.toString() === rec.productId);
        if (!fullProduct) return null;

        return {
            product: {
                ...fullProduct,
                recipe: mapRecipeForAI(fullProduct.recipe as any[]),
                healthRisk: evaluateProductHealthRisk(fullProduct, preferences),
            },
            aiReason: rec.reason,
            healthScore: rec.healthScore
        };
    }).filter(item => item !== null));

    // 9. Save to Cache
    const currentUser = await UserModel.findById(userId).select('aiRecommendationsCache').lean();
    const currentCache = currentUser?.aiRecommendationsCache || { data: null, safeFoodsData: null, updatedAt: null };

    await UserModel.updateOne({ _id: userId }, {
        $set: {
            'aiRecommendationsCache': {
                ...currentCache,
                data: finalResult,
                storeId: storeId ?? null,
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
    const { storeId, filter: storeFilter } = getStoreFilter(req);

    // 1. Get User Profile
    const user = await UserModel.findById(userId);
    appAssert(user, NOT_FOUND, 'User not found');

    const preferences = user.preferences || { dietary: [], allergies: [], healthGoals: [] };
    const userAllergies = preferences.allergies.map((a: string) => a.toLowerCase().trim());
    const forceRefresh = req.query.refresh === 'true';

    // 2. Cache Check Strategy
    const latestProduct = await ProductModel.findOne({ isAvailable: true, ...storeFilter })
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
    if (!forceRefresh && cache && cache.safeFoodsData && cache.updatedAt) {
        const cacheStoreId = (cache as any).storeId ?? null;
        if (cache.updatedAt.getTime() > lastProductUpdatedTime && cacheStoreId === (storeId ?? null)) {
            console.log(`[SafeFoods Cache Hit] Returning cached safe foods for user ${user.email}`);
            return res.status(OK).json(cache.safeFoodsData);
        }
    }

    console.log(`[SafeFoods Cache Miss] Generating new AI insights for safe foods for user ${user.email}...`);

    // 3. Get all available products
    const allProducts = await ProductModel.find({ isAvailable: true, ...storeFilter })
        .populate(PRODUCT_RECIPE_POPULATE)
        .sort({ rating: -1, reviewCount: -1 })
        .lean();

    // 4. Rule-Based Filter: strictly exclude products conflicting with dietary or allergies
    const menuProducts = dedupeProductsByName(allProducts);
    const safeProductCandidates = dedupeProductsByName(filterSafeProductsByHealthRisk(menuProducts, preferences));
    const unsafeCount = menuProducts.length - safeProductCandidates.length;

    // Shuffle and pick 6 items to match the "AI suggestions" behavior
    const safeProducts = safeProductCandidates.sort(() => 0.5 - Math.random()).slice(0, 6);

    // 5. Get AI Insights for the Safe Products
    const productsForAI = safeProducts.map((p) => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        category: p.category,
        tags: p.tags,
        healthTags: p.healthTags ?? [],
        recipe: mapRecipeForAI(p.recipe as any[]),
        price: p.price,
        rating: p.rating,
    }));

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

    const result = safeProducts.map(product => ({
        ...product,
        recipe: mapRecipeForAI(product.recipe as any[]),
        healthRisk: evaluateProductHealthRisk(product, preferences),
        aiReason: insightMap.get(product._id.toString()) || 'Món ăn an toàn, đã được sàng lọc không chứa thành phần gây dị ứng của bạn.'
    }));

    const responsePayload = {
        data: result,
        filters: {
            allergies: preferences.allergies,
            dietary: preferences.dietary,
            healthGoals: preferences.healthGoals,
        },
        stats: {
            total: menuProducts.length,
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
                storeId: storeId ?? null,
                updatedAt: new Date()
            }
        }
    });

    return res.status(OK).json(responsePayload);
});
