import mongoose from 'mongoose';
import { UserTier } from './user.type';

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

  category: VoucherCategory;
  discountType: DiscountType;
  discountValue: number;

  maxDiscount?: number | null;
  minOrderValue: number;

  usageLimit?: number | null;
  usedCount: number;

  isActive: boolean;
  isReward?: boolean;
  isPersonal?: boolean;
  pointCost?: number;

  minTier?: UserTier | null;

  startAt: Date;
  endAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface ValidateVoucherOptions {
  userId?: string | mongoose.Types.ObjectId | null;
  userTier?: UserTier | string | null;
  shippingFee?: number;
  deliveryFee?: number;
}

export interface ValidateVoucherResult {
  voucher: IVoucher;
  discountAmount: number;
  finalAmount: number;
}
