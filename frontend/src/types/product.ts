export interface Product {
  _id: string;
  name: string;
  description: string;
  image: string | { secureUrl: string };
  price: number;
  category: string;
  restaurant: string;
  time: string;
  rating: number;
  reviewCount: number;
  recipe: {
    name: string;
    quantity: string;
  }[];
  tags: string[];
  healthWarning?: string;
  healthTags: string[];
  isAvailable: boolean;
  aiReason?: string;
  createdAt: string;
  updatedAt: string;
  variants?: VariantGroup[];
}

export interface VariantOption {
  choice: string;
  extraPrice: number;
}

export interface VariantGroup {
  name: string;
  required?: boolean;
  multiple?: boolean;
  maxChoices?: number;
  options: VariantOption[];
}

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductFilters {
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
