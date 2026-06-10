import { IIngredient, IProductRecipe } from '@/types/ingredient.type';
import mongoose from 'mongoose';

// --- INGREDIENTS ---
const IngredientSchema = new mongoose.Schema<IIngredient>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      set: (value: string) =>
        value
          .trim()
          .split(/\s+/)
          .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
          .join(' '),
    },
    description: { type: String, default: '', trim: true },
    allergenTags: { type: [String], default: [] },
    allergenSuggestion: {
      suggestedTags: { type: [String], default: [] },
      confidence: { type: Number, min: 0, max: 1 },
      reason: { type: String, default: '', trim: true },
      suggestedAt: { type: Date },
    },
    allergenReviewStatus: {
      type: String,
      enum: ['pending', 'reviewed', 'rejected'],
      default: 'pending',
    },
    allergenConfidence: { type: Number, min: 0, max: 1 },
    allergenSource: {
      type: String,
      enum: ['manual', 'ai', 'ai_confirmed'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
IngredientSchema.index({ name: 1 });
IngredientSchema.index({ allergenTags: 1 });

export const IngredientModel = mongoose.model<IIngredient>('Ingredient', IngredientSchema, 'ingredients');

// --- PRODUCT RECIPES ---
const ProductRecipeSchema = new mongoose.Schema<IProductRecipe>(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    ingredientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }],
    quantity: { type: Number, required: true },
    unit: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
ProductRecipeSchema.index({ productId: 1 });
ProductRecipeSchema.index({ ingredientIds: 1 });

export const ProductRecipeModel = mongoose.model<IProductRecipe>('ProductRecipe', ProductRecipeSchema, 'product_recipes');
