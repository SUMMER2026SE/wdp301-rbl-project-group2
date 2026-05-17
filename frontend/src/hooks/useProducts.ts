import { useState, useEffect, useCallback } from "react";
import productService from "@/services/product.service";
import type {
  Product,
  ProductFilters,
  ProductListResponse,
} from "@/types/product";

interface UseProductsOptions {
  initialFilters?: ProductFilters;
  autoFetch?: boolean;
}

interface UseProductsReturn {
  products: Product[];
  pagination: ProductListResponse["pagination"] | null;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleAvailability: (product: Product) => Promise<void>;
}

/**
 * Hook quản lý toàn bộ trạng thái danh sách sản phẩm.
 * Tách biệt data-fetching logic ra khỏi UI component → dễ test & tái sử dụng.
 */
export const useProducts = (
  filters: ProductFilters = {},
  options: UseProductsOptions = {},
): UseProductsReturn => {
  const { autoFetch = true } = options;
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<
    ProductListResponse["pagination"] | null
  >(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getProducts(filters);
      setProducts(response.data || []);
      setPagination(response.pagination);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Lỗi khi tải danh sách sản phẩm";
      setError(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    if (autoFetch) {
      fetchProducts();
    }
  }, [fetchProducts, autoFetch]);

  /**
   * Xoá sản phẩm — không show window.confirm ở đây, để UI quyết định UX.
   * Hook chỉ xử lý business logic.
   */
  const deleteProduct = useCallback(async (id: string) => {
    await productService.deleteProduct(id);
    // Optimistic update: xoá khỏi state ngay lập tức, không cần re-fetch
    setProducts((prev) => prev.filter((p) => p._id !== id));
  }, []);

  /**
   * Toggle trạng thái isAvailable của sản phẩm.
   * Optimistic update: cập nhật local state trước, rollback nếu API lỗi.
   */
  const toggleAvailability = useCallback(async (product: Product) => {
    const newAvailability = !product.isAvailable;

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) =>
        p._id === product._id ? { ...p, isAvailable: newAvailability } : p,
      ),
    );

    try {
      await productService.updateProduct(product._id, {
        isAvailable: newAvailability,
      });
    } catch (err) {
      // Rollback nếu API thất bại
      setProducts((prev) =>
        prev.map((p) =>
          p._id === product._id
            ? { ...p, isAvailable: product.isAvailable }
            : p,
        ),
      );
      throw err;
    }
  }, []);

  return {
    products,
    pagination,
    loading,
    error,
    fetchProducts,
    deleteProduct,
    toggleAvailability,
  };
};
