import mongoose from 'mongoose';

export interface IReview extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId | null;
  rating: number;
  comment?: string | null;
  images: string[];
  reply?: string | null;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}
