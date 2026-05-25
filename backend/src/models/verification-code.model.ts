import { IVerificationCode } from '@/types';
import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema<IVerificationCode>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  type: { type: String, required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
});

// Indexes
verificationSchema.index({ userId: 1 });
verificationSchema.index({ email: 1 });
// TTL index: automatically deletes document when expiresAt time is reached
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationCodeModel = mongoose.model<IVerificationCode>(
  'VerificationCode',
  verificationSchema,
  'verification_codes'
);

export default VerificationCodeModel;
