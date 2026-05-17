import mongoose from 'mongoose';
import IFile from './file.type';

export interface IProductIngredient {
  name: string;
  quantity: string;
}

export interface IProductVariantOption {
  choice: string;
  extra_price: number;
}

export interface IProductVariantGroup {
  name: string;          // Size | Toppings | Sugar
  required?: boolean;    // bắt buộc chọn
  multiple?: boolean;    // cho phép chọn nhiều
  max_choices?: number;  // giới hạn toppings
  options: IProductVariantOption[];
}

export default interface IProduct extends mongoose.Document {
  name: string;
  description: string;
  image: IFile['_id'];
  price: number;
  category: string;
  restaurant: string;
  time: string;
  rating: number;
  review_count: number;
  recipe: IProductIngredient[];
  tags: string[];
  health_warning?: string;
  health_tags: string[];
  isAvailable: boolean;
  isFavorite?: boolean;

  variants?: IProductVariantGroup[];
}