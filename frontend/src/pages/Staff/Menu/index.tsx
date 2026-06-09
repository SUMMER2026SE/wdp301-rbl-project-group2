// Staff Menu Management Page

import { useState, useEffect, useCallback, useMemo } from "react";
import productService from "@/services/product.service";
import type { Product } from "@/types/product";
import toast from "react-hot-toast";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  UtensilsCrossed,
  Search,
  Check,
  Ban,
  Heart,
  LayoutGrid,
  List,
} from "lucide-react";

export default function StaffMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Tất cả"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "suspended">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [actioningId, setActioningId] = useState<string | null>(null);

  // ── Fetch Categories & Products ─────────────────────────────────────────
  const fetchMenuData = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      // Fetch both products and categories in parallel
      const [productsRes, categoriesRes] = await Promise.all([
        productService.getProducts({ limit: 100 }), // large limit to display all products in staff view
        productService.getCategories(),
      ]);

      if (productsRes.success) {
        setProducts(productsRes.data || []);
      }
      if (categoriesRes.success) {
        setCategories(["Tất cả", ...(categoriesRes.data || [])]);
      }
    } catch (err) {
      console.error("Failed to fetch menu data:", err);
      toast.error("Không thể tải thông tin thực đơn.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load - deferred to avoid synchronous setState inside effect body
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMenuData(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMenuData]);

  // ── Toggle stock availability ──────────────────────────────────────────
  const toggleStock = async (id: string, currentStatus: boolean) => {
    if (actioningId) return;
    setActioningId(id);
    const toastId = toast.loading("Đang cập nhật trạng thái món ăn...");
    try {
      const res = await productService.updateProduct(id, {
        isAvailable: !currentStatus,
      });
      if (res.success) {
        toast.success(
          `Đã ${!currentStatus ? "mở bán lại" : "tạm ngưng"} món ăn thành công!`,
          { id: toastId }
        );
        // Update local state
        setProducts((prev) =>
          prev.map((item) =>
            item._id === id ? { ...item, isAvailable: !currentStatus } : item
          )
        );
      } else {
        toast.error(res.message || "Cập nhật thất bại.", { id: toastId });
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái.", { id: toastId });
    } finally {
      setActioningId(null);
    }
  };

  // ── Filters & Search ───────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description &&
          item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory =
        categoryFilter === "Tất cả" || item.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "available" && item.isAvailable) ||
        (statusFilter === "suspended" && !item.isAvailable);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  // Stats calculation
  const totalItems = products.length;
  const inStockItems = products.filter((item) => item.isAvailable).length;
  const outOfStockItems = totalItems - inStockItems;

  const getImageUrl = (image: Product["image"]) => {
    if (typeof image === "string") return image;
    if (image && typeof image === "object" && image.secureUrl)
      return image.secureUrl;
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"; // fallback
  };

  return (
    <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#1b140d]">
            Quản lý thực đơn
          </h2>
          <p className="text-xs text-[#9a734c] mt-1 font-medium flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Đồng bộ thời gian thực với cửa hàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Stats KPI */}
          <div className="flex gap-2.5">
            <div className="px-4 py-2 bg-[#fcfaf8] border border-[#e7dbcf] rounded-2xl text-center min-w-[90px] shadow-sm">
              <div className="text-lg font-black text-[#ea580c] leading-none mb-1">
                {totalItems}
              </div>
              <div className="text-[9px] font-black text-[#9a734c] uppercase tracking-wider">
                Tổng món
              </div>
            </div>
            <div className="px-4 py-2 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-center min-w-[90px] shadow-sm">
              <div className="text-lg font-black text-emerald-600 leading-none mb-1">
                {inStockItems}
              </div>
              <div className="text-[9px] font-black text-emerald-600/70 uppercase tracking-wider">
                Đang bán
              </div>
            </div>
            <div className="px-4 py-2 bg-rose-50/60 border border-rose-100 rounded-2xl text-center min-w-[90px] shadow-sm">
              <div className="text-lg font-black text-rose-600 leading-none mb-1">
                {outOfStockItems}
              </div>
              <div className="text-[9px] font-black text-rose-600/70 uppercase tracking-wider">
                Tạm ngưng
              </div>
            </div>
          </div>

          <button
            disabled={refreshing || loading}
            onClick={() => fetchMenuData()}
            className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-[#ea580c] text-slate-700 font-bold text-xs transition-all active:scale-95 border border-transparent hover:border-orange-200 disabled:opacity-50"
            title="Làm mới thực đơn"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      {/* Redesigned Search & Filters Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-8 shadow-sm flex flex-col gap-4">
        {/* Top Controls Row */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Field */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a734c]" />
            <input
              type="text"
              placeholder="Tìm tên món hoặc mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fcfaf8] border border-slate-100 focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10 text-xs font-semibold placeholder:text-[#9a734c]/50 text-slate-800 transition-all outline-none"
            />
          </div>

          {/* Status & View Mode Filters */}
          <div className="flex flex-wrap items-center gap-3 sm:w-auto w-full">
            {/* Status Select Buttons */}
            <div className="flex items-center bg-[#fcfaf8] border border-[#e7dbcf] rounded-xl p-0.5 sm:w-auto w-full">
              {(["all", "available", "suspended"] as const).map((status) => {
                const label =
                  status === "all"
                    ? "Tất cả"
                    : status === "available"
                    ? "Đang bán"
                    : "Tạm ngưng";
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                      isActive
                        ? "bg-[#ea580c] text-white shadow-sm"
                        : "text-[#9a734c] hover:text-[#ea580c] hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#fcfaf8] border border-[#e7dbcf] rounded-xl p-0.5 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-[#ea580c] text-white shadow-sm"
                    : "text-[#9a734c] hover:text-[#ea580c] hover:bg-slate-50"
                }`}
                title="Dạng lưới (4 cột)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-[#ea580c] text-white shadow-sm"
                    : "text-[#9a734c] hover:text-[#ea580c] hover:bg-slate-50"
                }`}
                title="Dạng bảng"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Row */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isSelected = categoryFilter === cat;
              const count =
                cat === "Tất cả"
                  ? products.length
                  : products.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  className={`shrink-0 px-3.5 py-2 rounded-xl font-bold text-[11px] transition-all tracking-wide flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-[#ea580c] text-white border-transparent shadow-md shadow-orange-500/10"
                      : "bg-[#fcfaf8] text-[#1b140d] border-[#e7dbcf] hover:border-[#ea580c]/40 hover:bg-white"
                  }`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white text-[#ea580c]"
                        : "bg-slate-100 text-[#9a734c]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <SkeletonLoader viewMode={viewMode} />
      ) : (
        <>
          {viewMode === "grid" ? (
            /* Menu Grid - Redesigned to support 4 cards per row */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  className={`bg-white rounded-2xl overflow-hidden border border-[#e7dbcf] hover:shadow-lg hover:border-[#ea580c]/30 transition-all duration-300 flex flex-col group ${
                    !item.isAvailable ? "opacity-85 bg-slate-50/50" : ""
                  }`}
                >
                  {/* Image & Status Badge */}
                  <div className="relative w-full h-[160px] overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div
                      className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 backdrop-blur-md border ${
                        item.isAvailable
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50"
                          : "bg-rose-500/10 text-rose-600 border-rose-200/50"
                      }`}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${
                          item.isAvailable ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {item.isAvailable ? "Sẵn sàng" : "Hết hàng"}
                    </div>

                    {/* Health Warning Badge */}
                    {item.healthWarning && (
                      <div className="absolute top-3 left-3 p-1 bg-rose-500/95 text-white rounded-lg shadow-md cursor-help group/warn">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <div className="absolute left-0 top-full mt-2 w-52 p-2.5 bg-rose-950 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/warn:opacity-100 group-hover/warn:visible transition-all z-10 font-bold leading-normal">
                          Cảnh báo dị ứng: {item.healthWarning}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="text-sm font-black text-[#1b140d] leading-tight line-clamp-1 group-hover:text-[#ea580c] transition-colors" title={item.name}>
                        {item.name}
                      </h3>
                      <span className="px-1.5 py-0.5 bg-[#fcfaf8] border border-[#e7dbcf] rounded text-[8px] font-black text-[#9a734c] uppercase tracking-wide shrink-0">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9a734c] line-clamp-2 mb-3.5 flex-1 leading-relaxed">
                      {item.description || "Không có mô tả chi tiết cho món ăn này."}
                    </p>

                    {/* Health Tags (nếu có) */}
                    {item.healthTags && item.healthTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.healthTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          >
                            <Heart className="w-2 h-2 fill-amber-500/20 shrink-0" />
                            {tag}
                          </span>
                        ))}
                        {item.healthTags.length > 2 && (
                          <span className="text-[8px] font-bold text-[#9a734c] bg-slate-100 px-1.5 py-0.5 rounded-full">
                            +{item.healthTags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price & Actions Toggle */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <div className="text-base font-black text-[#1b140d] tracking-tight">
                        {item.price.toLocaleString("vi-VN")}đ
                      </div>
                      <button
                        disabled={actioningId === item._id}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm ${
                          item.isAvailable
                            ? "bg-white text-rose-600 border-rose-200 hover:bg-rose-50/60 hover:border-rose-500"
                            : "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                        } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                        onClick={() => toggleStock(item._id, item.isAvailable)}
                      >
                        {actioningId === item._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : item.isAvailable ? (
                          <Ban className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        {item.isAvailable ? "Tạm ngưng" : "Mở lại"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Menu Table View Mode */
            <div className="bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm mb-8 animate-in fade-in duration-300">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf] text-[10px] font-black text-[#9a734c] uppercase tracking-wider">
                      <th className="py-4 px-6">Món ăn</th>
                      <th className="py-4 px-4">Danh mục</th>
                      <th className="py-4 px-4">Mô tả</th>
                      <th className="py-4 px-4">Đơn giá</th>
                      <th className="py-4 px-4">Đặc điểm / Dị ứng</th>
                      <th className="py-4 px-4">Trạng thái</th>
                      <th className="py-4 px-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredItems.map((item) => (
                      <tr
                        key={item._id}
                        className={`hover:bg-[#fcfaf8]/50 transition-colors group ${
                          !item.isAvailable ? "opacity-85 bg-slate-50/30" : ""
                        }`}
                      >
                        {/* Dish Column */}
                        <td className="py-4 px-6 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#e7dbcf]">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-black text-[#1b140d] line-clamp-1 group-hover:text-[#ea580c] transition-colors">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              ID: {item._id.substring(item._id.length - 6).toUpperCase()}
                            </div>
                          </div>
                        </td>

                        {/* Category Column */}
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-wide">
                            {item.category}
                          </span>
                        </td>

                        {/* Description Column */}
                        <td className="py-4 px-4 max-w-[200px]">
                          <p className="text-[11px] text-[#9a734c] line-clamp-2 font-normal leading-relaxed">
                            {item.description || "Không có mô tả chi tiết."}
                          </p>
                        </td>

                        {/* Price Column */}
                        <td className="py-4 px-4 font-black text-[#1b140d]">
                          {item.price.toLocaleString("vi-VN")}đ
                        </td>

                        {/* Health Warnings / Allergy Column */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.healthWarning && (
                              <div className="relative cursor-help group/warn">
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  <AlertCircle className="w-3 h-3" />
                                  Dị ứng
                                </span>
                                <div className="absolute left-0 bottom-full mb-2 w-52 p-2.5 bg-rose-950 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/warn:opacity-100 group-hover/warn:visible transition-all z-10 font-bold leading-normal">
                                  Cảnh báo dị ứng: {item.healthWarning}
                                </div>
                              </div>
                            )}
                            {item.healthTags && item.healthTags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full flex items-center gap-0.5"
                              >
                                <Heart className="w-2.5 h-2.5 fill-amber-500/20 shrink-0" />
                                {tag}
                              </span>
                            ))}
                            {!item.healthWarning && (!item.healthTags || item.healthTags.length === 0) && (
                              <span className="text-[10px] text-slate-400 font-normal italic">--</span>
                            )}
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              item.isAvailable
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/30"
                                : "bg-rose-500/10 text-rose-600 border-rose-200/30"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isAvailable ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            {item.isAvailable ? "Sẵn sàng" : "Hết hàng"}
                          </span>
                        </td>

                        {/* Action Column */}
                        <td className="py-4 px-6 text-right">
                          <button
                            disabled={actioningId === item._id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border shadow-sm ${
                              item.isAvailable
                                ? "bg-white text-rose-600 border-rose-200 hover:bg-rose-50/60 hover:border-rose-500"
                                : "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                            onClick={() => toggleStock(item._id, item.isAvailable)}
                          >
                            {actioningId === item._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : item.isAvailable ? (
                              <Ban className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            {item.isAvailable ? "Tạm ngưng" : "Mở lại"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-3xl p-8 mb-8">
              <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <UtensilsCrossed className="w-6 h-6 text-[#9a734c]/60" />
              </div>
              <h3 className="text-base font-bold text-[#1b140d]">
                Không tìm thấy món ăn nào
              </h3>
              <p className="text-xs text-[#9a734c] mt-1 max-w-xs">
                Hãy thay đổi bộ lọc, từ khóa tìm kiếm hoặc chọn danh mục thực đơn khác.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Skeleton Loader Component ──────────────────────────────────────────
function SkeletonLoader({ viewMode = "grid" }: { viewMode?: "grid" | "table" }) {
  if (viewMode === "table") {
    return (
      <div className="bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm animate-pulse mb-8">
        <div className="h-12 bg-slate-50 border-b border-[#e7dbcf]" />
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex flex-col gap-2 w-full">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
              <div className="h-4 bg-slate-200 rounded w-24 shrink-0" />
              <div className="h-4 bg-slate-200 rounded w-32 shrink-0" />
              <div className="h-6 bg-slate-200 rounded w-20 shrink-0" />
              <div className="h-8 bg-slate-200 rounded w-24 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm animate-pulse"
        >
          <div className="w-full h-[160px] bg-slate-200" />
          <div className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-1/4" />
            </div>
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-full" />
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-7 bg-slate-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
