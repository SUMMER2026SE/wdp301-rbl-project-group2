import mongoose from 'mongoose';

export interface IIngredient extends mongoose.Document<mongoose.Types.ObjectId> {
  name: string;
  allergenTags: string[];
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
