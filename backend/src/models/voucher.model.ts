import mongoose from 'mongoose';
import { IVoucher } from '@/types/voucher.type';
import { DiscountType, VoucherCategory } from '@/types/voucher.type';
import { UserTier } from '@/types/user.type';

const VoucherSchema = new mongoose.Schema<IVoucher>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: Object.values(VoucherCategory),
      default: VoucherCategory.DISCOUNT,
    },

    discountType: {
      type: String,
      required: true,
      enum: Object.values(DiscountType),
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0.01,
    },

    maxDiscount: {
      type: Number,
      default: null,
      min: 0,
    },

    minOrderValue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    /**
     * null = không giới hạn lượt dùng.
     */
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isReward: {
      type: Boolean,
      default: false,
    },

    isPersonal: {
      type: Boolean,
      default: false,
    },

    pointCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    minTier: {
      type: String,
      enum: Object.values(UserTier),
      default: null,
    },

    startAt: {
      type: Date,
      required: true,
    },

    endAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

VoucherSchema.index({ isActive: 1 });
VoucherSchema.index({ startAt: 1, endAt: 1 });

VoucherSchema.virtual('is_valid').get(function (this: IVoucher) {
  const now = new Date();

  return (
    this.isActive &&
    this.startAt <= now &&
    this.endAt >= now &&
    (this.usageLimit === null || this.usageLimit === undefined || this.usedCount < this.usageLimit)
  );
});

const VoucherModel = mongoose.model<IVoucher>('Voucher', VoucherSchema, 'vouchers');

export default VoucherModel;
