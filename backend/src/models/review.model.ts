import { IReview } from '@/types';
import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema<IReview>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
    images: { type: [String], default: [] },
    reply: { type: String, default: null },
    isAnonymous: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ orderId: 1 });
ReviewSchema.index({ productId: 1 });

// Compound Indexes
ReviewSchema.index({ productId: 1, rating: -1 });

const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema, 'reviews');

export default ReviewModel;
