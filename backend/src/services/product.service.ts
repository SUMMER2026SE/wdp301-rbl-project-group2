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

/**
 * Build a smart search query using synonym mapping + multi-field search
 */
function buildSmartSearchQuery(search: string): any {
  const searchLower = search.toLowerCase().trim();
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Base conditions: always search in name, description, tags, and healthTags
  const orConditions: any[] = [
    { name: { $regex: escapedSearch, $options: 'i' } },
    { description: { $regex: escapedSearch, $options: 'i' } },
    { tags: { $regex: escapedSearch, $options: 'i' } },
    { healthTags: { $regex: escapedSearch, $options: 'i' } },
  ];

  // Check for synonym matches
  const matchedSynonym = SEARCH_SYNONYMS[searchLower];

  if (matchedSynonym) {
    // Add category-based search
    if (matchedSynonym.categories.length > 0) {
      orConditions.push({ category: { $in: matchedSynonym.categories } });
    }

    // Add keyword-based regex search on name
    for (const keyword of matchedSynonym.keywords) {
      if (keyword.toLowerCase() !== searchLower) {
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        orConditions.push({ name: { $regex: escapedKeyword, $options: 'i' } });
      }
    }
  } else {
    // No exact synonym match — try partial matching on synonym keys
    for (const [key, value] of Object.entries(SEARCH_SYNONYMS)) {
      if (key.includes(searchLower) || searchLower.includes(key)) {
        if (value.categories.length > 0) {
          orConditions.push({ category: { $in: value.categories } });
        }
        for (const keyword of value.keywords) {
          const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
