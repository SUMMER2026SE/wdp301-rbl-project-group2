import { useState, useEffect } from "react";
import productService from "@/services/product.service";
import type { Product } from "@/types/product";

interface UseProductByIdReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook fetch chi tiết một sản phẩm theo ID.
 * Tự động fetch khi id thay đổi.
 */
export const useProductById = (
  id: string | undefined,
): UseProductByIdReturn => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("ID sản phẩm không hợp lệ");
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productService.getProductById(id);
        if (!cancelled) {
          setProduct(response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message =
            err?.response?.data?.message || "Không thể tải thông tin sản phẩm";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    // Cleanup: tránh setState sau khi component unmount
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { product, loading, error };
};
