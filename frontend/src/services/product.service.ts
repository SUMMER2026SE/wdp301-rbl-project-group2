import { apiClient } from "@/lib/api-client";
import type {
  Product,
  ProductListResponse,
  ProductFilters,
} from "@/types/product";

import { useStoreStore } from "@/store/storeStore";

class ProductAPI {
  async getProducts(
    filters: ProductFilters = {},
  ): Promise<ProductListResponse> {
    const { selectedStore } = useStoreStore.getState();
    const params = { ...filters };
    if (selectedStore && !params.storeId) {
      params.storeId = selectedStore._id;
    }
    const response = await apiClient.get("/products", { params });
    return response.data;
  }

  async getCategories(): Promise<{ success: boolean; data: string[] }> {
    const response = await apiClient.get("/products/categories");
    return response.data;
  }

  async getProductById(
    id: string,
  ): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  }

  async getProductHealthRisk(
    id: string,
  ): Promise<{
    success: boolean;
    data: {
      level: "safe" | "warning" | "danger";
      matchedAllergens: string[];
      matchedIngredients: string[];
      message: string;
    };
  }> {
    const response = await apiClient.get(`/products/${id}/health-risk`);
    return response.data;
  }

  async createProduct(
    data: Partial<Product>,
  ): Promise<{ success: boolean; data: Product; message: string }> {
    const response = await apiClient.post("/products", data);
    return response.data;
  }

  async updateProduct(
    id: string,
    data: Partial<Product>,
  ): Promise<{ success: boolean; data: Product; message: string }> {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  }

  async updateProductAvailability(
    id: string,
    data: { isAvailable?: boolean; status?: string; operationalNote?: string },
  ): Promise<{ success: boolean; data: Product; message: string }> {
    const response = await apiClient.patch(`/products/${id}/availability`, data);
    return response.data;
  }

  async deleteProduct(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  }

  /**
   * Upload ảnh lên server → Cloudinary → lưu metadata vào MongoDB.
   * Trả về { _id: string (MongoDB ObjectId), secureUrl: string }
   * để có thể gán image field cho Product.
   */
  async uploadImage(file: File): Promise<{ _id: string; secureUrl: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    // BE trả về { success, data: { _id, secureUrl, ... } }
    return response.data.data;
  }

  async getManagerMenu(params?: {
    category?: string;
    status?: string;
  }): Promise<{ success: boolean; data: Product[] }> {
    const response = await apiClient.get("/manager/menu", { params });
    return response.data;
  }

  async getManagerProductById(
    id: string,
  ): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.get(`/manager/menu/${id}`);
    return response.data;
  }

  async updateManagerProductAvailability(
    id: string,
    data: { isAvailable?: boolean; status?: string; operationalNote?: string },
  ): Promise<{ success: boolean; data: Product }> {
    const response = await apiClient.patch(
      `/manager/menu/${id}/availability`,
      data,
    );
    return response.data;
  }
}

export default new ProductAPI();
