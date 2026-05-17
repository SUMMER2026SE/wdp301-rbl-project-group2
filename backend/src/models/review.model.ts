import { IReview } from '@/types';
import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema<IReview>(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, default: null, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    parent_reply: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', default: null },
    isAnonymous: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

//indexes
ReviewSchema.index({ user_id: 1 });
ReviewSchema.index({ order_id: 1 });
ReviewSchema.index({ product_id: 1 });
ReviewSchema.index({ rating: 1 });

const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema, 'reviews');

export default ReviewModel;
