import { ICart } from '@/types';
import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema<ICart>({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      variations: [
        {
          name: { type: String, required: true },
          choice: { type: String, required: true },
          extra_price: { type: Number, default: 0 },
        },
      ],
    },
  ],
});

//indexes

CartSchema.index({ user_id: 1 }, { unique: true });

const CartModel = mongoose.model<ICart>('Cart', CartSchema, 'carts');

export default CartModel;
