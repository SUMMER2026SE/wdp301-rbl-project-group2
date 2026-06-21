import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { IngredientModel } from '@/models/ingredient.model';
import { StoreModel } from '@/models/store.model';
import { CampaignModel } from '@/models/campaign.model';
import { CampaignStatus } from '@/types/campaign.type';
import { IProduct } from '@/types';
import appAssert from '@/utils/app-assert';
import { NOT_FOUND } from '@/constants/http';
import {
  attachSharedToppingVariants,
  attachSharedToppingVariantsToProducts,
} from '@/services/shared-topping.service';
import { evaluateProductHealthRisk } from '@/services/health-risk.service';

export const DEFAULT_PUBLIC_STORE_ID = '60c72b2f9b1d8b2a3c8b4567';

const PRODUCT_RECIPE_POPULATE = {
  path: 'recipe.ingredientId',
  select: 'name allergenTags',
};

const normalizeIngredientName = (value: string) => {
  const trimmed = value.trim();
  return trimmed
    ? trimmed
        .split(/\s+/)
        .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    : trimmed;
};

const withRecipeNames = <T extends Record<string, any>>(product: T): T => {
  if (!Array.isArray(product.recipe)) return product;

  return {
    ...product,
    recipe: product.recipe.map((item: any) => ({
      ...item,
      name: item?.ingredientId?.name,
      allergenTags: item?.ingredientId?.allergenTags ?? [],
    })),
  };
};

