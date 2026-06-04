import ProductModel from '@/models/product.model';
import { IProduct } from '@/types';
import appAssert from '@/utils/app-assert';
import { NOT_FOUND } from '@/constants/http';

// ─── Vietnamese Smart Search Synonym Dictionary ───
// Maps common search terms to related keywords and categories
const SEARCH_SYNONYMS: Record<string, { keywords: string[]; categories: string[] }> = {
  // Đồ uống
  'nước': { keywords: ['nước', 'trà', 'cà phê', 'sinh tố', 'nước ép', 'sữa', 'coca', 'pepsi', 'bia', 'rượu', 'chanh', 'cam', 'dừa', 'soda', 'matcha', 'latte', 'smoothie'], categories: ['Đồ uống'] },
  'đồ uống': { keywords: ['nước', 'trà', 'cà phê', 'sinh tố', 'nước ép', 'sữa', 'smoothie', 'latte', 'matcha'], categories: ['Đồ uống'] },
  'uống': { keywords: ['nước', 'trà', 'cà phê', 'sinh tố', 'nước ép', 'sữa'], categories: ['Đồ uống'] },
  'trà': { keywords: ['trà', 'tea', 'trà đào', 'trà sữa', 'trà xanh', 'trà oolong', 'trà chanh'], categories: ['Đồ uống'] },
  'cà phê': { keywords: ['cà phê', 'coffee', 'latte', 'espresso', 'cappuccino', 'americano', 'mocha'], categories: ['Đồ uống'] },
  'cafe': { keywords: ['cà phê', 'coffee', 'latte', 'espresso', 'cappuccino'], categories: ['Đồ uống'] },
  'coffee': { keywords: ['cà phê', 'coffee', 'latte', 'espresso', 'cappuccino'], categories: ['Đồ uống'] },
  'sinh tố': { keywords: ['sinh tố', 'smoothie', 'xoài', 'dâu', 'bơ', 'chuối'], categories: ['Đồ uống'] },

  // Món chính - Cơm
  'cơm': { keywords: ['cơm', 'cơm tấm', 'cơm chiên', 'cơm rang', 'cơm gà', 'cơm sườn', 'cơm cuộn'], categories: ['Món chính'] },
  'bún': { keywords: ['bún', 'bún bò', 'bún riêu', 'bún chả', 'bún thịt'], categories: ['Món chính'] },
  'phở': { keywords: ['phở', 'phở bò', 'phở gà'], categories: ['Món chính'] },
  'mì': { keywords: ['mì', 'mỳ', 'mì xào', 'mì quảng', 'spaghetti', 'pasta', 'noodle'], categories: ['Món chính'] },

  // Thịt
  'thịt': { keywords: ['thịt', 'sườn', 'bò', 'heo', 'lợn', 'gà', 'vịt', 'nướng', 'kho', 'rim', 'chiên', 'steak', 'burger'], categories: ['Món chính', 'Đồ ăn nhanh'] },
  'gà': { keywords: ['gà', 'chicken', 'cánh gà', 'đùi gà', 'gà rán', 'gà nướng', 'gà chiên'], categories: ['Món chính', 'Đồ ăn nhanh'] },
  'bò': { keywords: ['bò', 'beef', 'steak', 'bít tết', 'bò kho', 'bò lúc lắc'], categories: ['Món chính'] },
  'hải sản': { keywords: ['hải sản', 'tôm', 'cá', 'mực', 'cua', 'ghẹ', 'sò', 'ốc', 'seafood'], categories: ['Món chính', 'Khai vị'] },
  'cá': { keywords: ['cá', 'cá hồi', 'cá thu', 'cá kho', 'cá chiên', 'fish'], categories: ['Món chính'] },
  'tôm': { keywords: ['tôm', 'tôm hùm', 'tôm nướng', 'tôm chiên', 'shrimp'], categories: ['Món chính', 'Khai vị'] },

  // Đồ ăn nhanh
  'đồ ăn nhanh': { keywords: ['burger', 'pizza', 'hotdog', 'gà rán', 'khoai tây', 'sandwich', 'wrap'], categories: ['Đồ ăn nhanh'] },
  'pizza': { keywords: ['pizza', 'pepperoni', 'margherita', 'hawaiian'], categories: ['Đồ ăn nhanh'] },
  'burger': { keywords: ['burger', 'hamburger', 'cheeseburger'], categories: ['Đồ ăn nhanh'] },

  // Tráng miệng
  'tráng miệng': { keywords: ['kem', 'bánh', 'chè', 'pudding', 'flan', 'mousse', 'tiramisu', 'yogurt'], categories: ['Tráng miệng'] },
  'ngọt': { keywords: ['kem', 'bánh', 'chè', 'pudding', 'flan', 'đường', 'mật ong', 'chocolate'], categories: ['Tráng miệng'] },
  'bánh': { keywords: ['bánh', 'cake', 'bánh mì', 'bánh ngọt', 'bánh tráng', 'bánh cuốn'], categories: ['Tráng miệng', 'Khai vị', 'Đồ ăn nhanh'] },
  'kem': { keywords: ['kem', 'ice cream', 'gelato', 'sorbet'], categories: ['Tráng miệng'] },
  'chè': { keywords: ['chè', 'chè bưởi', 'chè đậu', 'chè thái'], categories: ['Tráng miệng'] },

  // Khai vị
  'khai vị': { keywords: ['gỏi', 'salad', 'nem', 'chả giò', 'khoai tây chiên', 'soup', 'súp', 'canh'], categories: ['Khai vị'] },
  'salad': { keywords: ['salad', 'gỏi', 'rau', 'trộn'], categories: ['Salad', 'Khai vị'] },
  'gỏi': { keywords: ['gỏi', 'salad', 'trộn', 'nộm'], categories: ['Salad', 'Khai vị'] },

  // Chay
  'chay': { keywords: ['chay', 'rau', 'đậu hũ', 'đậu phụ', 'nấm', 'rau củ', 'vegan', 'vegetarian'], categories: [] },
  'rau': { keywords: ['rau', 'salad', 'rau muống', 'rau cải', 'rau xào', 'luộc'], categories: ['Salad'] },

  // Nướng / Chiên
  'nướng': { keywords: ['nướng', 'bbq', 'barbecue', 'xiên', 'than hoa', 'lò'], categories: ['Món chính'] },
  'chiên': { keywords: ['chiên', 'rán', 'giòn', 'xù', 'fried'], categories: ['Món chính', 'Đồ ăn nhanh', 'Khai vị'] },

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

  // Base conditions: always search in name, description, and tags
  const orConditions: any[] = [
    { name: { $regex: escapedSearch, $options: 'i' } },
    { description: { $regex: escapedSearch, $options: 'i' } },
    { tags: { $regex: escapedSearch, $options: 'i' } },
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
