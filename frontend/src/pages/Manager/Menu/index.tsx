// Manager Menu Management Page — Enhanced

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
  Heart,
  LayoutGrid,
  List,
  Eye,
  Edit2,
  X,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── Constants ───────────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  active: "Đang bán",
  inactive: "Tạm dừng",
  out_of_stock: "Hết hàng",
  deleted: "Đã xoá",
};

const statusFilterOptions = [
  { value: "all", label: "Tất cả" },
  { value: "available", label: "Đang bán" },
  { value: "suspended", label: "Tạm ngưng" },
] as const;

type StatusFilterValue = (typeof statusFilterOptions)[number]["value"];

const getStatusBadge = (product: Product) => {
  if (!product.isAvailable || product.status !== "active") {
    return {
      label: product.isAvailable
        ? statusLabels[product.status] || product.status
        : "Tạm ẩn",
      dot: "bg-rose-500",
      badge:
        "bg-rose-500/10 text-rose-600 border-rose-200/30",
    };
  }
  return {
    label: statusLabels[product.status] || "Đang bán",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-500/10 text-emerald-600 border-emerald-200/30",
  };
};

const getImageUrl = (image: Product["image"]) => {
  if (!image) return "/placeholder-food.png";
  if (typeof image === "string") return image;
  if (image && typeof image === "object" && image.secureUrl) return image.secureUrl;
  return "/placeholder-food.png";
};

// ── Main Component ──────────────────────────────────────────────────────

