export const VoucherCategory = {
  DISCOUNT: "discount",
  FREESHIP: "freeship",
  NEWUSER: "newuser",
  SPECIAL: "special",
} as const;

export type VoucherCategory =
  (typeof VoucherCategory)[keyof typeof VoucherCategory];

export const DiscountType = {
  PERCENTAGE: "percentage",
  FIXED_AMOUNT: "fixed_amount",
} as const;

export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export interface Voucher {
  _id: string;
  code: string;
  title: string;
  description: string;
  category: VoucherCategory;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  usedCount: number;
  conditions: string[];
  isActive: boolean;
  isStackable: boolean;
  createdAt: string;
  updatedAt: string;
  isReward?: boolean;
  isPersonal?: boolean;
  pointCost?: number;
  ownerId?: string | null;
  minTier?: string | null;
}

export interface VoucherListResponse {
  success: boolean;
  data: Voucher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VoucherDetailResponse {
  success: boolean;
  data: Voucher;
}

export interface ValidateVoucherRequest {
  code: string;
  orderAmount: number;
  userId?: string;
}

export interface ValidateVoucherResponse {
  success: boolean;
  data?: {
    voucher: Voucher;
    discountAmount: number;
    finalAmount: number;
  };
  message?: string;
}

export interface CreateVoucherRequest {
  code: string;
  title: string;
  description: string;
  category: VoucherCategory;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  startAt: string;
  endAt: string;
  usageLimit: number;
  conditions: string[];
  isActive?: boolean;
  isStackable?: boolean;
}
