import mongoose from 'mongoose';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import ProductModel from '@/models/product.model';
import { ProductStatus } from '@/types/product.type';
import { applyStoreAvailability, applyStoreAvailabilityToProducts } from '@/utils/product-store-availability';

const assertOperationalStatus = (status: unknown) => {
  appAssert(
    [ProductStatus.ACTIVE, ProductStatus.INACTIVE, ProductStatus.OUT_OF_STOCK].includes(status as ProductStatus),
    BAD_REQUEST,
    'Trang thai san pham khong hop le'
  );
};

export const getManagerMenu = async (
  storeId: mongoose.Types.ObjectId,
  query: { category?: string; status?: string } = {}
) => {
  const filter: Record<string, any> = { status: { $ne: ProductStatus.DELETED } };

  if (query.category) {
    filter.category = query.category;
  }
  if (query.status) {
    assertOperationalStatus(query.status);
  }

  const products = await ProductModel.find(filter).sort({ category: 1, name: 1 }).populate('variationIds').lean();
  const scopedProducts = applyStoreAvailabilityToProducts(products, storeId);

  return query.status ? scopedProducts.filter((product) => product.status === query.status) : scopedProducts;
};

export const getManagerProductById = async (storeId: mongoose.Types.ObjectId, productId: string) => {
  const product = await ProductModel.findById(productId)
    .populate({
      path: 'recipe.ingredientId',
      select: 'name unit',
    })
    .populate('variationIds');

  appAssert(product, NOT_FOUND, 'Khong tim thay san pham');

  return applyStoreAvailability(product.toObject(), storeId);
};

export const updateManagerProductAvailability = async (
  storeId: mongoose.Types.ObjectId,
  productId: string,
  updates: Record<string, any>
) => {
  for (const key of Object.keys(updates)) {
    appAssert(
      ['isAvailable', 'status', 'operationalNote'].includes(key),
      BAD_REQUEST,
      `Khong duoc phep cap nhat truong core: ${key}`
    );
  }

  if ('status' in updates) {
    assertOperationalStatus(updates.status);
  }

  const requestedStatus =
    'status' in updates
      ? updates.status
      : 'isAvailable' in updates
        ? updates.isAvailable
          ? ProductStatus.ACTIVE
          : ProductStatus.INACTIVE
        : undefined;

  appAssert(requestedStatus, BAD_REQUEST, 'Trang thai san pham la bat buoc');

  const product = await ProductModel.findById(productId).lean();
  appAssert(product, NOT_FOUND, 'Khong tim thay san pham');

  const existingEntry = product.storeAvailability?.some((item: any) => item.storeId?.toString() === storeId.toString());

  if (existingEntry) {
    await ProductModel.updateOne(
      { _id: product._id, 'storeAvailability.storeId': storeId },
      { $set: { 'storeAvailability.$.status': requestedStatus } }
    );
  } else {
    await ProductModel.updateOne(
      { _id: product._id, 'storeAvailability.storeId': { $ne: storeId } },
      { $push: { storeAvailability: { storeId, status: requestedStatus } } }
    );
  }

  const updatedProduct = await ProductModel.findById(product._id).populate('variationIds').lean();
  appAssert(updatedProduct, NOT_FOUND, 'Khong tim thay san pham');

  return applyStoreAvailability(updatedProduct, storeId);
};