const ManagerMenu = () => {
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Tất cả"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [status, setStatus] = useState<Product["status"]>("active");
  const [operationalNote, setOperationalNote] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Fetch Data ──────────────────────────────────────────────────────
  const fetchMenuData = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [menuRes, categoriesRes] = await Promise.all([
        productService.getManagerMenu(),
        productService.getCategories(),
      ]);

      setProducts(menuRes.data ?? []);
      if (categoriesRes.success) {
        setCategories(["Tất cả", ...(categoriesRes.data || [])]);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể tải menu chi nhánh.";
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchMenuData(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMenuData]);

  // ── Filters & Search ────────────────────────────────────────────────
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
        (statusFilter === "available" &&
          item.isAvailable &&
          item.status === "active") ||
        (statusFilter === "suspended" &&
          (!item.isAvailable || item.status !== "active"));

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  // ── Stats ───────────────────────────────────────────────────────────
  const totalItems = products.length;
  const inStockItems = products.filter(
    (item) => item.isAvailable && item.status === "active",
  ).length;
  const outOfStockItems = totalItems - inStockItems;

  // ── Modal handlers ──────────────────────────────────────────────────
  const closeModal = () => {
    setSelectedProduct(null);
    setDetailProduct(null);
    setDetailLoading(false);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setDetailProduct(null);
    setDetailLoading(false);
    setIsAvailable(product.isAvailable ?? true);
    setStatus(product.status === "deleted" ? "inactive" : product.status);
    setOperationalNote(product.operationalNote ?? "");
  };

  const openDetailModal = async (product: Product) => {
    setSelectedProduct(product);
    setDetailProduct(null);
    setDetailLoading(true);
    try {
      const response = await productService.getManagerProductById(product._id);
      setDetailProduct(response.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể tải chi tiết sản phẩm.";
      toast.error(message);
      closeModal();
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    const toastId = toast.loading("Đang cập nhật...");
    try {
      await productService.updateManagerProductAvailability(
        selectedProduct._id,
        { isAvailable, status, operationalNote },
      );
      toast.success("Cập nhật trạng thái thành công!", { id: toastId });
      closeModal();
      void fetchMenuData();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể cập nhật sản phẩm.";
      toast.error(message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* ── Header + KPI ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
            Manager Menu
          </p>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 mt-1">
            Quản lý menu chi nhánh
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Xem công thức, topping và cập nhật tình trạng bán theo chi nhánh
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* KPI Cards */}
          <div className="flex gap-2.5">
            <div className="px-4 py-2 bg-[#fcfaf8] border border-[#e7dbcf] rounded-2xl text-center min-w-[90px] shadow-sm">
              <div className="text-lg font-black text-orange-500 leading-none mb-1">
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
            onClick={() => void fetchMenuData()}
            className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-500 text-slate-700 font-bold text-xs transition-all active:scale-95 border border-transparent hover:border-orange-200 disabled:opacity-50"
            title="Làm mới thực đơn"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Search & Filters Toolbar ─────────────────────────────────── */}
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fcfaf8] border border-slate-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-xs font-semibold placeholder:text-[#9a734c]/50 text-slate-800 transition-all outline-none"
            />
          </div>

          {/* Status & View Mode Filters */}
          <div className="flex flex-wrap items-center gap-3 sm:w-auto w-full">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-[#fcfaf8] border border-[#e7dbcf] rounded-xl p-0.5 sm:w-auto w-full">
              {statusFilterOptions.map((opt) => {
                const isActive = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all ${
                      isActive
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-[#9a734c] hover:text-orange-500 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
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
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-[#9a734c] hover:text-orange-500 hover:bg-slate-50"
                }`}
                title="Dạng lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-[#9a734c] hover:text-orange-500 hover:bg-slate-50"
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
                      ? "bg-orange-500 text-white border-transparent shadow-md shadow-orange-500/10"
                      : "bg-[#fcfaf8] text-slate-900 border-[#e7dbcf] hover:border-orange-400/40 hover:bg-white"
                  }`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white text-orange-500"
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

      {/* ── Content ──────────────────────────────────────────────────── */}
      {loading ? (
        <SkeletonLoader viewMode={viewMode} />
      ) : (
        <>
          {viewMode === "grid" ? (
            /* ── Grid View ─────────────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
              {filteredItems.map((item) => {
                const badge = getStatusBadge(item);
                return (
                  <div
                    key={item._id}
                    className={`bg-white rounded-2xl overflow-hidden border border-[#e7dbcf] hover:shadow-lg hover:border-orange-400/30 transition-all duration-300 flex flex-col group ${
                      !item.isAvailable || item.status !== "active"
                        ? "opacity-85 bg-slate-50/50"
                        : ""
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
                        className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 backdrop-blur-md border ${badge.badge}`}
                      >
                        <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                        {badge.label}
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
                      <div className="mb-1.5">
                        <span className="px-1.5 py-0.5 bg-[#fcfaf8] border border-[#e7dbcf] rounded text-[8px] font-black text-[#9a734c] uppercase tracking-wide">
                          {item.category}
                        </span>
                      </div>
                      <h3
                        className="text-sm font-black text-slate-950 leading-tight line-clamp-1 group-hover:text-orange-500 transition-colors mb-2"
                        title={item.name}
                      >
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-[#9a734c] line-clamp-2 mb-2 flex-1 leading-relaxed">
                        {item.description || "Không có mô tả chi tiết."}
                      </p>

                      {/* Operational Note */}
                      {item.operationalNote && (
                        <p className="text-[10px] font-semibold text-orange-600 bg-orange-50 rounded-lg px-2 py-1 mb-2 line-clamp-1">
                          📋 {item.operationalNote}
                        </p>
                      )}

                      {/* Health Tags */}
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

                      {/* Price & Actions */}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div className="text-base font-black text-slate-950 tracking-tight">
                          {item.price.toLocaleString("vi-VN")}₫
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void openDetailModal(item)}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all bg-orange-500 text-white hover:bg-orange-600 active:scale-95 shadow-sm"
                            title="Cập nhật trạng thái"
                          >
                            <Edit2 className="w-3 h-3" />
                            Cập nhật
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Table View ────────────────────────────────────────── */
            <div className="bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm mb-8 animate-in fade-in duration-300">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf] text-[10px] font-black text-[#9a734c] uppercase tracking-wider">
                      <th className="py-4 px-6">Món ăn</th>
                      <th className="py-4 px-4">Danh mục</th>
                      <th className="py-4 px-4">Đơn giá</th>
                      <th className="py-4 px-4">Đặc điểm / Dị ứng</th>
                      <th className="py-4 px-4">Ghi chú vận hành</th>
                      <th className="py-4 px-4">Trạng thái</th>
                      <th className="py-4 px-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {filteredItems.map((item) => {
                      const badge = getStatusBadge(item);
                      return (
                        <tr
                          key={item._id}
                          className={`hover:bg-[#fcfaf8]/50 transition-colors group ${
                            !item.isAvailable || item.status !== "active"
                              ? "opacity-85 bg-slate-50/30"
                              : ""
                          }`}
                        >
                          {/* Dish Column */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[#e7dbcf]">
                                <img
                                  src={getImageUrl(item.image)}
                                  alt={item.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-950 line-clamp-1 group-hover:text-orange-500 transition-colors">
                                  {item.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  ID: {item._id.substring(item._id.length - 6).toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-wide">
                              {item.category}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="py-4 px-4 font-black text-slate-950">
                            {item.price.toLocaleString("vi-VN")}₫
                          </td>

                          {/* Health */}
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {item.healthWarning && (
                                <div className="relative cursor-help group/warn">
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200/50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    <AlertCircle className="w-3 h-3" />
                                    Dị ứng
                                  </span>
                                  <div className="absolute left-0 bottom-full mb-2 w-52 p-2.5 bg-rose-950 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/warn:opacity-100 group-hover/warn:visible transition-all z-10 font-bold leading-normal">
                                    Cảnh báo: {item.healthWarning}
                                  </div>
                                </div>
                              )}
                              {item.healthTags &&
                                item.healthTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full flex items-center gap-0.5"
                                  >
                                    <Heart className="w-2.5 h-2.5 fill-amber-500/20 shrink-0" />
                                    {tag}
                                  </span>
                                ))}
                              {!item.healthWarning &&
                                (!item.healthTags ||
                                  item.healthTags.length === 0) && (
                                  <span className="text-[10px] text-slate-400 font-normal italic">
                                    --
                                  </span>
                                )}
                            </div>
                          </td>

                          {/* Operational Note */}
                          <td className="py-4 px-4 max-w-[180px]">
                            {item.operationalNote ? (
                              <p className="text-[11px] text-orange-600 font-semibold line-clamp-2 leading-relaxed">
                                {item.operationalNote}
                              </p>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal italic">
                                --
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void openDetailModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95"
                              >
                                <Eye className="w-3 h-3" />
                                Chi tiết
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all bg-orange-500 text-white hover:bg-orange-600 active:scale-95 shadow-sm"
                              >
                                <Edit2 className="w-3 h-3" />
                                Cập nhật
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              <h3 className="text-base font-bold text-slate-950">
                Không tìm thấy món ăn nào
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Hãy thay đổi bộ lọc, từ khóa tìm kiếm hoặc chọn danh mục khác.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal (recipe + topping) ──────────────────────────── */}
      {selectedProduct && (detailLoading || detailProduct) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl space-y-5 rounded-3xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-[#e7dbcf] shrink-0">
                  <img
                    src={getImageUrl(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                    Chi tiết sản phẩm
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {selectedProduct.price.toLocaleString("vi-VN")}₫ · {selectedProduct.category?.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center p-10 text-orange-500">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            ) : detailProduct ? (
              <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
                {/* Recipe Section */}
                <section>
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    Nguyên liệu / công thức
                  </h4>
                  {detailProduct.recipe?.length ? (
                    <ul className="mt-2 space-y-2 text-sm font-semibold text-slate-600">
                      {detailProduct.recipe.map((item, index) => (
                        <li
                          key={`${item.ingredientId}-${index}`}
                          className="rounded-2xl bg-slate-50 p-3 flex items-center justify-between"
                        >
                          <span>
                            {typeof item.ingredientId === "object"
                              ? item.ingredientId.name
                              : item.name || "Nguyên liệu"}
                          </span>
                          <span className="text-xs font-black text-orange-500">
                            {item.quantity} {item.unit || ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-400">
                      Chưa có thông tin nguyên liệu định lượng.
                    </p>
                  )}
                </section>

                {/* Topping Section */}
                <section>
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                    Topping / lựa chọn
                  </h4>
                  {detailProduct.variationIds?.length ? (
                    <div className="mt-2 space-y-2">
                      {detailProduct.variationIds.map((variant, index) => (
                        <div
                          key={`${variant.name}-${index}`}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <p className="text-sm font-black text-slate-700">
                            {variant.name}
                            {variant.required && (
                              <span className="ml-2 text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                                Bắt buộc
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {variant.options
                              ?.map(
                                (option) =>
                                  `${option.choice} (+${option.extraPrice.toLocaleString("vi-VN")}₫)`,
                              )
                              .join(", ") || "Không có lựa chọn"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-400">
                      Không có topping đi kèm.
                    </p>
                  )}
                </section>

                {/* Health Info */}
                {(detailProduct.healthWarning ||
                  (detailProduct.healthTags && detailProduct.healthTags.length > 0)) && (
                  <section>
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Thông tin sức khỏe
                    </h4>
                    <div className="mt-2 space-y-2">
                      {detailProduct.healthWarning && (
                        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3 text-sm font-semibold text-rose-700">
                          ⚠️ {detailProduct.healthWarning}
                        </div>
                      )}
                      {detailProduct.healthTags && detailProduct.healthTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {detailProduct.healthTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-full flex items-center gap-1"
                            >
                              <Heart className="w-3 h-3 fill-amber-500/20" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Edit Modal (availability + status + note) ────────────────── */}
      {selectedProduct && !detailProduct && !detailLoading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-[#e7dbcf] shrink-0">
                  <img
                    src={getImageUrl(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                    Cập nhật trạng thái
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {selectedProduct.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Availability Toggle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100 hover:border-orange-200 transition-colors">
              <div
                className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${
                  isAvailable ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isAvailable ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-slate-700">
                  Cho phép bán sản phẩm
                </span>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {isAvailable
                    ? "Sản phẩm đang hiển thị cho khách hàng"
                    : "Sản phẩm đã bị ẩn khỏi menu"}
                </p>
              </div>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(event) => setIsAvailable(event.target.checked)}
                className="sr-only"
              />
            </label>

            {/* Status Select */}
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Trạng thái vận hành
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "active", label: "Đang bán", icon: CheckCircle2, color: "emerald" },
                    { value: "inactive", label: "Tạm dừng", icon: XCircle, color: "amber" },
                    { value: "out_of_stock", label: "Hết hàng", icon: Package, color: "rose" },
                  ] as const
                ).map((opt) => {
                  const isActive = status === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-all ${
                        isActive
                          ? opt.color === "emerald"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : opt.color === "amber"
                              ? "bg-amber-50 border-amber-300 text-amber-700"
                              : "bg-rose-50 border-rose-300 text-rose-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </label>

            {/* Operational Note */}
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Ghi chú vận hành
              </span>
              <textarea
                value={operationalNote}
                onChange={(event) => setOperationalNote(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 transition-all"
                placeholder="Ví dụ: hết bún, tạm ngưng topping, cần báo bếp trước"
              />
            </label>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleUpdate()}
                disabled={saving}
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:opacity-60 transition-colors shadow-sm shadow-orange-500/20"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </span>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerMenu;

// ── Skeleton Loader Component ──────────────────────────────────────────
function SkeletonLoader({
  viewMode = "grid",
}: {
  viewMode?: "grid" | "table";
}) {
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
              <div className="h-4 bg-slate-200 rounded w-20 shrink-0" />
              <div className="h-4 bg-slate-200 rounded w-24 shrink-0" />
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
