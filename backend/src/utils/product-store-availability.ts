import mongoose from 'mongoose';
import { ProductStatus, type OperationalProductStatus } from '@/types/product.type';

type StoreAvailabilityEntry = {
  storeId?: unknown;
  status?: unknown;
};

type ProductLike = {
  storeAvailability?: StoreAvailabilityEntry[];
  status?: unknown;
  isAvailable?: unknown;
};

const OPERATIONAL_PRODUCT_STATUSES: OperationalProductStatus[] = [
  ProductStatus.ACTIVE,
  ProductStatus.INACTIVE,
  ProductStatus.OUT_OF_STOCK,
];

const isOperationalProductStatus = (status: unknown): status is OperationalProductStatus =>
  typeof status === 'string' && OPERATIONAL_PRODUCT_STATUSES.includes(status as OperationalProductStatus);

export const getProductAvailabilityStatus = (
  product: ProductLike,
  storeId?: mongoose.Types.ObjectId | string
): OperationalProductStatus => {
  const storeStatus = getStoreAvailabilityStatus(product, storeId);
  if (storeStatus) return storeStatus;
  return product.isAvailable === false ? ProductStatus.INACTIVE : ProductStatus.ACTIVE;
};

export const getStoreAvailabilityStatus = (
  product: ProductLike,
  storeId?: mongoose.Types.ObjectId | string
): OperationalProductStatus | undefined => {
  if (!storeId || !Array.isArray(product.storeAvailability)) return undefined;
  const currentStoreId = storeId.toString();
  const entry = product.storeAvailability.find((item) => item.storeId?.toString() === currentStoreId);
  const status = entry?.status;
  return isOperationalProductStatus(status) ? status : undefined;
};

export const applyStoreAvailability = <T extends ProductLike>(
  product: T,
  storeId?: mongoose.Types.ObjectId | string
): T => {
  const status = getProductAvailabilityStatus(product, storeId);

  return {
    ...product,
    status,
    isAvailable: status === ProductStatus.ACTIVE,
  };
};

export const applyStoreAvailabilityToProducts = <T extends ProductLike>(
  products: T[],
  storeId?: mongoose.Types.ObjectId | string
): T[] => products.map((product) => applyStoreAvailability(product, storeId));