// ─── Vietnamese Smart Search Synonym Dictionary ───
const SEARCH_SYNONYMS: Record<string, { keywords: string[]; categories: string[] }> = {
  // Đồ uống
  'nước': { keywords: ['nước', 'trà', 'cà phê', 'sinh tố', 'nước ép', 'sữa', 'coca', 'pepsi', 'bia', 'rượu', 'chanh', 'cam', 'dừa', 'soda', 'matcha', 'latte', 'smoothie'], categories: ['Giải Khát & Tráng Miệng'] },
  'đồ uống': { keywords: ['nước', 'trà', 'cà phê', 'sinh tố', 'nước ép', 'sữa', 'smoothie', 'latte', 'matcha'], categories: ['Giải Khát & Tráng Miệng'] },
  'uống': { keywords: ['nước', 'trà', 'cà phê', 'sinh tố', 'nước ép', 'sữa'], categories: ['Giải Khát & Tráng Miệng'] },
  'trà': { keywords: ['trà', 'tea', 'trà đào', 'trà sữa', 'trà xanh', 'trà oolong', 'trà chanh'], categories: ['Giải Khát & Tráng Miệng'] },
  'cà phê': { keywords: ['cà phê', 'coffee', 'latte', 'espresso', 'cappuccino', 'americano', 'mocha'], categories: ['Giải Khát & Tráng Miệng'] },
  'cafe': { keywords: ['cà phê', 'coffee', 'latte', 'espresso', 'cappuccino'], categories: ['Giải Khát & Tráng Miệng'] },
  'coffee': { keywords: ['cà phê', 'coffee', 'latte', 'espresso', 'cappuccino'], categories: ['Giải Khát & Tráng Miệng'] },
  'sinh tố': { keywords: ['sinh tố', 'smoothie', 'xoài', 'dâu', 'bơ', 'chuối'], categories: ['Giải Khát & Tráng Miệng'] },

  // Món chính - Cơm & Nước
  'cơm': { keywords: ['cơm', 'cơm tấm', 'cơm chiên', 'cơm rang', 'cơm gà', 'cơm sườn', 'cơm cuộn'], categories: ['Cơm Đĩa Truyền Thống'] },
  'bún': { keywords: ['bún', 'bún bò', 'bún riêu', 'bún chả', 'bún thịt'], categories: ['Trứ Danh Món Nước'] },
  'phở': { keywords: ['phở', 'phở bò', 'phở gà'], categories: ['Trứ Danh Món Nước'] },
  'mì': { keywords: ['mì', 'mỳ', 'mì xào', 'mì quảng', 'spaghetti', 'pasta', 'noodle'], categories: ['Trứ Danh Món Nước'] },

  // Thịt
  'thịt': { keywords: ['thịt', 'sườn', 'bò', 'heo', 'lợn', 'gà', 'vịt', 'nướng', 'kho', 'rim', 'chiên', 'steak', 'burger'], categories: ['Cơm Đĩa Truyền Thống', 'Gọi Thêm Ăn Kèm'] },
  'gà': { keywords: ['gà', 'chicken', 'cánh gà', 'đùi gà', 'gà rán', 'gà nướng', 'gà chiên'], categories: ['Cơm Đĩa Truyền Thống', 'Gọi Thêm Ăn Kèm'] },
  'bò': { keywords: ['bò', 'beef', 'steak', 'bít tết', 'bò kho', 'bò lúc lắc'], categories: ['Cơm Đĩa Truyền Thống'] },
  'hải sản': { keywords: ['hải sản', 'tôm', 'cá', 'mực', 'cua', 'ghẹ', 'sò', 'ốc', 'seafood'], categories: ['Cơm Đĩa Truyền Thống', 'Gọi Thêm Ăn Kèm'] },
  'cá': { keywords: ['cá', 'cá hồi', 'cá thu', 'cá kho', 'cá chiên', 'fish'], categories: ['Cơm Đĩa Truyền Thống'] },
  'tôm': { keywords: ['tôm', 'tôm hùm', 'tôm nướng', 'tôm chiên', 'shrimp'], categories: ['Cơm Đĩa Truyền Thống', 'Gọi Thêm Ăn Kèm'] },

  // Đồ ăn nhanh
  'đồ ăn nhanh': { keywords: ['burger', 'pizza', 'hotdog', 'gà rán', 'khoai tây', 'sandwich', 'wrap'], categories: ['Gọi Thêm Ăn Kèm'] },
  'pizza': { keywords: ['pizza', 'pepperoni', 'margherita', 'hawaiian'], categories: ['Gọi Thêm Ăn Kèm'] },
  'burger': { keywords: ['burger', 'hamburger', 'cheeseburger'], categories: ['Gọi Thêm Ăn Kèm'] },

  // Tráng miệng
  'tráng miệng': { keywords: ['kem', 'bánh', 'chè', 'pudding', 'flan', 'mousse', 'tiramisu', 'yogurt'], categories: ['Giải Khát & Tráng Miệng'] },
  'ngọt': { keywords: ['kem', 'bánh', 'chè', 'pudding', 'flan', 'đường', 'mật ong', 'chocolate'], categories: ['Giải Khát & Tráng Miệng'] },
  'bánh': { keywords: ['bánh', 'cake', 'bánh mì', 'bánh ngọt', 'bánh tráng', 'bánh cuốn'], categories: ['Giải Khát & Tráng Miệng', 'Gọi Thêm Ăn Kèm'] },
  'kem': { keywords: ['kem', 'ice cream', 'gelato', 'sorbet'], categories: ['Giải Khát & Tráng Miệng'] },
  'chè': { keywords: ['chè', 'chè bưởi', 'chè đậu', 'chè thái'], categories: ['Giải Khát & Tráng Miệng'] },

  // Khai vị
  'khai vị': { keywords: ['gỏi', 'salad', 'nem', 'chả giò', 'khoai tây chiên', 'soup', 'súp', 'canh'], categories: ['Gọi Thêm Ăn Kèm'] },
  'salad': { keywords: ['salad', 'gỏi', 'rau', 'trộn'], categories: ['Góc Healthy & Ăn Kiêng', 'Gọi Thêm Ăn Kèm'] },
  'gỏi': { keywords: ['gỏi', 'salad', 'trộn', 'nộm'], categories: ['Góc Healthy & Ăn Kiêng', 'Gọi Thêm Ăn Kèm'] },

  // Chay
  'chay': { keywords: ['chay', 'rau', 'đậu hũ', 'đậu phụ', 'nấm', 'rau củ', 'vegan', 'vegetarian'], categories: [] },
  'rau': { keywords: ['rau', 'salad', 'rau muống', 'rau cải', 'rau xào', 'luộc'], categories: ['Góc Healthy & Ăn Kiêng'] },

  // Nướng / Chiên
  'nướng': { keywords: ['nướng', 'bbq', 'barbecue', 'xiên', 'than hoa', 'lò'], categories: ['Cơm Đĩa Truyền Thống'] },
  'chiên': { keywords: ['chiên', 'rán', 'giòn', 'xù', 'fried'], categories: ['Cơm Đĩa Truyền Thống', 'Gọi Thêm Ăn Kèm'] },

  // Ăn sáng
  'sáng': { keywords: ['sáng', 'breakfast', 'bánh mì', 'xôi', 'phở', 'bún', 'cháo', 'trứng'], categories: [] },
  'ăn sáng': { keywords: ['bánh mì', 'xôi', 'phở', 'bún', 'cháo', 'trứng', 'sandwich'], categories: [] },
};

