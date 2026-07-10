import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { catchErrors } from '@/utils/async-handler';
import { OK } from '@/constants/http';
import UserModel from '@/models/user.model';
import ProductModel from '@/models/product.model';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { getAISafeFoodInsights } from '@/services/ai.service';
import { evaluateProductHealthRisk, filterSafeProductsByHealthRisk } from '@/services/health-risk.service';
import { getCustomerRecommendationInsights } from '@/services/recommendation-insights.service';

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
    return { storeId, filter: {} };
};

export const getRecommendationsHandler = catchErrors(async (req: Request, res: Response) => {
    const userId = req.userId;
    const { storeId } = getStoreFilter(req);
    const insights = await getCustomerRecommendationInsights(userId!.toString(), { storeId });

    const finalResult = dedupeRecommendationResults(
        insights.recommendations.slice(0, 6).map((item) => ({
            product: item.product,
            aiReason: item.explanation.reason,
            healthScore: Math.max(1, Math.min(10, Math.round(item.explanation.finalScore * 10))),
            explanation: item.explanation,
        }))
    );

    return res.status(OK).json({
        data: finalResult,
        meta: {
            algorithmVersion: insights.algorithmVersion,
            computedAt: insights.computedAt,
            fallback: insights.fallback,
        },
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
