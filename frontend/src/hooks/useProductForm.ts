import { useState, useCallback, useEffect } from "react";
import productService from "@/services/product.service";
import type { Product } from "@/types/product";
import { CATEGORIES, HEALTH_TAG_OPTIONS } from "@/constants/product.constants";

// Re-export để các consumer cũ không bị break
export { CATEGORIES, HEALTH_TAG_OPTIONS };

// ---- Types ----

export interface RecipeItem {
  name: string;
  quantity: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  restaurant: string;
  time: string;
  health_warning: string;
  health_tags: string[];
  tags: string[];
  recipe: RecipeItem[];
}

const DEFAULT_FORM: ProductFormData = {
  name: "",
  description: "",
  price: "",
  category: CATEGORIES[0],
  restaurant: "FoodieDash Central",
  time: "20-30 min",
  health_warning: "",
  health_tags: [],
  tags: [],
  recipe: [],
};

/**
 * Chuyển Product (từ API) thành ProductFormData (cho form).
 * Dùng khi mode === 'edit' để pre-fill.
 */
const productToFormData = (product: Product): ProductFormData => ({
  name: product.name,
  description: product.description,
  price: String(product.price),
  category: product.category,
  restaurant: product.restaurant,
  time: product.time,
  health_warning: product.health_warning ?? "",
  health_tags: product.health_tags ?? [],
  tags: product.tags ?? [],
  recipe: product.recipe ?? [],
});

// ---- Hook ----

interface UseProductFormParams {
  mode: "add" | "edit";
  product?: Product | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const useProductForm = ({
  mode,
  product,
  onSuccess,
  onClose,
}: UseProductFormParams) => {
  const [formData, setFormData] = useState<ProductFormData>(
    mode === "edit" && product ? productToFormData(product) : DEFAULT_FORM,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    mode === "edit" && product
      ? product.image && typeof product.image === "object"
        ? product.image.secure_url
        : ""
      : "",
  );

  /**
   * FIX: Reset form data khi product thay đổi.
   * Bug cũ: mở edit A → đóng → mở edit B → form vẫn giữ data của A.
   * useEffect này chạy mỗi khi mode/product thay đổi để re-initialize đúng.
   */
  useEffect(() => {
    if (mode === "edit" && product) {
      setFormData(productToFormData(product));
      setImagePreview(
        product.image && typeof product.image === "object"
          ? product.image.secure_url
          : "",
      );
      setImageFile(null);
      setError("");
    } else if (mode === "add") {
      setFormData(DEFAULT_FORM);
      setImagePreview("");
      setImageFile(null);
      setError("");
    }
  }, [mode, product?._id]); // Dùng product._id thay vì product object để tránh re-render không cần thiết

  // ---- Field Handlers ----

  const updateField = useCallback(
    <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const toggleHealthTag = useCallback((label: string) => {
    setFormData((prev) => ({
      ...prev,
      health_tags: prev.health_tags.includes(label)
        ? prev.health_tags.filter((t) => t !== label)
        : [...prev.health_tags, label],
    }));
  }, []);

  // ---- Recipe Handlers ----

  const addRecipeItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      recipe: [...prev.recipe, { name: "", quantity: "" }],
    }));
  }, []);

  const updateRecipeItem = useCallback(
    (index: number, field: keyof RecipeItem, value: string) => {
      setFormData((prev) => {
        const updated = [...prev.recipe];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, recipe: updated };
      });
    },
    [],
  );

  const removeRecipeItem = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipe: prev.recipe.filter((_, i) => i !== index),
    }));
  }, []);

  // ---- Submit ----

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
        // Lọc recipe items rỗng
        const cleanRecipe = formData.recipe.filter(
          (r) => r.name.trim() && r.quantity.trim(),
        );

        const payload: Record<string, any> = {
          ...formData,
          price: Number(formData.price),
          recipe: cleanRecipe,
        };

        // Nếu có ảnh mới → upload trước, lấy MongoDB ObjectId gán vào payload
        if (imageFile) {
          const uploadRes = await productService.uploadImage(imageFile);
          payload.image = uploadRes._id;
        }

        if (mode === "add") {
          await productService.createProduct(payload);
        } else if (mode === "edit" && product) {
          await productService.updateProduct(product._id, payload);
        }

        onSuccess();
        onClose();
        resetForm();
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          `Lỗi khi ${mode === "add" ? "thêm" : "cập nhật"} sản phẩm`;
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [formData, imageFile, mode, product, onSuccess, onClose],
  );

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM);
    setImageFile(null);
    setImagePreview("");
    setError("");
  }, []);

  return {
    formData,
    loading,
    error,
    imagePreview,
    updateField,
    handleImageChange,
    toggleHealthTag,
    addRecipeItem,
    updateRecipeItem,
    removeRecipeItem,
    handleSubmit,
    resetForm,
  };
};
