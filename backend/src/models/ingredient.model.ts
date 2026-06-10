import { IIngredient, IProductRecipe } from '@/types/ingredient.type';
import mongoose from 'mongoose';

// --- INGREDIENTS ---
const IngredientSchema = new mongoose.Schema<IIngredient>(
  {
    name: { type: String, required: true, trim: true },
    allergenTags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

// Indexes
IngredientSchema.index({ name: 1 });

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
