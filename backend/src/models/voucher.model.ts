import { IVoucher } from '@/types';
import { DiscountType, VoucherCategory } from '@/types/voucher.type';
import mongoose from 'mongoose';

const VoucherSchema = new mongoose.Schema<IVoucher>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true, enum: VoucherCategory, default: VoucherCategory.DISCOUNT },

    discount_type: { type: String, required: true, enum: DiscountType, default: DiscountType.NONE },
    discount_value: { type: Number, required: true, min: 0 },
    max_discount_amount: { type: Number, default: null, min: 0 },
    min_order_amount: { type: Number, required: true, default: 0, min: 0 },

    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },

    usage_limit_per_user: { type: Number, required: true, default: 1, min: 1 },
    total_usage_limit: { type: Number, default: null, min: 1 },
    current_usage_count: { type: Number, default: 0, min: 0 },

    conditions: { type: [String], default: [] },

    is_active: { type: Boolean, default: true },
    is_stackable: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

VoucherSchema.index({ category: 1 });
VoucherSchema.index({ is_active: 1 });
VoucherSchema.index({ start_date: 1, end_date: 1 });
VoucherSchema.index({ end_date: 1 });

VoucherSchema.virtual('is_valid').get(function () {
  const now = new Date();
  return this.is_active &&
    this.start_date <= now &&
    this.end_date >= now &&
    (this.total_usage_limit === null || this.current_usage_count < this.total_usage_limit);
});

const VoucherModel = mongoose.model<IVoucher>('Voucher', VoucherSchema, 'vouchers');

export default VoucherModel;
