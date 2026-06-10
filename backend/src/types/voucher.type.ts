import mongoose from 'mongoose';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  NONE = 'none',
}

export enum VoucherCategory {
  DISCOUNT = 'discount',
  FREESHIP = 'freeship',
  NEWUSER = 'newuser',
  SPECIAL = 'special',
}

export interface IVoucher extends mongoose.Document<mongoose.Types.ObjectId> {
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  startAt: Date;
  endAt: Date;
  
  // Reward Points Fields
  isReward?: boolean;
  pointCost?: number;
  minTier?: import('./user.type').UserTier | null;
  
  category?: VoucherCategory;
  createdAt: Date;
  updatedAt: Date;
}
