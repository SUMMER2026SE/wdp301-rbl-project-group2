import mongoose from 'mongoose';

export const REVIEW_FEEDBACK_TAG_VALUES = [
  'unhygienic',
  'wrong_flavor',
  'too_salty',
  'too_bland',
  'too_sweet',
  'not_fresh',
  'undercooked',
  'overcooked',
  'served_cold',
  'small_portion',
  'poor_packaging',
  'different_from_photo',
] as const;

export type ReviewFeedbackTag = (typeof REVIEW_FEEDBACK_TAG_VALUES)[number];

export interface IReview extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId | null;
  rating: number;
  feedbackTags: ReviewFeedbackTag[];
  comment?: string | null;
  images: mongoose.Types.ObjectId[];
  reply?: string | null;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}