const CATEGORY_INTENT_TERMS = new Set([
  'nuoc',
  'do uong',
  'uong',
  'tra',
  'ca phe',
  'cafe',
  'coffee',
  'sinh to',
  'com',
  'bun',
  'pho',
  'mi',
  'do an nhanh',
  'pizza',
  'burger',
  'trang mieng',
  'ngot',
  'banh',
  'kem',
  'che',
  'khai vi',
  'salad',
  'goi',
  'chay',
  'rau',
  'nuong',
  'chien',
  'sang',
  'an sang',
]);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const VIETNAMESE_CHAR_PATTERNS: Record<string, string> = {
  a: '[a\u00e0\u00e1\u1ea3\u00e3\u1ea1\u0103\u1eb1\u1eaf\u1eb3\u1eb5\u1eb7\u00e2\u1ea7\u1ea5\u1ea9\u1eab\u1ead]',
  e: '[e\u00e8\u00e9\u1ebb\u1ebd\u1eb9\u00ea\u1ec1\u1ebf\u1ec3\u1ec5\u1ec7]',
  i: '[i\u00ec\u00ed\u1ec9\u0129\u1ecb]',
  o: '[o\u00f2\u00f3\u1ecf\u00f5\u1ecd\u00f4\u1ed3\u1ed1\u1ed5\u1ed7\u1ed9\u01a1\u1edd\u1edb\u1edf\u1ee1\u1ee3]',
  u: '[u\u00f9\u00fa\u1ee7\u0169\u1ee5\u01b0\u1eeb\u1ee9\u1eed\u1eef\u1ef1]',
  y: '[y\u1ef3\u00fd\u1ef7\u1ef9\u1ef5]',
  d: '[d\u0111]',
};

const buildVietnameseSearchPattern = (value: string) =>
  normalizeSearchText(value)
    .split('')
    .map((char) => {
      if (/\s/.test(char)) return '\\s+';
      return VIETNAMESE_CHAR_PATTERNS[char] ?? escapeRegex(char);
    })
    .join('');

const normalizeSearchText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .trim();

const getSearchTokens = (search: string) =>
  normalizeSearchText(search)
    .split(/\s+/)
    .filter((token) => token.length >= 2);

const getProductSearchText = (product: Record<string, any>) =>
  normalizeSearchText(
    [
      product.name,
      product.description,
      product.category,
      product.restaurant,
      ...(Array.isArray(product.tags) ? product.tags : []),
      ...(Array.isArray(product.healthTags) ? product.healthTags : []),
      ...(Array.isArray(product.recipe) ? product.recipe.map((item: any) => item?.name ?? item?.ingredientId?.name) : []),
    ]
      .filter(Boolean)
      .join(' ')
  );

const findSearchSynonym = (search: string) => {
  const searchLower = search.toLowerCase().trim();
  const exact = SEARCH_SYNONYMS[searchLower];
  if (exact) return { key: searchLower, value: exact };

  const normalizedSearch = normalizeSearchText(searchLower);
  const normalizedEntry = Object.entries(SEARCH_SYNONYMS).find(
    ([key]) => normalizeSearchText(key) === normalizedSearch
  );
  return normalizedEntry ? { key: normalizedEntry[0], value: normalizedEntry[1] } : null;
};

