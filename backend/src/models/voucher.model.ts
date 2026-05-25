import { IVoucher } from '@/types';
import { DiscountType } from '@/types/voucher.type';
import mongoose from 'mongoose';

const VoucherSchema = new mongoose.Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, required: true, enum: DiscountType },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    minOrderValue: { type: Number, required: true, default: 0, min: 0 },
    usageLimit: { type: Number, required: true, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
VoucherSchema.index({ code: 1 }, { unique: true });
VoucherSchema.index({ isActive: 1 });
VoucherSchema.index({ startAt: 1, endAt: 1 });

VoucherSchema.virtual('is_valid').get(function () {
  const now = new Date();
  return this.isActive &&
    this.startAt <= now &&
    this.endAt >= now &&
    (this.usageLimit === null || this.usedCount < this.usageLimit);
});

const VoucherModel = mongoose.model<IVoucher>('Voucher', VoucherSchema, 'vouchers');

export default VoucherModel;
