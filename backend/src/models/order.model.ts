import { IOrder, IOrderItemDoc, IOrderItemVariationDoc, OrderStatus, PaymentMethod, DiscountType } from '@/types';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const OrderItemVariationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    choice: { type: String, required: true, trim: true },
    extraPrice: { type: Number, default: 0 },
  },
  {
    _id: false,
  }
);

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    subTotal: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    variations: { type: [OrderItemVariationSchema], default: [] },
  },
  {
    _id: false,
  }
);

const DeliveryAddressSchema = new mongoose.Schema(
  {
    receiverName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    detail: { type: String, required: true, trim: true },
    ward: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
  },
  {
    _id: false,
  }
);

const DeliveryInfoSchema = new mongoose.Schema(
  {
    provider: { type: String, default: null, trim: true },
    driverName: { type: String, default: null, trim: true },
    driverPhone: { type: String, default: null, trim: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  {
    _id: false,
  }
);

const CancellationSchema = new mongoose.Schema(
  {
    reason: { type: String, required: true },
    cancelledBy: { type: String, enum: ['staff', 'customer'], required: true },
    refundRequired: { type: Boolean, default: false },
    refundedAt: { type: Date, default: null },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema<IOrder>(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    code: { type: String, required: true, unique: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cusId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: OrderStatus,
      default: OrderStatus.PENDING,
    },
    items: { type: [OrderItemSchema], required: true },
    
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', default: null },
    voucherCode: { type: String, default: null },
    discountType: { type: String, enum: DiscountType, default: null },
    discountValue: { type: Number, default: null },
    discountAmount: { type: Number, default: 0 },

    shippingFee: { type: Number, default: 0 },
    subTotal: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    paymentMethod: { type: String, required: true, enum: PaymentMethod },
    paid: { type: Boolean, default: false },

    deliveryAddress: { type: DeliveryAddressSchema, required: true },
    deliveryInfo: { type: DeliveryInfoSchema, default: () => ({}) },
    
    note: { type: String },
    staffNoteItems: { type: [String], default: [] },
    payment: {
      method: { type: String, enum: PaymentMethod, required: true },
      paidAt: { type: Date, default: null },
      payosOrderCode: { type: Number, unique: true, sparse: true },
      cashCollectedAt: { type: Date, default: null },
      cashCollectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    cancellation: { type: CancellationSchema, default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes
OrderSchema.index({ code: 1 }, { unique: true });
OrderSchema.index({ storeId: 1 });
OrderSchema.index({ cusId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

// Compound Indexes
OrderSchema.index({ storeId: 1, status: 1 });

// Hooks
OrderSchema.pre('validate', function (next) {
  if (this.isNew && !this.code) {
    this.code = `ORD-${randomUUID().split('-')[0].toUpperCase()}`;
  }
  next();
});

const OrderModel = mongoose.model<IOrder>('Order', OrderSchema, 'orders');

// --- ORDER ITEMS (Separate collection mapping) ---
const OrderItemDocSchema = new mongoose.Schema<IOrderItemDoc>(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    subTotal: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

OrderItemDocSchema.index({ orderId: 1 });

export const OrderItemModel = mongoose.model<IOrderItemDoc>('OrderItem', OrderItemDocSchema, 'order_items');

// --- ORDER ITEM VARIATIONS (Separate collection mapping) ---
const OrderItemVariationDocSchema = new mongoose.Schema<IOrderItemVariationDoc>(
  {
    orderItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem', required: true },
    name: { type: String, required: true, trim: true },
    choice: { type: String, required: true, trim: true },
  },
  {
    _id: true,
  }
);

OrderItemVariationDocSchema.index({ orderItemId: 1 });

export const OrderItemVariationModel = mongoose.model<IOrderItemVariationDoc>('OrderItemVariation', OrderItemVariationDocSchema, 'order_item_variations');

export default OrderModel;
