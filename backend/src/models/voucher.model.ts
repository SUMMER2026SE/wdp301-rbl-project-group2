import { IVoucher } from '@/types';
import { DiscountType, VoucherCategory } from '@/types/voucher.type';
import mongoose from 'mongoose';

const VoucherSchema = new mongoose.Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: VoucherCategory, default: VoucherCategory.DISCOUNT },
    discountType: { type: String, required: true, enum: DiscountType },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    minOrderValue: { type: Number, required: true, default: 0, min: 0 },
    usageLimit: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isReward: { type: Boolean, default: false },
    pointCost: { type: Number, default: 0, min: 0 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
VoucherSchema.index({ isActive: 1 });
VoucherSchema.index({ startAt: 1, endAt: 1 });

VoucherSchema.virtual('is_valid').get(function (this: IVoucher) {
  const now = new Date();
  return this.isActive &&
    this.startAt <= now &&
    this.endAt >= now &&
    (this.usageLimit === null || this.usedCount < this.usageLimit);
});

const VoucherModel = mongoose.model<IVoucher>('Voucher', VoucherSchema, 'vouchers');

export default VoucherModel;
