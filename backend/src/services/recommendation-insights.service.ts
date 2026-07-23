import crypto from 'crypto';
import mongoose from 'mongoose';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { CampaignModel } from '@/models/campaign.model';
import OrderModel from '@/models/order.model';
import ProductBehaviorEventModel from '@/models/product-behavior-event.model';
import ProductModel from '@/models/product.model';
import ReviewModel from '@/models/review.model';
import UserModel from '@/models/user.model';
import { evaluateProductHealthRisk, filterSafeProductsByHealthRisk } from '@/services/health-risk.service';
import { CampaignStatus } from '@/types/campaign.type';
import { OrderStatus } from '@/types/order.type';
import { ProductStatus } from '@/types/product.type';
import appAssert from '@/utils/app-assert';

const PRODUCT_RECIPE_POPULATE = {
  path: 'recipe.ingredientId',
  select: 'name allergenTags',
};

const ALGORITHM_VERSION = 'admin_explainable_hybrid_v1';
const MAX_USER_ORDERS = 60;
const MAX_SIMILAR_ORDERS = 240;
const MAX_RECOMMENDATIONS = 8;
const MAX_SIMILAR_USERS = 5;
const MAX_BEHAVIOR_EVENTS = 300;
const BEHAVIOR_LOOKBACK_DAYS = 90;
const REPEAT_PURCHASE_THRESHOLD = 3;

type Preferences = {
  dietary: string[];
  allergies: string[];
  healthGoals: string[];
  tastes: string[];
};

type Interaction = {
  productId: string;
  productName: string;
  quantity: number;
  orderCount: number;
  reviewRating?: number;
  score: number;
};

type SimilarUserEvidence = {
  userIdHash: string;
  similarity: number;
  sharedSignals: string[];
  supportingProducts: Array<{
    productId: string;
    productName: string;
    signal: 'ordered' | 'reviewed';
    score: number;
  }>;
};

type ScoreBreakdown = {
  collaborative: number;
  itemSimilarity: number;
  userSimilarity: number;
  behavior: number;
  campaign: number;
  healthGoal: number;
  taste: number;
  dietary: number;
  popularity: number;
  diversity: number;
  rotation: number;
};

type BehaviorSignal = {
  productId: string;
  views: number;
  recommendationClicks: number;
  score: number;
  lastSeenAt: Date;
};

type ActiveCampaignSignal = {
  campaignId: string;
  campaignName: string;
  discount?: number | null;
  fixedPrice?: number | null;
  type?: string;
  campaignPrice?: number;
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const normalizeMany = (values: unknown): string[] =>
  Array.isArray(values) ? values.map(normalize).filter(Boolean) : [];

const uniq = <T>(items: T[]): T[] => [...new Set(items)];

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const hashUserId = (userId: string) => `u_${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 8)}`;

const toObjectIdString = (value: any): string | null => {
  const raw = value?._id ?? value;
  if (!raw) return null;
  const text = String(raw);
  return mongoose.isValidObjectId(text) ? text : null;
};

const overlapRatio = (left: string[], right: string[]) => {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const item of a) {
    if (b.has(item)) hits += 1;
  }
  return hits / Math.max(a.size, b.size);
};

const jaccard = (left: Set<string>, right: Set<string>) => {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
};

const productTokens = (product: any): string[] =>
  uniq(
    [
      product?.category,
      ...(Array.isArray(product?.tags) ? product.tags : []),
      ...(Array.isArray(product?.healthTags) ? product.healthTags : []),
      product?.description,
      product?.name,
    ]
      .flatMap((value) => normalize(value).split(/[^a-z0-9]+/))
      .filter((token) => token.length >= 2)
  );

const preferenceMatchScore = (product: any, values: string[]) => {
  const prefs = normalizeMany(values);
  if (prefs.length === 0) return 0;
  const haystack = normalize([
    product?.name,
    product?.description,
    product?.category,
    ...(Array.isArray(product?.tags) ? product.tags : []),
    ...(Array.isArray(product?.healthTags) ? product.healthTags : []),
  ].join(' '));
  const hits = prefs.filter((pref) => haystack.includes(pref));
  return hits.length / prefs.length;
};

