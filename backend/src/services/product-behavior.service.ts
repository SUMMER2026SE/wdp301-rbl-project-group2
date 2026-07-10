import mongoose from 'mongoose';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import ProductBehaviorEventModel, {
  ProductBehaviorEventSource,
  ProductBehaviorEventType,
} from '@/models/product-behavior-event.model';
import ProductModel from '@/models/product.model';
import appAssert from '@/utils/app-assert';

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const recordProductBehaviorEvent = async (params: {
  userId?: string | mongoose.Types.ObjectId;
  productId: string;
  eventType: ProductBehaviorEventType;
  source?: ProductBehaviorEventSource;
  storeId?: string | null;
}) => {
  if (!params.userId) {
    return { tracked: false, reason: 'guest_user' as const };
  }

  appAssert(mongoose.isValidObjectId(params.productId), BAD_REQUEST, 'productId không hợp lệ');
  if (params.storeId) {
    appAssert(mongoose.isValidObjectId(params.storeId), BAD_REQUEST, 'storeId không hợp lệ');
  }

  const productExists = await ProductModel.exists({ _id: params.productId });
  appAssert(productExists, NOT_FOUND, 'Không tìm thấy sản phẩm');

  const now = new Date();
  const day = startOfUtcDay(now);
  const userId = new mongoose.Types.ObjectId(params.userId.toString());
  const productId = new mongoose.Types.ObjectId(params.productId);
  const storeId = params.storeId ? new mongoose.Types.ObjectId(params.storeId) : null;

  await ProductBehaviorEventModel.findOneAndUpdate(
    {
      userId,
      productId,
      eventType: params.eventType,
      source: params.source ?? 'unknown',
      storeId,
      day,
    },
    {
      $inc: { count: 1 },
      $set: { lastSeenAt: now },
      $setOnInsert: { firstSeenAt: now },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { tracked: true as const };
};
