import { ICart, ICartItemDoc, ICartItemVariationDoc } from '@/types';
import mongoose from 'mongoose';

const CartItemVariationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    choice: { type: String, required: true, trim: true },
    extraPrice: { type: Number, default: 0 },
  },
  { _id: false }
);

const CartItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    note: { type: String, default: null },
    variations: { type: [CartItemVariationSchema], default: [] },
  },
  { _id: false }
);

// --- CARTS ---
const CartSchema = new mongoose.Schema<ICart>(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    cusId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [CartItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Indexes
CartSchema.index({ cusId: 1, storeId: 1 }, { unique: true });
CartSchema.index({ storeId: 1 });

const CartModel = mongoose.model<ICart>('Cart', CartSchema, 'carts');

// --- CART ITEMS (Separate collection mapping) ---
const CartItemDocSchema = new mongoose.Schema<ICartItemDoc>(
  {
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    note: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

CartItemDocSchema.index({ cartId: 1 });

export const CartItemModel = mongoose.model<ICartItemDoc>('CartItem', CartItemDocSchema, 'cart_items');

// --- CART ITEM VARIATIONS (Separate collection mapping) ---
const CartItemVariationDocSchema = new mongoose.Schema<ICartItemVariationDoc>(
  {
    cartItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CartItem', required: true },
    name: { type: String, required: true, trim: true },
    choice: { type: String, required: true, trim: true },
    extraPrice: { type: Number, default: 0 },
  },
  {
    _id: true,
  }
);

CartItemVariationDocSchema.index({ cartItemId: 1 });

export const CartItemVariationModel = mongoose.model<ICartItemVariationDoc>('CartItemVariation', CartItemVariationDocSchema, 'cart_item_variations');

export default CartModel;
