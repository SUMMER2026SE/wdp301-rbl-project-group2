import mongoose from 'mongoose';
import IUser from './user.type';

export enum VerificationCodeType {
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  STAFF_INVITE = 'STAFF_INVITE',
}

export default interface IVerificationCode extends mongoose.Document {
  user_id: IUser['_id'];
  type: VerificationCodeType;
  email: string;
  code: string;
  created_at: Date;
  expires_at: Date;
}
