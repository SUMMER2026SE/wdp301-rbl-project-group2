import { IUserAllergy } from '@/types/ingredient.type';
import mongoose from 'mongoose';

const UserAllergySchema = new mongoose.Schema<IUserAllergy>(
  {
     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
     ingredientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
UserAllergySchema.index({ userId: 1 }, { unique: true });
UserAllergySchema.index({ ingredientIds: 1 });

const UserAllergyModel = mongoose.model<IUserAllergy>('UserAllergy', UserAllergySchema, 'user_allergies');

export default UserAllergyModel;
