import mongoose from 'mongoose';

export interface IIngredient extends mongoose.Document<mongoose.Types.ObjectId> {
  name: string;
  description?: string;
  allergenTags: string[];
  allergenSuggestion?: {
    suggestedTags: string[];
    confidence: number;
    reason: string;
    suggestedAt: Date;
  };
  allergenReviewStatus?: 'pending' | 'reviewed' | 'rejected';
  allergenConfidence?: number;
  allergenSource?: 'manual' | 'ai' | 'ai_confirmed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductRecipe extends mongoose.Document<mongoose.Types.ObjectId> {
  productId: mongoose.Types.ObjectId;
  ingredientId: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  createdAt: Date;
}

export interface IUserAllergy extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  ingredientId: mongoose.Types.ObjectId;
  name?: string;
  tag?: string;
  createdAt: Date;
}
