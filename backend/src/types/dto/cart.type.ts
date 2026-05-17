import mongoose from 'mongoose';

export interface ICartVariation {
  name: string;        // "size" | "variant" | "topping"
  choice: string;       // "small" | "medium" | "large" 
  extra_price: number;
}

export interface ICartItem {
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  price: number; 
  variations: ICartVariation[];
}

export interface ICart extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  items: ICartItem[];
}