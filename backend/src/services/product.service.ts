import ProductModel from '@/models/product.model';
import { IProduct } from '@/types';
import appAssert from '@/utils/app-assert';
import { NOT_FOUND } from '@/constants/http';

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
}

export const getAllProducts = async (filters: ProductFilters) => {
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
  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable;
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
    query.$text = { $search: search };



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
    ProductModel.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
    ProductModel.countDocuments(query),
  ]);

  return {
    products,
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

export const getProductById = async (id: string) => {
  const product = await ProductModel.findById(id).lean();
  appAssert(product, NOT_FOUND, 'Product not found');
  return product;
};

export const createProduct = async (data: Partial<IProduct>) => {
  const product = await ProductModel.create(data);

  return product;
};

export const updateProduct = async (id: string, data: Partial<IProduct>) => {
  const product = await ProductModel.findByIdAndUpdate(id, data, { new: true });
  appAssert(product, NOT_FOUND, 'Product not found');
  return product;
};

export const deleteProduct = async (id: string) => {
  const product = await ProductModel.findByIdAndDelete(id);
  appAssert(product, NOT_FOUND, 'Product not found');
  return product;
};
