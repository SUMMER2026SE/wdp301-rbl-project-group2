import { Request, Response } from 'express';
import { catchErrors } from '@/utils/async-handler';
import { CREATED, OK, NOT_FOUND, UNAUTHORIZED, FORBIDDEN } from '@/constants/http';
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getDistinctCategories,
    getProductById,
    getProductHealthRisk,
    updateProduct,
    DEFAULT_PUBLIC_STORE_ID
} from '@/services/product.service';
import UserModel from '@/models/user.model';
import appAssert from '@/utils/app-assert';
import { productValidator, updateProductValidator } from '@/validators/product.validator';
import ProductModel from '@/models/product.model';
import { Role } from '@/types/user.type';

// GET /api/products/categories
export const getProductCategoriesHandler = catchErrors(async (req: Request, res: Response) => {
    const categories = await getDistinctCategories();
    return res.success(OK, { data: categories });
});

// GET /api/products
export const getAllProductsHandler = catchErrors(async (req: Request, res: Response) => {
    const { category, minPrice, maxPrice, minRating, search, sort, page, limit, isAvailable, storeId, showAll } = req.query;

    const isShowAllRequested = showAll === 'true' || (showAll as any) === true;

    // Only staff/admin/manager can bypass the default availability filter
    const userRole = req.role as string | undefined;
    const normalizedRole = userRole?.toLowerCase();

    if (isShowAllRequested) {
        appAssert(userRole, UNAUTHORIZED, 'Token không hợp lệ hoặc đã hết hạn');
        appAssert(
            ['admin', 'staff', 'manager'].includes(normalizedRole!),
            FORBIDDEN,
            'Bạn không có quyền thực hiện hành động này'
        );
    }

    const isPrivileged = normalizedRole && ['admin', 'staff', 'manager'].includes(normalizedRole);
    const shouldShowAll = isShowAllRequested && isPrivileged;

    const user = req.userId ? await UserModel.findById(req.userId).select('preferences storeId').lean() : null;

    // Default storeId for staff or manager to their own branch if not explicitly provided in query
    let finalStoreId = storeId as string | undefined;
    if (normalizedRole === 'admin') {
        // Admin always views the canonical/default store menu to avoid duplicate items in the list
        finalStoreId = DEFAULT_PUBLIC_STORE_ID;
    } else if (!finalStoreId && user && ['staff', 'manager'].includes(normalizedRole) && (user as any).storeId) {
        finalStoreId = (user as any).storeId.toString();
    }

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
        storeId: finalStoreId,
        showAll: shouldShowAll,
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

// PATCH /api/products/:id/availability — Staff + Admin only
export const updateProductAvailabilityHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isAvailable, status, operationalNote } = req.body;

    // Only allow these three fields — staff cannot change price, name, image, etc.
    const updates: Partial<{ isAvailable: boolean; status: string; operationalNote: string }> = {};
    if (isAvailable !== undefined) updates.isAvailable = !!isAvailable;
    if (status !== undefined) updates.status = status;
    if (operationalNote !== undefined) updates.operationalNote = operationalNote;

    const user = req.userId ? await UserModel.findById(req.userId).select('role storeId').lean() : null;
    appAssert(user, NOT_FOUND, 'User not found');

    let product;
    const userRoleNormalized = user.role?.toLowerCase();
    if (userRoleNormalized === Role.STAFF && user.storeId) {
        // Staff is restricted to their own store's products
        product = await ProductModel.findOneAndUpdate(
            { _id: id, storeId: user.storeId },
            { $set: updates },
            { new: true }
        );
        appAssert(product, NOT_FOUND, 'Không tìm thấy sản phẩm hoặc sản phẩm không thuộc chi nhánh của bạn');
    } else {
        // Admin (or staff with no storeId) can update any product
        product = await updateProduct(id, updates as any, userRoleNormalized === Role.ADMIN);
    }

    return res.success(OK, { data: product, message: 'Cập nhật trạng thái sản phẩm thành công' });
});
