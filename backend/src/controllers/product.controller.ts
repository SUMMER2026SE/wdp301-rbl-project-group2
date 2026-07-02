import { Request, Response } from 'express';
import { catchErrors } from '@/utils/async-handler';
import { BAD_REQUEST, CREATED, FORBIDDEN, NOT_FOUND, OK, UNAUTHORIZED } from '@/constants/http';
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getDistinctCategories,
  getProductById,
  getProductHealthRisk,
  updateProduct,
} from '@/services/product.service';
import { updateManagerProductAvailability } from '@/services/manager-menu.service';
import UserModel from '@/models/user.model';
import ProductModel from '@/models/product.model';
import appAssert from '@/utils/app-assert';
import { productValidator, updateProductValidator } from '@/validators/product.validator';
import { Role } from '@/types/user.type';
import { ProductStatus } from '@/types/product.type';
import mongoose from 'mongoose';

// GET /api/products/categories
export const getProductCategoriesHandler = catchErrors(async (_req: Request, res: Response) => {
  const categories = await getDistinctCategories();
  return res.success(OK, { data: categories });
});

// GET /api/products
export const getAllProductsHandler = catchErrors(async (req: Request, res: Response) => {
  const { category, minPrice, maxPrice, minRating, search, sort, page, limit, isAvailable, showAll, storeId } = req.query;

  const rawHealthTags = req.query.healthTags || req.query['healthTags[]'];
  let healthTagsParsed: string[] | undefined;
  if (typeof rawHealthTags === 'string') {
    healthTagsParsed = rawHealthTags.split(',').map((tag) => tag.trim()).filter(Boolean);
  } else if (Array.isArray(rawHealthTags)) {
    healthTagsParsed = rawHealthTags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  const isShowAllRequested = showAll === 'true' || (showAll as any) === true;
  const userRole = req.role as string | undefined;
  const normalizedRole = userRole?.toLowerCase();

  if (isShowAllRequested) {
    appAssert(userRole, UNAUTHORIZED, 'Token khong hop le hoac da het han');
    appAssert(
      ['admin', 'staff', 'manager'].includes(normalizedRole!),
      FORBIDDEN,
      'Ban khong co quyen thuc hien hanh dong nay'
    );
  }

  const isPrivileged = normalizedRole && ['admin', 'staff', 'manager'].includes(normalizedRole);
  const shouldShowAll = isShowAllRequested && isPrivileged;

  const user = req.userId ? await UserModel.findById(req.userId).select('preferences').lean() : null;

  const filters = {
    category: category as string,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    search: search as string,
    sort: sort as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 12,
    isAvailable: isAvailable === undefined ? undefined : isAvailable === 'true',
    storeId: typeof storeId === 'string' ? storeId : undefined,
    showAll: shouldShowAll,
    healthTags: healthTagsParsed,
  };

  const result = await getAllProducts(filters, user?.preferences);

  return res.success(OK, {
    data: result.products,
    pagination: result.pagination,
  });
});

// GET /api/products/:id
export const getProductByIdHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.userId ? await UserModel.findById(req.userId).select('preferences').lean() : null;
  const product = await getProductById(id, user?.preferences);
  return res.success(OK, { data: product });
});

// GET /api/products/:id/health-risk
export const getProductHealthRiskHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await UserModel.findById(req.userId).select('preferences').lean();
  appAssert(user, NOT_FOUND, 'User not found');
  const data = await getProductHealthRisk(id, user.preferences);
  return res.success(OK, { data });
});

// POST /api/products
export const createProductHandler = catchErrors(async (req: Request, res: Response) => {
  const data = productValidator.parse(req.body);
  const product = await createProduct(data as any, req.role?.toLowerCase() === Role.ADMIN);
  return res.success(CREATED, { data: product, message: 'Product created successfully' });
});

// PUT /api/products/:id
export const updateProductHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = updateProductValidator.parse(req.body);
  const product = await updateProduct(id, data as any, req.role?.toLowerCase() === Role.ADMIN);
  return res.success(OK, { data: product, message: 'Product updated successfully' });
});

// DELETE /api/products/:id
export const deleteProductHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;
  await deleteProduct(id, req.role?.toLowerCase() === Role.ADMIN);
  return res.success(OK, { message: 'Product deleted successfully' });
});

// PATCH /api/products/:id/availability - Staff + Admin only
export const updateProductAvailabilityHandler = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAvailable, status, operationalNote, storeId } = req.body;

  const updates: Partial<{ isAvailable: boolean; status: string; operationalNote: string }> = {};
  if (isAvailable !== undefined) updates.isAvailable = !!isAvailable;
  if (status !== undefined) updates.status = status;
  if (operationalNote !== undefined) updates.operationalNote = operationalNote;

  if (updates.status !== undefined) {
    appAssert(
      [ProductStatus.ACTIVE, ProductStatus.INACTIVE, ProductStatus.OUT_OF_STOCK].includes(updates.status as ProductStatus),
      BAD_REQUEST,
      'Trang thai san pham khong hop le'
    );
  }

  const user = req.userId ? await UserModel.findById(req.userId).select('role storeId').lean() : null;
  appAssert(user, NOT_FOUND, 'User not found');

  let product;
  const userRoleNormalized = user.role?.toLowerCase();
  const scopedStoreId =
    userRoleNormalized === Role.STAFF && user.storeId
      ? user.storeId
      : typeof storeId === 'string' && mongoose.isValidObjectId(storeId)
        ? new mongoose.Types.ObjectId(storeId)
        : undefined;

  if (scopedStoreId && (updates.status !== undefined || updates.isAvailable !== undefined)) {
    product = await updateManagerProductAvailability(scopedStoreId as any, id, updates);
  } else {
    appAssert(userRoleNormalized === Role.ADMIN, FORBIDDEN, 'Ban khong co quyen cap nhat trang thai san pham');
    appAssert(updates.status === undefined, BAD_REQUEST, 'Store id la bat buoc khi cap nhat trang thai san pham');
    const globalUpdates: Partial<{ isAvailable: boolean; operationalNote: string }> = {};
    if (updates.isAvailable !== undefined) globalUpdates.isAvailable = updates.isAvailable;
    if (updates.operationalNote !== undefined) globalUpdates.operationalNote = updates.operationalNote;
    product = await ProductModel.findOneAndUpdate(
      { _id: id },
      { $set: globalUpdates },
      { new: true }
    );
    appAssert(product, NOT_FOUND, 'Khong tim thay san pham');
  }

  return res.success(OK, { data: product, message: 'Cap nhat trang thai san pham thanh cong' });
});
