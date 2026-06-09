import React, { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { Product } from "@/types/product";
import {
  useProductForm,
  CATEGORIES,
  HEALTH_TAG_OPTIONS,
} from "@/hooks/useProductForm";
import ingredientService, { type Ingredient } from "@/services/ingredient.service";
import { getAllergenLabel } from "@/constants/allergenCatalog";

// ---- Props ----

interface ProductFormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  product?: Product | null; // Bắt buộc khi mode === 'edit'
  onClose: () => void;
  onSuccess: () => void;
}

// ---- Component ----

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  mode,
  product,
  onClose,
  onSuccess,
}) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  const {
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
  } = useProductForm({ mode, product, onSuccess, onClose });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadIngredients = async () => {
      setLoadingIngredients(true);
      try {
        const data = await ingredientService.list();
        if (!cancelled) setIngredients(data);
      } catch {
        if (!cancelled) setIngredients([]);
      } finally {
        if (!cancelled) setLoadingIngredients(false);
      }
    };

    void loadIngredients();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const title =
    mode === "add" ? "Thêm món ăn mới" : `Chỉnh sửa: ${product?.name ?? ""}`;
  const submitLabel = mode === "add" ? "Lưu sản phẩm" : "Cập nhật";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                mode === "add"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-blue-100 text-blue-600",
              )}
            >
              <span className="material-symbols-outlined text-[20px]">
                {mode === "add" ? "add_circle" : "edit"}
              </span>
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* ─── Form Body ─── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar"
        >
          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center gap-2 rounded-r-lg">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {/* ─── Ảnh món ăn ─── */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              Ảnh món ăn
            </label>
            <div
              onClick={() =>
                document.getElementById("product-image-input")?.click()
              }
              className="relative w-full aspect-video rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-500 hover:bg-orange-50/30 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 group"
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined">edit</span>{" "}
                      Thay đổi ảnh
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
                    <span className="material-symbols-outlined text-3xl">
                      add_a_photo
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-700">
                      Nhấn để tải lên ảnh
                    </p>
                    <p className="text-xs text-gray-400">
                      Hỗ trợ JPG, PNG (Tối đa 5MB)
                    </p>
                  </div>
                </>
              )}
            </div>
            <input
              id="product-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* ─── Tên & Giá ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Tên món ăn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                placeholder="Ví dụ: Burger Gà Cay"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Giá bán (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.price}
                onChange={(e) => updateField("price", e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                placeholder="Ví dụ: 89000"
              />
            </div>
          </div>

          {/* ─── Mô tả ─── */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              Mô tả món ăn <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all resize-none"
              placeholder="Mô tả thành phần, hương vị..."
            />
          </div>

          {/* ─── Danh mục & Thời gian ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Danh mục <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all appearance-none bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">
                Thời gian chuẩn bị
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => updateField("time", e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                placeholder="Ví dụ: 15-20 min"
              />
            </div>
          </div>

          {/* ─── Nguyên liệu (Recipe) ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">
                  menu_book
                </span>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Nguyên liệu món ăn
                </label>
              </div>
              <button
                type="button"
                onClick={addRecipeItem}
                className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                Thêm dòng nguyên liệu
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              Mỗi dòng là một thành phần của món. Chọn đúng nguyên liệu từ kho, nhập số lượng theo đơn vị chuẩn để hệ thống tự tính dị ứng và mô tả món ăn chính xác.
            </p>

            {formData.recipe.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 border border-dashed border-gray-200 rounded-xl">
                Chưa có nguyên liệu nào. Nhấn "+ Thêm dòng nguyên liệu" để bắt đầu.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.recipe.map((item, index) => {
                  const selectedIngredient = ingredients.find(
                    (ingredient) => ingredient.id === item.ingredientId,
                  );
                  const usingCustomIngredient = !item.ingredientId;

                  return (
                    <div
                      key={`${item.ingredientId || item.ingredientName || "new"}-${index}`}
                      className="rounded-xl border border-gray-200 p-3 bg-gray-50/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Thành phần {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeRecipeItem(index)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Xóa thành phần ${index + 1}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_100px] gap-2 items-start">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">
                            Chọn nguyên liệu có sẵn
                          </label>
                          <select
                            value={item.ingredientId}
                            onChange={(e) =>
                              updateRecipeItem(index, "ingredientId", e.target.value)
                            }
                            disabled={Boolean(item.ingredientName.trim())}
                            className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-sm bg-white"
                          >
                            <option value="">
                              {loadingIngredients ? "Đang tải nguyên liệu..." : "Không có / nhập mới bên cạnh"}
                            </option>
                            {ingredients.map((ingredient) => (
                              <option key={ingredient.id} value={ingredient.id}>
                                {ingredient.name}
                                {ingredient.allergenTags.length > 0
                                  ? ` (${ingredient.allergenTags.map(getAllergenLabel).join(", ")})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">
                            Hoặc nhập nguyên liệu mới
                          </label>
                          <input
                            type="text"
                            value={item.ingredientName}
                            onChange={(e) =>
                              updateRecipeItem(index, "ingredientName", e.target.value)
                            }
                            className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-sm"
                            placeholder="Ví dụ: Bò viên"
                          />
                          {selectedIngredient && !usingCustomIngredient && (
                            <p className="text-[11px] text-gray-500">
                              Dị ứng: {selectedIngredient.allergenTags.length > 0
                                ? selectedIngredient.allergenTags.map(getAllergenLabel).join(", ")
                                : "Không có"}
                            </p>
                          )}
                          {usingCustomIngredient && item.ingredientName.trim() && (
                            <p className="text-[11px] text-orange-600">
                              Hệ thống sẽ tự tạo nguyên liệu mới khi lưu món.
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">
                            Số lượng
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateRecipeItem(index, "quantity", e.target.value)
                            }
                            className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-sm"
                            placeholder="1"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600">
                            Đơn vị
                          </label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              updateRecipeItem(index, "unit", e.target.value)
                            }
                            className="w-full h-11 px-3 rounded-lg border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-sm"
                            placeholder="g"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Health Tags ─── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600">
                health_and_safety
              </span>
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Thẻ sức khỏe & Cảnh báo
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {HEALTH_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleHealthTag(tag.label)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                    formData.healthTags.includes(tag.label)
                      ? tag.color
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300",
                  )}
                >
                  {tag.label}
                  {formData.healthTags.includes(tag.label) && (
                    <span className="ml-1">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Health Warning ─── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Cảnh báo sức khỏe cụ thể (Ghi chú thêm)
            </label>
            <input
              type="text"
              value={formData.healthWarning}
              onChange={(e) => updateField("healthWarning", e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
              placeholder="Ví dụ: Không phù hợp cho người dị ứng lạc"
            />
          </div>

          {/* ─── Footer Buttons ─── */}
          <div className="sticky bottom-0 bg-white pt-4 pb-1 border-t border-gray-100 flex gap-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "flex-2 h-12 rounded-xl text-white font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                mode === "add"
                  ? "bg-orange-600 hover:bg-orange-700 shadow-orange-600/25"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25",
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  Đang xử lý...
                </span>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