const getSearchRelevanceScore = (product: Record<string, any>, search: string) => {
  const normalizedSearch = normalizeSearchText(search);
  const tokens = getSearchTokens(search);
  const normalizedName = normalizeSearchText(product.name);
  const normalizedCategory = normalizeSearchText(product.category);
  const haystack = getProductSearchText(product);
  let score = 0;

  if (normalizedName === normalizedSearch) score += 1000;
  if (normalizedName.includes(normalizedSearch)) score += 700;
  if (haystack.includes(normalizedSearch)) score += 250;
  if (tokens.length > 0 && tokens.every((token) => normalizedName.includes(token))) score += 300;
  if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) score += 120;

  for (const token of tokens) {
    if (normalizedName.includes(token)) score += 45;
    else if (haystack.includes(token)) score += 15;
  }

  const matchedSynonym = findSearchSynonym(search)?.value;
  if (matchedSynonym) {
    for (const keyword of matchedSynonym.keywords) {
      const normalizedKeyword = normalizeSearchText(keyword);
      if (normalizedName.includes(normalizedKeyword)) score += 90;
      else if (haystack.includes(normalizedKeyword)) score += 25;
    }
    if (
      CATEGORY_INTENT_TERMS.has(normalizedSearch) &&
      matchedSynonym.categories.some((category) => normalizeSearchText(category) === normalizedCategory)
    ) {
      score += 160;
    }
  }

  score += Math.min(Number(product.reviewCount ?? 0), 50) * 0.5;
  score += Number(product.rating ?? 0);

  return score;
};

/**
 * Build a smart search query using synonym mapping + multi-field search
 */
function buildSmartSearchQuery(search: string): any {
  const searchLower = search.toLowerCase().trim();
  const normalizedSearch = normalizeSearchText(search);
  const escapedSearch = buildVietnameseSearchPattern(search);
  const isSpecificPhrase = /\s/.test(searchLower);

  // Base conditions: always search in name, description, tags, and healthTags
  const orConditions: any[] = [
    { name: { $regex: escapedSearch, $options: 'i' } },
    { description: { $regex: escapedSearch, $options: 'i' } },
    { tags: { $regex: escapedSearch, $options: 'i' } },
    { healthTags: { $regex: escapedSearch, $options: 'i' } },
  ];

  if (isSpecificPhrase) {
    for (const token of searchLower.split(/\s+/).filter((item) => item.length >= 2)) {
      const escapedToken = buildVietnameseSearchPattern(token);
      orConditions.push({ name: { $regex: escapedToken, $options: 'i' } });
      orConditions.push({ tags: { $regex: escapedToken, $options: 'i' } });
    }
  }

  // Check for synonym matches
  const matchedSynonym = findSearchSynonym(searchLower)?.value;

  if (matchedSynonym) {
    if (CATEGORY_INTENT_TERMS.has(normalizedSearch) && matchedSynonym.categories.length > 0) {
      orConditions.push({ category: { $in: matchedSynonym.categories } });
    }

    // Add keyword-based regex search on name
    for (const keyword of matchedSynonym.keywords) {
      if (keyword.toLowerCase() !== searchLower) {
        const escapedKeyword = buildVietnameseSearchPattern(keyword);
        orConditions.push({ name: { $regex: escapedKeyword, $options: 'i' } });
      }
    }
  } else if (!isSpecificPhrase) {
    // No exact synonym match — try partial matching on synonym keys
    for (const [key, value] of Object.entries(SEARCH_SYNONYMS)) {
      const normalizedKey = normalizeSearchText(key);
      if (normalizedKey.includes(normalizedSearch) || normalizedSearch.includes(normalizedKey)) {
        for (const keyword of value.keywords) {
          const escapedKeyword = buildVietnameseSearchPattern(keyword);
          orConditions.push({ name: { $regex: escapedKeyword, $options: 'i' } });
        }
        break; // Only use the first partial match
      }
    }
  }

  return { $or: orConditions };
}


interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  isAvailable?: boolean;
  healthTags?: string[];
  storeId?: string;
  showAll?: boolean;
}

const attachHealthRisk = <T extends Record<string, any>>(product: T, preferences?: any): T => {
  if (!preferences) return product;
  return {
    ...product,
    healthRisk: evaluateProductHealthRisk(product, preferences),
  };
};

