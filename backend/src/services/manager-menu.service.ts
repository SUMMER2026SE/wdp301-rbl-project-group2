import mongoose from 'mongoose';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import ProductModel from '@/models/product.model';
import { ProductStatus } from '@/types/product.type';

export const getManagerMenu = async (
  storeId: mongoose.Types.ObjectId,
  query: { category?: string; status?: string } = {}
) => {
  const filter: Record<string, any> = { storeId: storeId };

  if (query.category) {
    filter.category = query.category;
  }
  if (query.status) {
    filter.status = query.status;
  }

  const products = await ProductModel.find(filter).sort({ category: 1, name: 1 }).populate('variationIds');

  return products;
};

export const getManagerProductById = async (storeId: mongoose.Types.ObjectId, productId: string) => {
  const product = await ProductModel.findById(productId)
    .populate({
      path: 'recipe.ingredientId',
      select: 'name unit',
    })
    .populate('variationIds');

  appAssert(product, NOT_FOUND, 'Không tìm thấy sản phẩm');
  appAssert(product.storeId.toString() === storeId.toString(), NOT_FOUND, 'Sản phẩm không thuộc chi nhánh của manager');

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

  // Use findOneAndUpdate to bypass full document validation (avoids legacy category name errors)
  const product = await ProductModel.findOneAndUpdate(
    { _id: productId, storeId: storeId },
    { $set: updateFields },
    { new: true }
  );

  appAssert(product, NOT_FOUND, 'Không tìm thấy sản phẩm hoặc sản phẩm không thuộc chi nhánh của manager');

  return product;
};
