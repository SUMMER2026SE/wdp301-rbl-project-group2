import { IUserAllergy } from '@/types/ingredient.type';
import mongoose from 'mongoose';

const UserAllergySchema = new mongoose.Schema<IUserAllergy>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    name: { type: String, trim: true },
    tag: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
UserAllergySchema.index({ userId: 1, ingredientId: 1 }, { unique: true });
UserAllergySchema.index({ ingredientId: 1 });

const UserAllergyModel = mongoose.model<IUserAllergy>('UserAllergy', UserAllergySchema, 'user_allergies');

export default UserAllergyModel;