const resolveRecipeItems = async (recipe: Array<{ ingredientId?: string; ingredientName?: string; quantity: number; unit: string }>) => {
  const resolved = [] as Array<{ ingredientId: mongoose.Types.ObjectId; quantity: number; unit: string }>;
  for (const item of recipe) {
    let ingredientId = item.ingredientId;
    if (!ingredientId && item.ingredientName) {
      const name = normalizeIngredientName(item.ingredientName);
      const existing = await IngredientModel.findOne({ name }).lean();
      const ingredient = existing
        ? existing
        : await IngredientModel.create({
            name,
            description: '',
            allergenTags: [],
            allergenReviewStatus: 'pending',
            allergenSource: 'manual',
          });
      ingredientId = String(ingredient._id);
    }

    if (!ingredientId) continue;
    resolved.push({
      ingredientId: new mongoose.Types.ObjectId(ingredientId),
      quantity: item.quantity,
      unit: item.unit,
    });
  }
  return resolved;
};

async function applyCampaignPricing<T extends { _id: any; price: number }>(
  products: T[]
): Promise<(T & { campaignPrice?: number })[]> {
  if (!products.length) return products;
  const now = new Date();
  const campaigns = await CampaignModel.find({
    status: CampaignStatus.APPROVED,
    startTime: { $lte: now },
    endTime: { $gte: now },
  }).lean();
  if (!campaigns.length) {
    return products.map((p) => ({ ...p, isCampaignRunning: false }));
  }

  const pricingMap = new Map<string, { discount?: number | null; fixedPrice?: number | null; type: string }>();
  for (const c of campaigns) {
    for (const item of c.products) {
      const pid = item.productId.toString();
      if (!pricingMap.has(pid)) {
        pricingMap.set(pid, { discount: item.discount, fixedPrice: item.fixedPrice, type: c.type });
      }
    }
  }

  return products.map((p) => {
    const rule = pricingMap.get(String(p._id));
    if (!rule) return { ...p, isCampaignRunning: false };
    let campaignPrice: number | undefined;
    if (rule.type === 'fixed_price' && rule.fixedPrice != null) {
      campaignPrice = rule.fixedPrice;
    } else if (rule.discount != null) {
      campaignPrice = Math.round(p.price * (1 - rule.discount / 100));
    }
    return campaignPrice != null 
      ? { ...p, campaignPrice, isCampaignRunning: true } 
      : { ...p, isCampaignRunning: false };
  });
}

