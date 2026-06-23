import { IUserVoucher, UserVoucherStatus } from '@/types';
import mongoose from 'mongoose';

const UserVoucherSchema = new mongoose.Schema<IUserVoucher>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UserVoucherStatus),
      default: UserVoucherStatus.AVAILABLE,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
UserVoucherSchema.index({ userId: 1, status: 1 });
UserVoucherSchema.index({ voucherId: 1 });
// Ensure uniqueness per user-voucher combination if a user can only claim a specific voucher once
UserVoucherSchema.index({ userId: 1, voucherId: 1 });

const UserVoucherModel = mongoose.model<IUserVoucher>('UserVoucher', UserVoucherSchema, 'user_vouchers');

export default UserVoucherModel;
