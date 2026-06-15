import mongoose from 'mongoose';

export const REVIEW_REACTION_VALUES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;

export type ReviewReactionType = (typeof REVIEW_REACTION_VALUES)[number];

export interface IReviewReaction extends mongoose.Document<mongoose.Types.ObjectId> {
  reviewId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reaction: ReviewReactionType;
  createdAt: Date;
  updatedAt: Date;
}
