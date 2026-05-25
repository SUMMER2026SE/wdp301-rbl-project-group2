import { IRefreshToken } from '@/types';
import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema<IRefreshToken>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  tokenHash: { type: String, required: true },
  deviceId: { type: String },
  userAgent: { type: String },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Indexes
RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ tokenHash: 1 });

const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema, 'refresh_tokens');

export default RefreshTokenModel;