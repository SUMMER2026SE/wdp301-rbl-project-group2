import mongoose from 'mongoose';

export const prefixProductImage = (product_id: string | mongoose.Types.ObjectId) => {
  return `product/${product_id.toString()}`;
};
