import mongoose from 'mongoose';

export enum UserVoucherStatus {
  AVAILABLE = 'available',
  USED = 'used',
  EXPIRED = 'expired',
}

export interface IUserVoucher extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  voucherId: mongoose.Types.ObjectId;
  status: UserVoucherStatus;
  claimedAt: Date;
  usedAt?: Date | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
