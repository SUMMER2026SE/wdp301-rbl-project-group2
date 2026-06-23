import { useState, useCallback, useEffect } from "react";
import productService from "@/services/product.service";
import type { Product } from "@/types/product";
import { CATEGORIES, HEALTH_TAG_OPTIONS } from "@/constants/product.constants";

// Re-export để các consumer cũ không bị break
export { CATEGORIES, HEALTH_TAG_OPTIONS };

// ---- Types ----

export interface RecipeItem {
  ingredientId: string;
  ingredientName: string;
  quantity: string;
  unit: string;
}

const DEFAULT_RECIPE_ITEM: RecipeItem = {
  ingredientId: "",
  ingredientName: "",
  quantity: "",
  unit: "g",
};

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: string;
  restaurant: string;
  time: string;
  healthWarning: string;
  healthTags: string[];
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
  healthWarning: "",
  healthTags: [],
  tags: [],
  recipe: [],
};

const createDefaultRecipeItem = (): RecipeItem => ({ ...DEFAULT_RECIPE_ITEM });

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
  healthWarning: product.healthWarning ?? "",
  healthTags: product.healthTags ?? [],
  tags: product.tags ?? [],
  recipe: (product.recipe ?? []).map((item) => ({
    ingredientId:
      typeof item.ingredientId === "object"
        ? item.ingredientId._id
        : typeof item.ingredientId === "string"
          ? item.ingredientId
          : "",
    ingredientName: typeof item.name === "string" ? item.name : "",
    quantity: String(item.quantity ?? ""),
    unit: item.unit ?? "g",
  })),
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
      ? typeof product.image === "string"
        ? product.image
        : product.image && typeof product.image === "object"
          ? product.image.secureUrl
          : ""
      : "",
  );

  /**
   * FIX: Reset form data khi product thay đổi.
   * Bug cũ: mở edit A → đóng → mở edit B → form vẫn giữ data của A.
   * useEffect này chạy mỗi khi mode/product thay đổi để re-initialize đúng.
   */
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (mode === "edit" && product) {
        setFormData(productToFormData(product));
        setImagePreview(
          typeof product.image === "string"
            ? product.image
            : product.image && typeof product.image === "object"
              ? product.image.secureUrl
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
    });
  }, [mode, product]);

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
      healthTags: prev.healthTags.includes(label)
        ? prev.healthTags.filter((t) => t !== label)
        : [...prev.healthTags, label],
    }));
  }, []);

  // ---- Recipe Handlers ----

  const addRecipeItem = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      recipe: [...prev.recipe, createDefaultRecipeItem()],
    }));
  }, []);

  const updateRecipeItem = useCallback(
    (index: number, field: keyof RecipeItem, value: string) => {
      setFormData((prev) => {
        const updated = [...prev.recipe];
        updated[index] = { ...updated[index], [field]: value };
        if (field === "ingredientId" && value) {
          updated[index].ingredientName = "";
        }
        if (field === "ingredientName" && value) {
          updated[index].ingredientId = "";
        }
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

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM);
    setImageFile(null);
    setImagePreview("");
    setError("");
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
          (r) => (r.ingredientId.trim() || r.ingredientName.trim()) && r.quantity.trim() && r.unit.trim(),
        );

        const payload: Partial<Product> & { price: number; recipe: { ingredientId?: string; ingredientName?: string; quantity: number; unit: string }[] } = {
          ...formData,
          price: Number(formData.price),
          recipe: cleanRecipe.map((item) => ({
            ingredientId: item.ingredientId || undefined,
            ingredientName: item.ingredientName || undefined,
            quantity: Number(item.quantity),
            unit: item.unit,
          })),
        };

        // Nếu có ảnh mới → upload trước, lấy secureUrl gán vào payload
        if (imageFile) {
          const uploadRes = await productService.uploadImage(imageFile);
          payload.image = uploadRes.secureUrl;
        }

        if (mode === "add") {
          await productService.createProduct(payload);
        } else if (mode === "edit" && product) {
          await productService.updateProduct(product._id, payload);
        }

        onSuccess();
        onClose();
        resetForm();
      } catch (err: unknown) {
        const maybeError = err as { response?: { data?: { message?: string } } };
        const message =
          maybeError.response?.data?.message ||
          `Lỗi khi ${mode === "add" ? "thêm" : "cập nhật"} sản phẩm`;
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [formData, imageFile, mode, product, onSuccess, onClose, resetForm],
  );

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
