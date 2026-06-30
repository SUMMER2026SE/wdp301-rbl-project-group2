import mongoose from 'mongoose';
import { ProductStatus } from '@/types/product.type';

type StoreAvailabilityEntry = {
  storeId?: unknown;
  status?: unknown;
};

type ProductLike = {
  storeAvailability?: StoreAvailabilityEntry[];
  status?: unknown;
  isAvailable?: unknown;
};

export const getStoreAvailabilityStatus = (
  product: ProductLike,
  storeId?: mongoose.Types.ObjectId | string
): ProductStatus | undefined => {
  if (!storeId || !Array.isArray(product.storeAvailability)) return undefined;
  const currentStoreId = storeId.toString();
  const entry = product.storeAvailability.find((item) => item.storeId?.toString() === currentStoreId);
  const status = entry?.status;
  return typeof status === 'string' &&
    [ProductStatus.ACTIVE, ProductStatus.INACTIVE, ProductStatus.OUT_OF_STOCK].includes(status as ProductStatus)
    ? (status as ProductStatus)
    : undefined;
};

export const applyStoreAvailability = <T extends ProductLike>(
  product: T,
  storeId?: mongoose.Types.ObjectId | string
): T => {
  const storeStatus = getStoreAvailabilityStatus(product, storeId);
  if (!storeStatus) return product;

  return {
    ...product,
    status: storeStatus,
    isAvailable: storeStatus === ProductStatus.ACTIVE,
  };
};

export const applyStoreAvailabilityToProducts = <T extends ProductLike>(
  products: T[],
  storeId?: mongoose.Types.ObjectId | string
): T[] => products.map((product) => applyStoreAvailability(product, storeId));
