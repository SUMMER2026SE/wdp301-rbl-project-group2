import { IReviewReaction, REVIEW_REACTION_VALUES } from '@/types/review-reaction.type';
import mongoose from 'mongoose';

const ReviewReactionSchema = new mongoose.Schema<IReviewReaction>(
  {
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reaction: { type: String, enum: REVIEW_REACTION_VALUES, required: true },
  },
  { timestamps: true }
);

ReviewReactionSchema.index({ reviewId: 1 });
ReviewReactionSchema.index({ reviewId: 1, userId: 1 }, { unique: true });

const ReviewReactionModel = mongoose.model<IReviewReaction>(
  'ReviewReaction',
  ReviewReactionSchema,
  'review_reactions'
);

export default ReviewReactionModel;
