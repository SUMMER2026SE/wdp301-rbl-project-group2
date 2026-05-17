import React, { useState, useEffect } from "react";
import { clsx } from "clsx";
import { useProducts } from "@/hooks/useProducts";
import { useToast, ToastContainer } from "@/hooks/useToast";
import type { Product } from "@/types/product";
import ProductFormModal from "./ProductFormModal";
import { CUSTOMER_CATEGORY_FILTERS } from "@/constants/product.constants";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm]);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Confirm delete dialog
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  // Toast
  const { toasts, toast, dismiss } = useToast();

  // Build filters từ state — hook tự fetch lại khi filters thay đổi
  const filters: Record<string, any> = {
    page: currentPage,
    limit: pageSize,
  };
  if (activeCategory !== "all") filters.category = activeCategory;
  if (searchTerm) filters.search = searchTerm;

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
    const imgSrc =
      typeof item.image === "object" ? item.image?.secure_url : null;
    if (imgSrc) {
      return (
        <img
          src={imgSrc}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <span className="material-symbols-outlined text-[#9a734c]">
        restaurant
      </span>
    );
  };

  // ── JSX ──

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1b140d]">
            Quản lý thực đơn
          </h2>
          <p className="text-[#9a734c] mt-1">
            Quản lý món ăn, cập nhật giá và trạng thái phục vụ.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-xl font-bold text-[#ee8c2b]">
              {pagination?.total || 0}
            </p>
            <p className="text-xs uppercase tracking-widest text-[#9a734c] font-bold">
              Tổng món
            </p>
          </div>
          {/* View toggle */}
          <div className="flex bg-white rounded-lg border border-[#e7dbcf] p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "table"
                  ? "bg-[#ee8c2b]/10 text-[#ee8c2b]"
                  : "text-[#9a734c] hover:bg-[#f3ede7]",
              )}
              title="Xem bảng"
            >
              <span className="material-symbols-outlined text-[20px]">
                table_chart
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={clsx(
                "p-2 rounded-md transition-colors",
                viewMode === "card"
                  ? "bg-[#ee8c2b]/10 text-[#ee8c2b]"
                  : "text-[#9a734c] hover:bg-[#f3ede7]",
              )}
              title="Xem thẻ"
            >
              <span className="material-symbols-outlined text-[20px]">
                grid_view
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 h-11 px-6 bg-[#ee8c2b] hover:bg-[#d87c24] text-white text-sm font-bold rounded-lg shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Thêm món mới
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {/* Search + Category chips */}
      <div className="bg-white rounded-xl border border-[#e7dbcf] p-2 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1 p-2">
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#9a734c]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm món, nguyên liệu hoặc danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-10 pr-4 bg-[#f8f7f6] border border-transparent rounded-lg text-[#1b140d] placeholder:text-[#9a734c] focus:outline-none focus:border-[#ee8c2b]/50 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 p-2 overflow-x-auto no-scrollbar">
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveCategory(chip.id)}
                className={clsx(
                  "shrink-0 h-10 px-5 rounded-lg font-medium text-sm transition-colors",
                  activeCategory === chip.id
                    ? "bg-[#ee8c2b] text-white"
                    : "bg-[#f8f7f6] text-[#1b140d] hover:bg-[#ee8c2b]/10",
                )}
              >
                {chip.label}
              </button>
            ))}
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
        <div className="bg-white border border-[#e7dbcf] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
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
              <tbody className="divide-y divide-[#e7dbcf]">
                {products.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-[#fcfaf8] transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="h-12 w-12 rounded-lg bg-[#f3ede7] flex items-center justify-center overflow-hidden">
                        {renderImage(item)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#1b140d]">
                          {item.name}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.health_tags?.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-green-50 text-[10px] text-green-700 font-black border border-green-100 rounded uppercase"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.health_warning && (
                            <span className="px-1.5 py-0.5 bg-red-50 text-[10px] text-red-700 font-black border border-red-100 rounded uppercase flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">
                                warning
                              </span>
                              {item.health_warning}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-[#1b140d]">
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
                        <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ee8c2b]" />
                        <span className="ml-3 text-xs font-medium text-[#9a734c] peer-checked:text-[#ee8c2b]">
                          {item.isAvailable ? "Đang bán" : "Tạm ngừng"}
                        </span>
                      </label>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-2 text-[#9a734c] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((item) => (
            <div
              key={item._id}
              className={clsx(
                "flex flex-col bg-white rounded-xl overflow-hidden border border-[#e7dbcf] hover:shadow-xl transition-all duration-300",
                !item.isAvailable && "opacity-60",
              )}
            >
              <div className="relative w-full aspect-4/3 overflow-hidden bg-[#f3ede7]">
                {typeof item.image === "object" && item.image?.secure_url ? (
                  <img
                    src={item.image.secure_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#9a734c] text-5xl">
                      restaurant
                    </span>
                  </div>
                )}
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
                {(item.health_tags?.length > 0 || item.health_warning) && (
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
                    {item.health_tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[9px] text-green-700 font-black rounded-md border border-green-100 uppercase shadow-sm"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.health_warning && (
                      <span className="px-2 py-0.5 bg-red-600 text-[9px] text-white font-black rounded-md uppercase shadow-sm flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">
                          warning
                        </span>{" "}
                        CẢNH BÁO
                      </span>
                    )}
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
