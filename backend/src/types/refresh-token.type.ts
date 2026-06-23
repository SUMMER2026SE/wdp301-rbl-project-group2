import mongoose from 'mongoose';

export interface IRefreshToken extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  deviceId?: string;
  userAgent?: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}
