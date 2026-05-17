import mongoose from 'mongoose';
import { IUser } from '.';

export default interface IRefreshToken extends mongoose.Document<mongoose.Types.ObjectId> {
  user_id: IUser['_id'];
  token_hash: string;
  device_id: string;
  user_agent: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}
