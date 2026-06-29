import mongoose from 'mongoose';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import ProductModel from '@/models/product.model';
import { ProductStatus } from '@/types/product.type';

const getScopedProductFilter = (storeId: mongoose.Types.ObjectId) => ({
  $or: [{ storeId }, { storeId: { $exists: false } }, { storeId: null }],
});

const getGlobalProductFilter = () => ({
  $or: [{ storeId: { $exists: false } }, { storeId: null }],
});

const getProductKey = (product: { category?: unknown; name?: unknown }) =>
  `${String(product.category ?? '').trim().toLowerCase()}::${String(product.name ?? '').trim().toLowerCase()}`;

const preferStoreOverrides = <T extends { storeId?: unknown; name?: string; category?: string }>(
  products: T[],
  storeId: mongoose.Types.ObjectId
) => {
  const currentStoreId = storeId.toString();
  const byKey = new Map<string, T>();

  for (const product of products) {
    const key = getProductKey(product);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, product);
      continue;
    }

    const productStoreId = (product as any).storeId?.toString();
    const existingStoreId = (existing as any).storeId?.toString();
    if (productStoreId === currentStoreId && existingStoreId !== currentStoreId) {
      byKey.set(key, product);
    }
  }

  return Array.from(byKey.values());
};

export const getManagerMenu = async (
  storeId: mongoose.Types.ObjectId,
  query: { category?: string; status?: string } = {}
) => {
  const filter: Record<string, any> = getScopedProductFilter(storeId);

  if (query.category) {
    filter.category = query.category;
  }
  if (query.status) {
    filter.status = query.status;
  }

  const products = await ProductModel.find(filter)
    .sort({ category: 1, name: 1 })
    .populate('variationIds')
    .lean();

  return preferStoreOverrides(products, storeId);
};

export const getManagerProductById = async (storeId: mongoose.Types.ObjectId, productId: string) => {
  const product = await ProductModel.findOne({
    _id: productId,
    ...getScopedProductFilter(storeId),
  })
    .populate({
      path: 'recipe.ingredientId',
      select: 'name unit',
    })
    .populate('variationIds');

  appAssert(product, NOT_FOUND, 'Không tìm thấy sản phẩm');

  return product;
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
      `Không được phép cập nhật trường core: ${key}`
    );
  }

  if ('status' in updates) {
    const status = updates.status;
    appAssert(
      [ProductStatus.ACTIVE, ProductStatus.INACTIVE, ProductStatus.OUT_OF_STOCK].includes(status),
      BAD_REQUEST,
      'Trạng thái sản phẩm không hợp lệ'
    );
  }

  const updateFields: any = {};
  if ('isAvailable' in updates) {
    updateFields.isAvailable = !!updates.isAvailable;
  }
  if ('status' in updates) {
    updateFields.status = updates.status;
  }
  if ('operationalNote' in updates) {
    updateFields.operationalNote = updates.operationalNote?.trim() || undefined;
  }

  const storeProduct = await ProductModel.findOneAndUpdate(
    { _id: productId, storeId },
    { $set: updateFields },
    { new: true }
  );

  if (storeProduct) {
    return storeProduct;
  }

  const globalProduct = await ProductModel.findOne({
    _id: productId,
    ...getGlobalProductFilter(),
  }).lean();
  appAssert(globalProduct, NOT_FOUND, 'Không tìm thấy sản phẩm');

  const baseProduct = { ...(globalProduct as any) };
  delete baseProduct._id;
  delete baseProduct.__v;
  delete baseProduct.createdAt;
  delete baseProduct.updatedAt;
  const insertResult = await ProductModel.collection.insertOne({
    ...baseProduct,
    ...updateFields,
    storeId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const product = await ProductModel.findById(insertResult.insertedId);
  appAssert(product, NOT_FOUND, 'Không tìm thấy sản phẩm');

  return product;
};
