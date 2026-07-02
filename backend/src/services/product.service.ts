import mongoose from 'mongoose';
import ProductModel from '@/models/product.model';
import { IngredientModel } from '@/models/ingredient.model';
import { StoreModel } from '@/models/store.model';
import { CampaignModel } from '@/models/campaign.model';
import { CampaignStatus } from '@/types/campaign.type';
import { IProduct } from '@/types';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import {
  attachSharedToppingVariants,
  attachSharedToppingVariantsToProducts,
} from '@/services/shared-topping.service';
import { evaluateProductHealthRisk } from '@/services/health-risk.service';
import { applyStoreAvailabilityToProducts } from '@/utils/product-store-availability';

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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export async function applyCampaignPricing<T extends { _id: any; price: number }>(
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
    storeId,
  } = filters;

  const query: any = {};
  let requestedStoreId: mongoose.Types.ObjectId | undefined;

  if (storeId) {
    appAssert(mongoose.isValidObjectId(storeId), BAD_REQUEST, 'Store id không hợp lệ');
    requestedStoreId = new mongoose.Types.ObjectId(storeId);
  }

  // Default: only show available products to customers.
  // Staff/admin pass showAll=true to bypass this filter in management views.
  const shouldFilterCustomerVisibilityAfterStoreOverride = Boolean(requestedStoreId && !filters.showAll);

  if (filters.showAll) {
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable;
    }
  } else if (shouldFilterCustomerVisibilityAfterStoreOverride) {
    // Store override rows must win before customer visibility filtering.
  } else {
    // Customer view: only show available products.
    query.isAvailable = isAvailable !== undefined ? isAvailable : true;
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

  const literalSearch = search?.trim();
  if (literalSearch) {
    query.name = { $regex: escapeRegex(literalSearch), $options: 'i' };
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
  const scopedProducts = requestedStoreId
    ? applyStoreAvailabilityToProducts(productsWithCampaign, requestedStoreId)
    : productsWithCampaign;
  const visibleProducts = shouldFilterCustomerVisibilityAfterStoreOverride
    ? scopedProducts.filter((product: any) => {
        const expectedAvailability = isAvailable !== undefined ? isAvailable : true;
        return (
          product.isAvailable === expectedAvailability &&
          !['inactive', 'out_of_stock'].includes(String(product.status))
        );
      })
    : scopedProducts;

  return {
    products: visibleProducts,
    pagination: {
      page,
      limit,
      total: requestedStoreId ? visibleProducts.length : total,
      totalPages: Math.ceil((requestedStoreId ? visibleProducts.length : total) / limit),
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
