import mongoose from 'mongoose';

export const PRODUCT_BEHAVIOR_EVENT_TYPES = ['product_view', 'recommendation_click'] as const;
export const PRODUCT_BEHAVIOR_EVENT_SOURCES = [
  'product_detail',
  'recommendation_section',
  'menu',
  'campaign',
  'unknown',
] as const;

export type ProductBehaviorEventType = (typeof PRODUCT_BEHAVIOR_EVENT_TYPES)[number];
export type ProductBehaviorEventSource = (typeof PRODUCT_BEHAVIOR_EVENT_SOURCES)[number];

export interface IProductBehaviorEvent extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId | null;
  eventType: ProductBehaviorEventType;
  source: ProductBehaviorEventSource;
  day: Date;
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductBehaviorEventSchema = new mongoose.Schema<IProductBehaviorEvent>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
    eventType: { type: String, enum: PRODUCT_BEHAVIOR_EVENT_TYPES, required: true },
    source: { type: String, enum: PRODUCT_BEHAVIOR_EVENT_SOURCES, default: 'unknown', required: true },
    day: { type: Date, required: true },
    count: { type: Number, default: 0, min: 0 },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
  },
  { timestamps: true }
);

ProductBehaviorEventSchema.index(
  { userId: 1, productId: 1, eventType: 1, source: 1, storeId: 1, day: 1 },
  { unique: true }
);
ProductBehaviorEventSchema.index({ userId: 1, eventType: 1, lastSeenAt: -1 });
ProductBehaviorEventSchema.index({ productId: 1, eventType: 1, lastSeenAt: -1 });

const ProductBehaviorEventModel = mongoose.model<IProductBehaviorEvent>(
  'ProductBehaviorEvent',
  ProductBehaviorEventSchema,
  'product_behavior_events'
);

export default ProductBehaviorEventModel;