export const getAllProducts = async (filters: ProductFilters, preferences?: any) => {
  const {
    category,
    minPrice,
    maxPrice,
    minRating,
    search,
    sort = 'popular',
    page = 1,
    limit = 12,
    isAvailable,
    healthTags,
  } = filters;

  const query: any = {};

  // Default: only show available & active products to customers.
  // Staff/admin pass showAll=true to bypass this filter in management views.
  if (filters.showAll) {
    // Staff/admin management: show everything except deleted
    query.status = { $ne: 'deleted' };
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable;
    }
  } else {
    // Customer view: only show available & active products
    query.isAvailable = isAvailable !== undefined ? isAvailable : true;
    query.status = { $nin: ['deleted', 'inactive', 'out_of_stock'] };
  }
  if (healthTags?.length) {
    query.healthTags = { $in: healthTags };
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  if (minRating !== undefined) {
    query.rating = { $gte: minRating };
  }

  if (search) {
    const smartSearchQuery = buildSmartSearchQuery(search);
    if (smartSearchQuery) {
      // Merge smart search conditions with existing query
      if (smartSearchQuery.$or) {
        query.$or = smartSearchQuery.$or;
      }
    }
  }

  let sortOptions: any = {};
  switch (sort) {
    case 'price_asc':
    case 'price_low':
      sortOptions = { price: 1 };
      break;
    case 'price_desc':
    case 'price_high':
      sortOptions = { price: -1 };
      break;
    case 'rating':
      sortOptions = { rating: -1 };
      break;
    case 'popular':
    default:
      sortOptions = { reviewCount: -1, rating: -1 };
      break;
  }

  const skip = (page - 1) * limit;

  if (search?.trim()) {
    const candidateLimit = Math.min(Math.max(skip + limit, 100), 500);
    const [candidateProducts, total] = await Promise.all([
      ProductModel.find(query)
        .populate(PRODUCT_RECIPE_POPULATE)
        .sort(sortOptions)
        .limit(candidateLimit)
        .lean(),
      ProductModel.countDocuments(query),
    ]);

    const rankedProducts = candidateProducts
      .map((product) => withRecipeNames(product))
      .sort((a, b) => {
        const scoreDiff = getSearchRelevanceScore(b, search) - getSearchRelevanceScore(a, search);
        if (scoreDiff !== 0) return scoreDiff;
        const reviewDiff = Number(b.reviewCount ?? 0) - Number(a.reviewCount ?? 0);
        if (reviewDiff !== 0) return reviewDiff;
        return Number(b.rating ?? 0) - Number(a.rating ?? 0);
      })
      .slice(skip, skip + limit);

    const productsWithToppings = await attachSharedToppingVariantsToProducts(rankedProducts);
    const productsWithRisk = productsWithToppings.map((product: any) => attachHealthRisk(product, preferences));
    const productsWithCampaign = await applyCampaignPricing(productsWithRisk);

    return {
      products: productsWithCampaign,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  const [products, total] = await Promise.all([
    ProductModel.find(query)
      .populate(PRODUCT_RECIPE_POPULATE)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    ProductModel.countDocuments(query),
  ]);
  const productsWithIngredients = products.map((product) => withRecipeNames(product));
  const productsWithToppings = await attachSharedToppingVariantsToProducts(productsWithIngredients);
  const productsWithRisk = productsWithToppings.map((product: any) => attachHealthRisk(product, preferences));

  const productsWithCampaign = await applyCampaignPricing(productsWithRisk);

  return {
    products: productsWithCampaign,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getDistinctCategories = async () => {
  const categories = await ProductModel.distinct('category');
  return categories;
};

export const getProductById = async (id: string, preferences?: any) => {
  const product = await ProductModel.findById(id).populate(PRODUCT_RECIPE_POPULATE).lean();
  appAssert(product, NOT_FOUND, 'Product not found');
  const productWithToppings = await attachSharedToppingVariants(withRecipeNames(product));
  const withRisk = attachHealthRisk(productWithToppings, preferences);
  const [withCampaign] = await applyCampaignPricing([withRisk]);
  return withCampaign;
};

export const getProductHealthRisk = async (id: string, preferences: any) => {
  const product = await ProductModel.findById(id).populate(PRODUCT_RECIPE_POPULATE).lean();
  appAssert(product, NOT_FOUND, 'Product not found');
  return evaluateProductHealthRisk(product, preferences);
};

export const createProduct = async (data: Partial<IProduct>, globalCreate?: boolean) => {
  const recipe = await resolveRecipeItems((data as any).recipe ?? []);
  const product = await ProductModel.create({
    ...data,
    recipe,
    imgEmbedding: (data as any).imgEmbedding ?? String(data.image ?? data.name ?? 'product'),
  });

  return product;
};

export const updateProduct = async (id: string, data: Partial<IProduct>, globalUpdate?: boolean) => {
  const recipe = data.recipe ? await resolveRecipeItems((data as any).recipe ?? []) : undefined;
  
  const updateFields: any = {
    ...data,
    ...(recipe ? { recipe } : {})
  };

  // Only update imgEmbedding if name, image, or imgEmbedding is explicitly changed
  if ((data as any).imgEmbedding !== undefined) {
    updateFields.imgEmbedding = (data as any).imgEmbedding;
  } else if (data.image !== undefined || data.name !== undefined) {
    updateFields.imgEmbedding = String(data.image ?? data.name ?? 'product');
  }

  const product = await ProductModel.findByIdAndUpdate(
    id,
    updateFields,
    { new: true }
  );
  appAssert(product, NOT_FOUND, 'Product not found');
  return product;
};

export const deleteProduct = async (id: string, globalDelete?: boolean) => {
  const product = await ProductModel.findByIdAndDelete(id);
  appAssert(product, NOT_FOUND, 'Product not found');
  return product;
};
