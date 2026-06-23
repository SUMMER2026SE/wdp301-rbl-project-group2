import React, { useState, useEffect } from "react";
import { clsx } from "clsx";
import { ChefHat, ImageOff, LayoutGrid, List, Plus, Search, X } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useToast, ToastContainer } from "@/hooks/useToast";
import type { Product, ProductFilters } from "@/types/product";
import ProductFormModal from "./ProductFormModal";
import { CUSTOMER_CATEGORY_FILTERS, HEALTH_TAG_OPTIONS } from "@/constants/product.constants";
import { Pagination } from "@/components/shared/Pagination";

// ─── Constants ───

// Re-map shared constant cho Admin chip UI (tất cả categories)
const CATEGORY_CHIPS = CUSTOMER_CATEGORY_FILTERS.map((c) => ({
  id: c.id,
  label: c.label,
}));

// ─── Confirm Dialog Component ───

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-3xl">
              warning
            </span>
          </div>
          <p className="text-gray-800 font-semibold">{message}</p>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/25"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───

const AdminMenuManagement = () => {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeHealthTags, setActiveHealthTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm, activeHealthTags]);

  const toggleHealthTagFilter = (label: string) => {
    setActiveHealthTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Confirm delete dialog
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  // Toast
  const { toasts, toast, dismiss } = useToast();

  // Build filters từ state — hook tự fetch lại khi filters thay đổi
  const filters: ProductFilters = {
    page: currentPage,
    limit: pageSize,
    showAll: true,
  };
  if (activeCategory !== "all") filters.category = activeCategory;
  if (searchTerm) filters.search = searchTerm;
  if (activeHealthTags.length > 0) filters.healthTags = activeHealthTags;

  const {
    products,
    pagination,
    loading,
    error,
    fetchProducts,
    deleteProduct,
    toggleAvailability,
  } = useProducts(filters);

  // ── Handlers ──

  const openAddModal = () => {
    setFormMode("add");
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setFormMode("edit");
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchProducts();
    toast(
      formMode === "add"
        ? "Thêm sản phẩm thành công!"
        : "Cập nhật sản phẩm thành công!",
      "success",
    );
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmTarget(id);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmTarget) return;
    try {
      await deleteProduct(confirmTarget);
      toast("Đã xóa sản phẩm", "success");
    } catch {
      toast("Lỗi khi xóa sản phẩm", "error");
    } finally {
      setConfirmTarget(null);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      await toggleAvailability(product);
      toast(
        `${product.name} — ${product.isAvailable ? "Tạm ngừng bán" : "Mở bán trở lại"}`,
        "info",
      );
    } catch {
      toast("Lỗi khi cập nhật trạng thái", "error");
    }
  };

  // ── Render helpers ──

  const renderImage = (item: Product) => {
    const imgSrc = typeof item.image === "string"
      ? item.image.trim()
      : item.image?.secureUrl?.trim();
    if (imgSrc) {
      return (
        <img
          src={imgSrc}
          alt={`Ảnh món ${item.name}`}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      );
    }
    return null;
  };

  const getRecipeIngredients = (item: Product) => {
    const ingredients =
      item.recipe
        ?.map((recipeItem) => {
          if (typeof recipeItem.ingredientId === "object") {
            return recipeItem.ingredientId.name;
          }
          return recipeItem.name;
        })
        .filter(Boolean) ?? [];

    return ingredients.length > 0 ? ingredients : ["Chưa có thành phần"];
  };

  const getRecipeIngredientsText = (item: Product) => getRecipeIngredients(item).join(", ");

  // ── JSX ──

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6">
      {/* Hero */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b140d] via-[#6d3518] to-[#d87c24] px-6 py-8 text-white shadow-xl shadow-orange-950/20 md:px-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-amber-300/35 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-orange-200">
              <ChefHat className="size-4" aria-hidden="true" />
              Bếp Ăn Ngon
            </div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">Thực đơn hấp dẫn từ ánh nhìn</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 md:text-base">
              Quản lý hình ảnh, giá bán và trạng thái phục vụ trong một không gian trực quan hơn.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-orange-100/30 bg-white/15 px-5 py-3 shadow-inner shadow-white/5 backdrop-blur-sm">
              <p className="text-2xl font-black text-orange-300">{pagination?.total || 0}</p>
              <p className="text-xs font-semibold text-white/60">Tổng món ăn</p>
            </div>
            <div className="flex rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
              <button type="button" onClick={() => setViewMode("card")} className={clsx("flex size-11 items-center justify-center rounded-lg transition-colors", viewMode === "card" ? "bg-white text-[#ee8c2b]" : "text-white/70 hover:bg-white/10")} title="Xem dạng thẻ" aria-label="Xem dạng thẻ">
                <LayoutGrid className="size-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setViewMode("table")} className={clsx("flex size-11 items-center justify-center rounded-lg transition-colors", viewMode === "table" ? "bg-white text-[#ee8c2b]" : "text-white/70 hover:bg-white/10")} title="Xem dạng bảng" aria-label="Xem dạng bảng">
                <List className="size-5" aria-hidden="true" />
              </button>
            </div>
            <button type="button" onClick={openAddModal} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#ee8c2b] px-6 text-sm font-black text-white shadow-lg shadow-black/20 transition-all hover:bg-[#d87c24] active:scale-[0.98]">
              <Plus className="size-5" aria-hidden="true" />
              Thêm món mới
            </button>
          </div>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {/* Search + Category chips */}
      <div className="mb-6 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-white via-[#fffaf4] to-orange-50/70 p-4 shadow-[0_12px_35px_rgba(139,77,27,0.08)]">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9a734c]" aria-hidden="true" />
          <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm món theo tên..." className="h-12 w-full rounded-xl border border-orange-200 bg-white pl-12 pr-11 text-sm font-medium text-[#1b140d] shadow-sm outline-none transition focus:border-[#ee8c2b] focus:ring-4 focus:ring-[#ee8c2b]/15" />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#9a734c] hover:bg-[#f3ede7]" aria-label="Xóa nội dung tìm kiếm">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="custom-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveCategory(chip.id)}
                className={clsx(
                  "shrink-0 h-10 px-5 rounded-full border font-bold text-sm transition-all active:scale-[0.98]",
                  activeCategory === chip.id
                    ? "border-[#ee8c2b] bg-gradient-to-r from-[#ee8c2b] to-[#d87c24] text-white shadow-md shadow-orange-600/20"
                    : "border-orange-100 bg-white/90 text-[#5a4632] hover:border-orange-300 hover:bg-orange-50 hover:text-[#d87c24]",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Health Tag Filter Chips */}
        <div className="border-t border-[#e7dbcf]/50 mt-2 pt-2 px-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#9a734c] uppercase tracking-wider mr-2">
            Lọc theo thẻ sức khỏe:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {HEALTH_TAG_OPTIONS.map((tag) => {
              const isSelected = activeHealthTags.includes(tag.label);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleHealthTagFilter(tag.label)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                    isSelected
                      ? tag.color
                      : "bg-[#f8f7f6] text-gray-500 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {tag.label}
                  {isSelected && <span className="ml-1">✓</span>}
                </button>
              );
            })}
            {activeHealthTags.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveHealthTags([])}
                className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1.5 bg-red-50 hover:bg-red-100/50 rounded-full transition-colors border border-transparent hover:border-red-200"
              >
                Xóa lọc thẻ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
          <span className="material-symbols-outlined text-6xl animate-pulse">
            restaurant
          </span>
          <p className="mt-4 font-bold uppercase tracking-widest text-[#9a734c]">
            Đang tải dữ liệu...
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-gray-300">
              inventory_2
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Chưa có món ăn nào
          </h3>
          <p className="text-gray-500 max-w-xs mb-8">
            Bắt đầu bằng cách thêm món ăn đầu tiên vào thực đơn của bạn.
          </p>
          <button
            onClick={openAddModal}
            className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
          >
            Thêm món ngay
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* ─── TABLE VIEW ─── */
        <div className="overflow-hidden rounded-2xl border border-orange-200/80 bg-white shadow-[0_14px_40px_rgba(139,77,27,0.09)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-orange-200 bg-gradient-to-r from-orange-100/90 via-amber-50 to-[#fffaf4]">
                  <th className="py-4 px-6 text-xs font-bold text-[#9a734c] uppercase tracking-wider w-20">
                    Ảnh
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[#9a734c] uppercase tracking-wider">
                    Tên món & Thẻ sức khỏe
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[#9a734c] uppercase tracking-wider">
                    Danh mục
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[#9a734c] uppercase tracking-wider">
                    Giá
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[#9a734c] uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-[#9a734c] uppercase tracking-wider text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {products.map((item) => (
                  <tr
                    key={item._id}
                    className={clsx(
                      "border-l-4 transition-all hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50/40",
                      item.isAvailable ? "border-l-emerald-400" : "border-l-amber-400 bg-amber-50/20",
                    )}
                  >
                    <td className="py-4 px-6">
                      <div className="h-16 w-20 rounded-xl bg-[#f3ede7] flex items-center justify-center overflow-hidden border-2 border-white shadow-md ring-1 ring-orange-100">
                        {renderImage(item) || (
                          <span className="material-symbols-outlined text-[#9a734c] text-[20px]">
                            restaurant
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-[#1b140d]">
                          {item.name}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.healthTags?.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-green-50 text-[10px] text-green-700 font-black border border-green-100 rounded uppercase"
                            >
                              {tag}
                            </span>
                          ))}

                        </div>
                        <div className="inline-flex max-w-full flex-col gap-2 rounded-xl border border-[#eadfce] bg-gradient-to-r from-[#fffaf4] to-[#fcfaf8] px-3 py-2.5 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9a734c]">
                              Thành phần
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {getRecipeIngredients(item).map((ingredient) => (
                              <span
                                key={ingredient}
                                className={clsx(
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border",
                                  ingredient === "Chưa có thành phần"
                                    ? "border-dashed border-[#e0d1bf] bg-white text-[#9a734c]"
                                    : "border-[#e9d8c5] bg-white/90 text-[#5a4632] shadow-[0_1px_0_rgba(0,0,0,0.02)]",
                                )}
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center rounded-full border border-orange-200 bg-gradient-to-r from-orange-100 to-amber-50 px-3 py-1.5 text-xs font-bold text-orange-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="inline-flex rounded-xl bg-orange-50 px-3 py-2 text-base font-black text-[#d36f1c]">
                        {item.price.toLocaleString("vi-VN")}₫
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isAvailable}
                          onChange={() => handleToggleAvailability(item)}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                        <span className="ml-3 text-xs font-medium text-[#9a734c] peer-checked:text-emerald-700">
                          {item.isAvailable ? "Đang bán" : "Tạm ngừng"}
                        </span>
                      </label>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-2 text-[#9a734c] hover:text-[#d87c24] hover:bg-orange-100 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <span className="material-symbols-outlined text-xl">
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(item._id)}
                          className="p-2 text-[#9a734c] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-xl">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── CARD VIEW ─── */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((item) => (
            <div
              key={item._id}
              className={clsx(
                "group flex flex-col overflow-hidden rounded-3xl border border-[#e7dbcf] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-950/10",
                !item.isAvailable && "bg-[#fcfaf8]",
              )}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f3ede7]">
                {renderImage(item) || (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#fff8ef] to-[#efe0cf] text-[#b88b62]">
                    <ImageOff className="size-9" aria-hidden="true" />
                    <span className="mt-2 text-xs font-bold">Chưa có ảnh món</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span
                    className={clsx(
                      "text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm",
                      item.isAvailable ? "bg-[#ee8c2b]" : "bg-gray-500",
                    )}
                  >
                    {item.isAvailable ? "ĐANG BÁN" : "HẾT HÀNG"}
                  </span>
                </div>
                {/* Edit button overlay on card */}
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                  title="Chỉnh sửa"
                >
                  <span className="material-symbols-outlined text-[16px] text-blue-600">
                    edit
                  </span>
                </button>
                {item.healthTags?.length > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
                    {item.healthTags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[9px] text-green-700 font-black rounded-md border border-green-100 uppercase shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[#1b140d] text-lg font-bold leading-tight flex-1">
                    {item.name}
                  </h3>
                  <p className="text-[#ee8c2b] text-lg font-black ml-2">
                    {item.price.toLocaleString("vi-VN")}₫
                  </p>
                </div>
                <p className="text-[#9a734c] text-sm line-clamp-2 mb-3">
                  {item.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#9a734c] uppercase px-2 py-1 bg-orange-50 rounded">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#ee8c2b] text-sm">
                      star
                    </span>
                    <span className="text-sm font-bold text-[#1b140d]">
                      {item.rating}
                    </span>
                  </div>
                </div>
                <div className="mb-4 rounded-2xl bg-[#fcfaf8] p-3 text-xs leading-5 text-[#7d6249]">
                  <span className="mr-1 font-black text-[#5a4632]">Thành phần:</span>
                  {getRecipeIngredientsText(item)}
                </div>
                <div className="mt-auto pt-4 border-t border-[#e7dbcf] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(item)}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors",
                      item.isAvailable
                        ? "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                        : "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100",
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {item.isAvailable ? "check_circle" : "block"}
                    </span>
                    {item.isAvailable ? "Còn món" : "Tạm hết"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRequest(item._id)}
                    className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination component */}
      {!loading && pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}

      {/* ─── Modals & Dialogs ─── */}

      <ProductFormModal
        isOpen={isFormOpen}
        mode={formMode}
        product={selectedProduct}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />

      <ConfirmDialog
        isOpen={confirmTarget !== null}
        message="Bạn có chắc chắn muốn xóa món này? Hành động này không thể hoàn tác."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
};

export default AdminMenuManagement;
