import mongoose from 'mongoose';

export interface ICartItemVariation {
  name: string;
  choice: string;
  extraPrice: number;
}

export interface ICartItem {
  itemId?: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  note?: string;
  variations: ICartItemVariation[];
}

export interface ICart extends mongoose.Document<mongoose.Types.ObjectId> {
  storeId: mongoose.Types.ObjectId;
  cusId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItemDoc extends mongoose.Document<mongoose.Types.ObjectId> {
  cartId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  name?: string;
  image?: string;
  quantity: number;
  price: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItemVariationDoc extends mongoose.Document<mongoose.Types.ObjectId> {
  cartItemId: mongoose.Types.ObjectId;
  variation_optionIds: mongoose.Types.ObjectId[];
  name: string;
  choice: string;
  extraPrice: number;
  createdAt: Date;
}