const buildInteractionMap = (orders: any[], reviews: any[]): Map<string, Interaction> => {
  const map = new Map<string, Interaction>();

  for (const order of orders) {
    for (const item of order.items ?? []) {
      const productId = toObjectIdString(item.productId);
      if (!productId) continue;

      const existing = map.get(productId) ?? {
        productId,
        productName: item.name ?? 'Món đã mua',
        quantity: 0,
        orderCount: 0,
        score: 0,
      };

      existing.quantity += Number(item.quantity ?? 1);
      existing.orderCount += 1;
      existing.score = Math.max(existing.score, 3.2 + Math.min(1, Math.log1p(existing.quantity) / 3));
      map.set(productId, existing);
    }
  }

  for (const review of reviews) {
    const productId = toObjectIdString(review.productId);
    if (!productId) continue;
    const productName = review.productId?.name ?? map.get(productId)?.productName ?? 'Món đã đánh giá';
    const existing: Interaction = map.get(productId) ?? {
      productId,
      productName,
      quantity: 0,
      orderCount: 0,
      score: 0,
    };
    existing.reviewRating = Number(review.rating ?? 0);
    existing.score = Math.max(existing.score, Number(review.rating ?? 0));
    existing.productName = productName;
    map.set(productId, existing);
  }

  return map;
};

const buildSharedPreferenceSignals = (target: Preferences, other: Preferences): string[] => {
  const signals: string[] = [];
  for (const value of normalizeMany(target.dietary).filter((item) => normalizeMany(other.dietary).includes(item))) {
    signals.push(`Cùng chế độ ăn: ${value}`);
  }
  for (const value of normalizeMany(target.healthGoals).filter((item) => normalizeMany(other.healthGoals).includes(item))) {
    signals.push(`Cùng mục tiêu sức khỏe: ${value}`);
  }
  for (const value of normalizeMany(target.tastes).filter((item) => normalizeMany(other.tastes).includes(item))) {
    signals.push(`Cùng khẩu vị: ${value}`);
  }
  return signals.slice(0, 6);
};

const createDeterministicReason = (signals: string[]) => {
  const useful = signals.slice(0, 2);
  if (useful.length === 0) return 'Được chọn từ các tín hiệu phù hợp nhất với hồ sơ và hành vi của khách.';
  return useful.join('. ') + '.';
};

const buildBehaviorMap = (events: any[]): Map<string, BehaviorSignal> => {
  const map = new Map<string, BehaviorSignal>();

  for (const event of events) {
    const productId = toObjectIdString(event.productId);
    if (!productId) continue;

    const existing = map.get(productId) ?? {
      productId,
      views: 0,
      recommendationClicks: 0,
      score: 0,
      lastSeenAt: event.lastSeenAt ?? event.updatedAt ?? new Date(0),
    };

    const count = Number(event.count ?? 1);
    if (event.eventType === 'recommendation_click') {
      existing.recommendationClicks += count;
      existing.score += count * 0.75;
    } else if (event.eventType === 'product_view') {
      existing.views += count;
      existing.score += count * 0.35;
    }

    const lastSeenAt = event.lastSeenAt ? new Date(event.lastSeenAt) : existing.lastSeenAt;
    if (lastSeenAt > existing.lastSeenAt) {
      existing.lastSeenAt = lastSeenAt;
    }

    map.set(productId, existing);
  }

  for (const signal of map.values()) {
    signal.score = round(clamp01(Math.log1p(signal.score) / Math.log1p(8)));
  }

  return map;
};

