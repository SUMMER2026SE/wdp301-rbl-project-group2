import { Request, Response } from 'express';
import { catchErrors } from '@/utils/async-handler';
import { CREATED, OK } from '@/constants/http';
import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getDistinctCategories,
    getProductById,
    updateProduct
} from '@/services/product.service';
import { productValidator, updateProductValidator } from '@/validators/product.validator';

// GET /api/products/categories
export const getProductCategoriesHandler = catchErrors(async (req: Request, res: Response) => {
    const categories = await getDistinctCategories();
    return res.success(OK, { data: categories });
});

// GET /api/products
export const getAllProductsHandler = catchErrors(async (req: Request, res: Response) => {
    const { category, minPrice, maxPrice, minRating, search, sort, page, limit, isAvailable, storeId } = req.query;

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
        storeId: storeId as string,
    };

    const result = await getAllProducts(filters);

    return res.success(OK, {
        data: result.products,
        pagination: result.pagination,
    });
});

// GET /api/products/:id
export const getProductByIdHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await getProductById(id);
    return res.success(OK, { data: product });
});

// POST /api/products
export const createProductHandler = catchErrors(async (req: Request, res: Response) => {
    const data = productValidator.parse(req.body);
    const product = await createProduct(data as any);
    return res.success(CREATED, { data: product, message: 'Product created successfully' });
});

// PUT /api/products/:id
export const updateProductHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = updateProductValidator.parse(req.body);
    const product = await updateProduct(id, data as any);
    return res.success(OK, { data: product, message: 'Product updated successfully' });
});

// DELETE /api/products/:id
export const deleteProductHandler = catchErrors(async (req: Request, res: Response) => {
    const { id } = req.params;
    await deleteProduct(id);
    return res.success(OK, { message: 'Product deleted successfully' });
});

