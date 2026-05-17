import IRefreshToken from '@/types/refresh_token.type';
import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema<IRefreshToken>({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  token_hash: { type: String, required: true },
  device_id: { type: String, required: true },
  user_agent: { type: String },
  expires_at: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

//indexes

const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema, 'refresh_tokens');

export default RefreshTokenModel;