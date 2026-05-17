import mongoose from 'mongoose';

export enum DiscountType {
  NONE = 'none',
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum VoucherCategory {
  DISCOUNT = 'discount',
  FREESHIP = 'freeship',
  NEWUSER = 'newuser',
  SPECIAL = 'special',
}

export default interface IVoucher extends mongoose.Document<mongoose.Types.ObjectId> {
  // Basic Info
  code: string;
  title: string;
  description: string;
  category: VoucherCategory;

  // Discount Details
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;

  // Validity Period
  start_date: Date;
  end_date: Date;

  // Usage Limits
  usage_limit_per_user: number; // Số lần tối đa 1 user có thể dùng
  total_usage_limit: number | null; // Tổng số lần sử dụng toàn hệ thống (null = không giới hạn)
  current_usage_count: number; // Số lần đã được sử dụng

  conditions: string[]; 

  // Status
  is_active: boolean; // Voucher có đang hoạt động không
  is_stackable: boolean; // Có thể dùng chung với voucher khác không
}