const getActiveCampaignSignals = async (storeId?: string): Promise<Map<string, ActiveCampaignSignal>> => {
  const now = new Date();
  const filter: any = {
    status: CampaignStatus.APPROVED,
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  if (storeId) {
    filter.$or = [
      { storeIds: { $size: 0 } },
      { storeIds: new mongoose.Types.ObjectId(storeId) },
    ];
  }

  const campaigns = await CampaignModel.find(filter)
    .select('name type products storeIds')
    .lean();

  const map = new Map<string, ActiveCampaignSignal>();
  for (const campaign of campaigns) {
    for (const item of campaign.products ?? []) {
      const productId = toObjectIdString(item.productId);
      if (!productId || map.has(productId)) continue;
      map.set(productId, {
        campaignId: campaign._id.toString(),
        campaignName: campaign.name,
        discount: item.discount,
        fixedPrice: item.fixedPrice,
        type: campaign.type,
      });
    }
  }

  return map;
};

const applyCampaignSignalPricing = (product: any, signal?: ActiveCampaignSignal | null) => {
  if (!signal) return product;
  let campaignPrice: number | undefined;
  if (signal.type === 'fixed_price' && signal.fixedPrice != null) {
    campaignPrice = signal.fixedPrice;
  } else if (signal.discount != null) {
    campaignPrice = Math.round(Number(product.price ?? 0) * (1 - signal.discount / 100));
  }

  return {
    ...product,
    isCampaignRunning: true,
    campaignName: signal.campaignName,
    campaignId: signal.campaignId,
    campaignPrice,
  };
};

export const getCustomerRecommendationInsights = async (userId: string, options: { storeId?: string } = {}) => {
  appAssert(mongoose.isValidObjectId(userId), BAD_REQUEST, 'userId không hợp lệ');
  if (options.storeId) {
    appAssert(mongoose.isValidObjectId(options.storeId), BAD_REQUEST, 'storeId không hợp lệ');
  }
  const productAvailabilityFilter = options.storeId
    ? {
        isAvailable: true,
        storeAvailability: {
          $elemMatch: {
            storeId: new mongoose.Types.ObjectId(options.storeId),
            status: ProductStatus.ACTIVE,
          },
        },
      }
    : { isAvailable: true };

  const user = await UserModel.findById(userId)
    .select('fullName username email preferences createdAt')
    .lean();
  appAssert(user, NOT_FOUND, 'Không tìm thấy khách hàng');

  const preferences: Preferences = {
    dietary: user.preferences?.dietary ?? [],
    allergies: user.preferences?.allergies ?? [],
    healthGoals: user.preferences?.healthGoals ?? [],
    tastes: user.preferences?.tastes ?? [],
  };

  const behaviorSince = new Date(Date.now() - BEHAVIOR_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const [userOrders, userReviews, userBehaviorEvents, activeCampaignByProduct] = await Promise.all([
    OrderModel.find({ cusId: user._id, status: OrderStatus.COMPLETED })
      .sort({ createdAt: -1 })
      .limit(MAX_USER_ORDERS)
      .select('items createdAt')
      .lean(),
    ReviewModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(80)
      .select('productId rating feedbackTags createdAt')
      .populate({ path: 'productId', select: 'name' })
      .lean(),
    ProductBehaviorEventModel.find({
      userId: user._id,
      eventType: { $in: ['product_view', 'recommendation_click'] },
      lastSeenAt: { $gte: behaviorSince },
    })
      .sort({ lastSeenAt: -1 })
      .limit(MAX_BEHAVIOR_EVENTS)
      .select('productId eventType count source lastSeenAt')
      .lean(),
    getActiveCampaignSignals(options.storeId),
  ]);

  const userInteractions = buildInteractionMap(userOrders, userReviews);
  const interactedIds = new Set(userInteractions.keys());
  const behaviorByProduct = buildBehaviorMap(userBehaviorEvents);
  const behaviorProductIds = new Set(behaviorByProduct.keys());

  const similarUserOrders =
    interactedIds.size > 0
      ? await OrderModel.find({
          cusId: { $ne: user._id },
          status: OrderStatus.COMPLETED,
          'items.productId': { $in: [...interactedIds] },
        })
          .sort({ createdAt: -1 })
          .limit(MAX_SIMILAR_ORDERS)
          .select('cusId items createdAt')
          .lean()
      : [];

  const ordersByUser = new Map<string, any[]>();
  for (const order of similarUserOrders) {
    const key = order.cusId?.toString?.();
    if (!key) continue;
    ordersByUser.set(key, [...(ordersByUser.get(key) ?? []), order]);
  }

  const similarUserIds = [...ordersByUser.keys()];
  const [similarUsers, similarUserReviews] = await Promise.all([
    similarUserIds.length > 0
      ? UserModel.find({ _id: { $in: similarUserIds } })
          .select('preferences')
          .lean()
      : [],
    similarUserIds.length > 0
      ? ReviewModel.find({ userId: { $in: similarUserIds }, rating: { $gte: 4 } })
          .select('userId productId rating')
          .lean()
      : [],
  ]);

  const similarUserById = new Map(similarUsers.map((item) => [item._id.toString(), item]));
  const reviewScoreByUserProduct = new Map<string, number>();
  for (const review of similarUserReviews) {
    const reviewUserId = toObjectIdString(review.userId);
    const reviewProductId = toObjectIdString(review.productId);
    if (!reviewUserId || !reviewProductId) continue;
    reviewScoreByUserProduct.set(`${reviewUserId}:${reviewProductId}`, Number(review.rating ?? 0));
  }

  const similarUserEvidence: SimilarUserEvidence[] = [];
  const collaborativeByProduct = new Map<string, { score: number; users: SimilarUserEvidence[] }>();
  const currentProductSet = new Set(interactedIds);

  for (const [otherUserId, orders] of ordersByUser.entries()) {
    const productQuantity = new Map<string, { productName: string; quantity: number }>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const productId = toObjectIdString(item.productId);
        if (!productId) continue;
        const existing = productQuantity.get(productId) ?? { productName: item.name ?? 'Món đã mua', quantity: 0 };
        existing.quantity += Number(item.quantity ?? 1);
        productQuantity.set(productId, existing);
      }
    }

    const otherProductSet = new Set(productQuantity.keys());
    const behaviorSimilarity = jaccard(currentProductSet, otherProductSet);
    const otherUser = similarUserById.get(otherUserId);
    const otherPreferences: Preferences = {
      dietary: otherUser?.preferences?.dietary ?? [],
      allergies: otherUser?.preferences?.allergies ?? [],
      healthGoals: otherUser?.preferences?.healthGoals ?? [],
      tastes: otherUser?.preferences?.tastes ?? [],
    };
    const preferenceSimilarity =
      (overlapRatio(preferences.dietary, otherPreferences.dietary) +
        overlapRatio(preferences.healthGoals, otherPreferences.healthGoals) +
        overlapRatio(preferences.tastes, otherPreferences.tastes)) /
      3;
    const similarity = clamp01(behaviorSimilarity * 0.75 + preferenceSimilarity * 0.25);
    if (similarity <= 0) continue;

    const sharedProducts = [...currentProductSet]
      .filter((productId) => otherProductSet.has(productId))
      .map((productId) => userInteractions.get(productId)?.productName)
      .filter(Boolean) as string[];

    const sharedSignals = [
      ...sharedProducts.slice(0, 3).map((name) => `Cùng từng mua: ${name}`),
      ...buildSharedPreferenceSignals(preferences, otherPreferences),
    ].slice(0, 8);

    const supportingProducts = [...productQuantity.entries()]
      .filter(([productId]) => !currentProductSet.has(productId))
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([productId, value]) => ({
        productId,
        productName: value.productName,
        signal: reviewScoreByUserProduct.has(`${otherUserId}:${productId}`) ? 'reviewed' as const : 'ordered' as const,
        score: reviewScoreByUserProduct.get(`${otherUserId}:${productId}`) ?? Math.min(5, 3 + value.quantity * 0.3),
      }));

    const evidence: SimilarUserEvidence = {
      userIdHash: hashUserId(otherUserId),
      similarity: round(similarity),
      sharedSignals,
      supportingProducts,
    };
    similarUserEvidence.push(evidence);

    for (const product of supportingProducts) {
      const existing = collaborativeByProduct.get(product.productId) ?? { score: 0, users: [] };
      existing.score += similarity * (product.score / 5);
      existing.users.push(evidence);
      collaborativeByProduct.set(product.productId, existing);
    }
  }

  similarUserEvidence.sort((a, b) => b.similarity - a.similarity);

  const candidateIds = new Set<string>(collaborativeByProduct.keys());
  for (const productId of behaviorProductIds) {
    candidateIds.add(productId);
  }
  for (const productId of activeCampaignByProduct.keys()) {
    candidateIds.add(productId);
  }
  const fallbackProducts = await ProductModel.find(productAvailabilityFilter)
    .sort({ rating: -1, reviewCount: -1 })
    .limit(40)
    .populate(PRODUCT_RECIPE_POPULATE)
    .lean();
  for (const product of fallbackProducts) {
    candidateIds.add(product._id.toString());
  }

  const seedProductIds = new Set([...interactedIds, ...behaviorProductIds]);

  const [candidateProductsRaw, interactedProducts] = await Promise.all([
    ProductModel.find({ _id: { $in: [...candidateIds] }, ...productAvailabilityFilter })
      .populate(PRODUCT_RECIPE_POPULATE)
      .lean(),
    seedProductIds.size > 0
      ? ProductModel.find({ _id: { $in: [...seedProductIds] } })
          .select('name category tags healthTags description')
          .lean()
      : [],
  ]);

  const safeProducts = filterSafeProductsByHealthRisk(candidateProductsRaw, preferences);
  const interactedProductTokens = interactedProducts.map((product) => ({
    productId: product._id.toString(),
    productName: product.name,
    source: interactedIds.has(product._id.toString()) ? 'ordered_or_reviewed' as const : 'viewed' as const,
    tokens: new Set(productTokens(product)),
  }));
  const interactedCategories = new Set(interactedProducts.map((product) => normalize(product.category)).filter(Boolean));
  const purchaseCategoryCounts = new Map<string, number>();
  for (const product of interactedProducts) {
    const productId = product._id.toString();
    if (!interactedIds.has(productId)) continue;
    const categoryKey = normalize(product.category);
    if (!categoryKey) continue;
    const interaction = userInteractions.get(productId);
    purchaseCategoryCounts.set(categoryKey, (purchaseCategoryCounts.get(categoryKey) ?? 0) + Number(interaction?.quantity ?? interaction?.orderCount ?? 1));
  }
  const repeatedCategoryLabels = new Set(
    [...purchaseCategoryCounts.entries()]
      .filter(([, count]) => count >= REPEAT_PURCHASE_THRESHOLD)
      .map(([category]) => category)
  );

  const recommendations = safeProducts
    .filter((product) => !interactedIds.has(product._id.toString()))
    .map((product) => {
      const productId = product._id.toString();
      const collaborativeRaw = collaborativeByProduct.get(productId);
      const collaborative = clamp01((collaborativeRaw?.score ?? 0) / Math.max(1, MAX_SIMILAR_USERS));
      const behaviorSignal = behaviorByProduct.get(productId);
      const campaignSignal = activeCampaignByProduct.get(productId);

      const targetTokens = new Set(productTokens(product));
      let bestItemSimilarity = 0;
      let bestSimilarProduct: { productId: string; productName: string; similarity: number; source: 'ordered_or_reviewed' | 'viewed' } | null = null;
      for (const interacted of interactedProductTokens) {
        const similarity = jaccard(targetTokens, interacted.tokens);
        if (similarity > bestItemSimilarity) {
          bestItemSimilarity = similarity;
          bestSimilarProduct = {
            productId: interacted.productId,
            productName: interacted.productName,
            similarity: round(similarity),
            source: interacted.source,
          };
        }
      }

      const categoryKey = normalize(product.category);
      const isRepeatedCategory = repeatedCategoryLabels.has(categoryKey);
      const hasRepeatedTaste = repeatedCategoryLabels.size > 0;

      const breakdown: ScoreBreakdown = {
        collaborative: round(collaborative),
        itemSimilarity: round(bestItemSimilarity),
        userSimilarity: round(collaborative),
        behavior: round(behaviorSignal?.score ?? 0),
        campaign: campaignSignal ? 1 : 0,
        healthGoal: round(preferenceMatchScore(product, preferences.healthGoals)),
        taste: round(preferenceMatchScore(product, preferences.tastes)),
        dietary: round(preferenceMatchScore(product, preferences.dietary)),
        popularity: round(clamp01((Number(product.rating ?? 0) / 5) * 0.75 + Math.min(Number(product.reviewCount ?? 0), 50) / 50 * 0.25)),
        diversity: 0,
        rotation: 0,
      };

      breakdown.diversity = round(isRepeatedCategory ? 0.15 : interactedCategories.has(categoryKey) ? 0.55 : 1);
      breakdown.rotation = round(hasRepeatedTaste && !isRepeatedCategory ? 1 : hasRepeatedTaste ? 0.2 : 0);

      const finalScore = round(
        breakdown.collaborative * 0.24 +
          breakdown.itemSimilarity * 0.15 +
          breakdown.behavior * 0.1 +
          breakdown.campaign * 0.08 +
          breakdown.healthGoal * 0.13 +
          breakdown.taste * 0.12 +
          breakdown.dietary * 0.07 +
          breakdown.popularity * 0.06 +
          breakdown.diversity * 0.03 +
          breakdown.rotation * 0.02
      );

      const matchedSignals: string[] = [];
      if (breakdown.collaborative > 0) matchedSignals.push(`${collaborativeRaw?.users.length ?? 0} người dùng tương tự đã mua/đánh giá tốt món này`);
      if (bestSimilarProduct && breakdown.itemSimilarity > 0) {
        matchedSignals.push(
          bestSimilarProduct.source === 'viewed'
            ? `Tương tự với món khách đã xem: ${bestSimilarProduct.productName}`
            : `Tương tự với món đã từng mua/đánh giá: ${bestSimilarProduct.productName}`
        );
      }
      if (behaviorSignal?.views) matchedSignals.push(`Khách đã xem món này ${behaviorSignal.views} lần gần đây`);
      if (behaviorSignal?.recommendationClicks) matchedSignals.push(`Khách từng mở món này từ khu vực gợi ý`);
      if (campaignSignal) matchedSignals.push(`Đang có chiến dịch: ${campaignSignal.campaignName}`);
      if (breakdown.healthGoal > 0) matchedSignals.push(`Khớp mục tiêu sức khỏe: ${preferences.healthGoals.join(', ')}`);
      if (breakdown.taste > 0) matchedSignals.push(`Khớp khẩu vị: ${preferences.tastes.join(', ')}`);
      if (breakdown.dietary > 0) matchedSignals.push(`Khớp chế độ ăn: ${preferences.dietary.join(', ')}`);
      if (breakdown.popularity >= 0.6) matchedSignals.push(`Được đánh giá tốt (${product.rating ?? 0}/5 từ ${product.reviewCount ?? 0} đánh giá)`);
      if (breakdown.rotation >= 0.8) matchedSignals.push('Đề xuất để khách đổi khẩu vị so với nhóm món đã mua lặp lại');
      matchedSignals.push('Đã kiểm tra không xung đột với hồ sơ dị ứng hiện tại');

      const productWithCampaign = applyCampaignSignalPricing(product, campaignSignal);

      return {
        product: {
          _id: productWithCampaign._id,
          name: productWithCampaign.name,
          description: productWithCampaign.description,
          image: productWithCampaign.image,
          price: productWithCampaign.price,
          campaignPrice: productWithCampaign.campaignPrice,
          isCampaignRunning: productWithCampaign.isCampaignRunning ?? false,
          campaignName: productWithCampaign.campaignName,
          category: productWithCampaign.category,
          rating: productWithCampaign.rating,
          reviewCount: productWithCampaign.reviewCount,
          tags: productWithCampaign.tags ?? [],
          healthTags: productWithCampaign.healthTags ?? [],
          healthRisk: evaluateProductHealthRisk(productWithCampaign, preferences),
        },
        explanation: {
          reason: createDeterministicReason(matchedSignals),
          algorithmVersion: ALGORITHM_VERSION,
          finalScore,
          scoreBreakdown: breakdown,
          matchedSignals,
          similarUsers: (collaborativeRaw?.users ?? []).slice(0, 3),
          similarProducts: bestSimilarProduct && breakdown.itemSimilarity > 0
            ? [{ ...bestSimilarProduct, source: 'tag_similarity' as const }]
            : [],
        },
      };
    })
    .sort((a, b) => b.explanation.finalScore - a.explanation.finalScore)
    .slice(0, MAX_RECOMMENDATIONS);

  return {
    algorithmVersion: ALGORITHM_VERSION,
    computedAt: new Date().toISOString(),
    userProfile: {
      id: user._id.toString(),
      name: user.fullName || user.username || 'Khách hàng',
      email: user.email,
      preferences,
    },
    interactionSummary: {
      completedOrders: userOrders.length,
      reviewedProducts: userReviews.length,
      viewedProducts: [...behaviorByProduct.values()].filter((item) => item.views > 0).length,
      recommendationClicks: [...behaviorByProduct.values()].reduce((sum, item) => sum + item.recommendationClicks, 0),
      interactedProducts: [...userInteractions.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 12),
    },
    topSimilarUsers: similarUserEvidence.slice(0, MAX_SIMILAR_USERS),
    recommendations,
    fallback: {
      usedPopularityFallback: collaborativeByProduct.size === 0,
      reason:
        collaborativeByProduct.size === 0
          ? 'Chưa đủ dữ liệu user tương tự, hệ thống dùng món an toàn và được đánh giá cao.'
          : null,
    },
  };
};
