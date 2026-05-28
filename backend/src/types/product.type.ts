import mongoose from 'mongoose';

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DELETED = 'deleted',
}

export enum ProductCategory {
  FOOD = 'food',
  DRINK = 'drink',
  COMBO = 'combo',
  OTHER = 'other',
}

export interface IProductRecipeItem {
  ingredientId: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
}

export interface IProductVariantOption {
  choice: string;
  extraPrice: number;
}

export interface IProductVariantGroup {
  name: string;
  required?: boolean;
  multiple?: boolean;
  maxChoices?: number;
  options: IProductVariantOption[];
}

export interface IProduct extends mongoose.Document<mongoose.Types.ObjectId> {
  storeId: mongoose.Types.ObjectId;
  status: ProductStatus;
  nameEmbedding?: string | null;
  imgEmbedding: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  category: ProductCategory;
  restaurant?: string;
  time?: string;
  rating?: number;
  reviewCount?: number;
  recipe: IProductRecipeItem[];
  allergenTags: string[];
  healthWarning?: string;
  healthTags?: string[];
  
  // camelCase fields
  isAvailable?: boolean;
  variants?: IProductVariantGroup[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
