import mongoose from 'mongoose';

export enum VerificationCodeType {
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  STAFF_INVITE = 'STAFF_INVITE',
}

export interface IVerificationCode extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  type: string;
  email: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
}
