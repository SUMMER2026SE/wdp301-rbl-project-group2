export interface Product {
  _id: string;
  name: string;
  description: string;
  image: string | { secure_url: string };
  price: number;
  category: string;
  restaurant: string;
  time: string;
  rating: number;
  review_count: number;
  recipe: {
    name: string;
    quantity: string;
  }[];
  tags: string[];
  health_warning?: string;
  health_tags: string[];
  isAvailable: boolean;
  aiReason?: string;
  createdAt: string;
  updatedAt: string;
  variants?: VariantGroup[];
}

export interface VariantOption {
  choice: string;
  extra_price: number;
}

export interface VariantGroup {
  name: string;
  required?: boolean;
  multiple?: boolean;
  max_choices?: number;
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
  health_tags?: string[];
}
