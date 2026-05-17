import { ICancellation, IDeliveryAddress, IOrderItem, IOrderItemVariation, OrderStatus, PaymentMethod } from '@/types/order.type';
import { IOrder } from '@/types';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const OrderItemVariationSchema = new mongoose.Schema<IOrderItemVariation>(
  {
    name: { type: String, required: true },
    choice: { type: String, required: true },
    extra_price: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    _id: false,
  }
);

const OrderItemSchema = new mongoose.Schema<IOrderItem>(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    variations: [{ type: OrderItemVariationSchema, required: true }],
    sub_total: { type: Number, validators: { min: [0, 'Sub total must be a positive number'] } },
  },
  {
    _id: false,
  }
);

const DeliveryAddressSchema = new mongoose.Schema<IDeliveryAddress>(
  {
    label: { type: String },
    receiver_name: { type: String },
    phone: { type: String },
    detail: { type: String },
    district: { type: String },
    city: { type: String },
  },
  {
    _id: false,
  }
);

const DeliveryInfoSchema = new mongoose.Schema(
  {
    provider_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shipped_at: { type: Date },
    delivered_at: { type: Date },
  },
  {
    _id: false,
  }
);

const CancellationSchema = new mongoose.Schema<ICancellation>(
  {
    reason: { type: String, required: true },
    cancelled_by: { type: String, enum: ['staff', 'customer'], required: true },
    refund_required: { type: Boolean, default: false },
    refunded_at: { type: Date, default: null },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema<IOrder>(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: OrderStatus,
      default: OrderStatus.PENDING,
    },
    items: [{ type: OrderItemSchema, required: true }],
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    sub_total: { type: Number, validators: { min: [0, 'Sub total must be a positive number'] } },
    shipping_fee: { type: Number, default: 0, min: 0 },
    total_price: { type: Number, validators: { min: [0, 'Total price must be a positive number'] } },
    note: {
      type: String,
      maxlength: 500,
    },
    staff_note_items: {
      type: [String],
      default: [],
    },
    payment: {
      method: { type: String, required: true, enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY },
      paid_at: { type: Date },
      payos_order_code: { type: Number, unique: true, sparse: true },
      cash_collected_at: { type: Date, default: null },
      cash_collected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    delivery_address: { type: DeliveryAddressSchema, required: true },
    delivery_info: { type: DeliveryInfoSchema, required: true },
    cancellation: { type: CancellationSchema, default: null },
  },
  {
    timestamps: true,
  }
);

//indexes
OrderSchema.index({ user_id: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'payment.method': 1 });
OrderSchema.index({ 'delivery_info.shipped_at': 1 });
OrderSchema.index({ 'delivery_info.delivered_at': 1 });

//hooks
OrderSchema.pre('validate', function (next) {
  // Only generate code once — on creation
  if (this.isNew && !this.code) {
    this.code = `ORD-${randomUUID().split('-')[0].toUpperCase()}`;
  }
  next();
});

const OrderModel = mongoose.model<IOrder>('Order', OrderSchema, 'orders');

export default OrderModel;
