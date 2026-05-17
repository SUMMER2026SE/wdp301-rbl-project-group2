import { IVerificationCode } from '@/types';
import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema<IVerificationCode>({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'User',
  },
  type: { type: String, required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  created_at: { type: Date, required: true, default: Date.now },
  expires_at: { type: Date, required: true },
});

const VerificationCodeModel = mongoose.model<IVerificationCode>(
  'VerificationCode',
  verificationSchema,
  'verification_codes'
);

export default VerificationCodeModel;
