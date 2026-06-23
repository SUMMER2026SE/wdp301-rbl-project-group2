import mongoose from 'mongoose';
import { DiscountType } from './voucher.type';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',

  DELIVERED = 'delivered',

  // Compatibility values (also camelCase)
  PROCESSING = 'processing',
  READY_FOR_DELIVERY = 'ready_for_delivery',
  SHIPPING = 'shipping',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  MOMO = 'momo',
  VNPAY = 'vnpay',
  STRIPE = 'stripe',

  // Compatibility values (camelCase)
  CASH_ON_DELIVERY = 'cash',
  CREDIT_CARD = 'stripe',
  PAYPAY = 'vnpay',
}

export interface IOrderItemVariation {
  name: string;
  choice: string;
  extraPrice?: number;
}

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  subTotal: number;
  quantity: number;
  variations: IOrderItemVariation[];
}

export interface IDeliveryAddress {
  receiverName: string;
  phone: string;
  detail: string;
  ward: string;
  district?: string;
  city: string;
}

export interface IDeliveryInfo {
  provider?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  providerId?: mongoose.Types.ObjectId | null;
  driverId?: mongoose.Types.ObjectId | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  changedBy: mongoose.Types.ObjectId;
  actorRole?: 'manager' | 'staff' | 'admin' | 'customer' | 'system';
  action?: string;
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  reason?: string;
  note?: string;
  createdAt: Date;
}

export interface IOrder extends mongoose.Document<mongoose.Types.ObjectId> {
  storeId: mongoose.Types.ObjectId;
  code: string;
  staffId?: mongoose.Types.ObjectId | null;
  cusId: mongoose.Types.ObjectId;
  status: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  items: IOrderItem[];

  voucherId?: mongoose.Types.ObjectId | null;
  voucherCode?: string | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  discountAmount: number;

  shippingFee: number;
  subTotal: number;
  totalPrice: number;

  paymentMethod: PaymentMethod;
  paid: boolean;
  paidAt?: Date | null;

  deliveryAddress: IDeliveryAddress;
  deliveryInfo: IDeliveryInfo;

  // camelCase fields
  note?: string;
  staffNoteItems?: string[];
  payment?: {
    method: PaymentMethod;
    paidAt: Date | null;
    payosOrderCode?: number | null;
    cashCollectedAt?: Date | null;
    cashCollectedBy?: mongoose.Types.ObjectId | null;
  };
  cancellation?: {
    reason: string;
    cancelledBy: 'staff' | 'customer';
    refundRequired: boolean;
    refundedAt: Date | null;
  } | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItemDoc extends mongoose.Document<mongoose.Types.ObjectId> {
  orderId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  name: string;
  image?: string | null;
  price: number;
  subTotal: number;
  quantity: number;
  createdAt: Date;
}

export interface IOrderItemVariationDoc extends mongoose.Document<mongoose.Types.ObjectId> {
  orderItemId: mongoose.Types.ObjectId;
  variation_optionIds: mongoose.Types.ObjectId[];
  name: string;
  choice: string;
  extraPrice: number;
}
