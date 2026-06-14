import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  Search,
  Calendar,
  CreditCard,
  ShoppingBag,
  Eye,
  ClipboardList,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import orderService, { type Order } from "@/services/order.service";

const statusLabels: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Chờ xác nhận", bg: "bg-amber-50 border-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  confirmed: { label: "Đã nhận đơn", bg: "bg-blue-50 border-blue-100/70", text: "text-blue-700", dot: "bg-blue-500" },
  processing: { label: "Đang chế biến", bg: "bg-sky-50 border-sky-100/70", text: "text-sky-700", dot: "bg-sky-400" },
  preparing: { label: "Đang chuẩn bị", bg: "bg-sky-50 border-sky-100/70", text: "text-sky-700", dot: "bg-sky-400" },
  ready_for_delivery: { label: "Chờ giao", bg: "bg-indigo-50 border-indigo-100/70", text: "text-indigo-700", dot: "bg-indigo-400" },
  shipping: { label: "Đang vận chuyển", bg: "bg-purple-50 border-purple-100/70", text: "text-purple-700", dot: "bg-purple-400" },
  delivering: { label: "Đang vận chuyển", bg: "bg-purple-50 border-purple-100/70", text: "text-purple-700", dot: "bg-purple-400" },
  delivered: { label: "Đã giao hàng", bg: "bg-teal-50 border-teal-100/70", text: "text-teal-700", dot: "bg-teal-400" },
  completed: { label: "Hoàn tất", bg: "bg-emerald-50 border-emerald-100/70", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Đã hủy", bg: "bg-rose-50 border-rose-100/70", text: "text-rose-700", dot: "bg-rose-500" },
};

const getRelativeTime = (dateStr: string) => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ManagerOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await orderService.getManagerOrders({ limit: 100 });
      setOrders(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tải danh sách đơn hàng chi nhánh");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  // Filter and search computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "" || order.status === statusFilter;
      
      const orderCode = order.code.toLowerCase();
      const customerName = typeof order.cusId === "object" && order.cusId !== null
        ? (order.cusId.fullName || order.cusId.username).toLowerCase() 
        : "khach hang";
      const customerPhone = typeof order.cusId === "object" && order.cusId !== null ? order.cusId.phone : "";
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = 
        searchQuery === "" ||
        orderCode.includes(query) ||
        customerName.includes(query) ||
        (customerPhone && customerPhone.includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Paginated orders
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;

  // Brief KPI metrics derived from state
  const metrics = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
    
    return {
      todayTotal: todayOrders.length,
      todayCompleted: todayOrders.filter(o => o.status === "completed").length,
      todayCancelled: todayOrders.filter(o => o.status === "cancelled").length,
      pendingCount: orders.filter(o => o.status === "pending").length,
    };
  }, [orders]);

  // Build range of visible page numbers (e.g. 1 ... 4 5 6 ... 10)
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, filteredOrders.length);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-sm">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Manager Space</span>
          <h1 className="mt-2 text-3xl font-black text-slate-950 tracking-tight">Giám sát Đơn hàng Chi nhánh</h1>
          <p className="mt-1.5 text-sm font-semibold text-slate-500">
            Duyệt đơn mới, theo dõi lịch trình giao hàng, kiểm tra thanh toán COD và kiểm soát vận hành chi nhánh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchOrders()}
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition-all hover:scale-[1.03] active:scale-95 shadow-md shadow-orange-500/10 cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} />
          Đồng bộ dữ liệu
        </button>
      </div>

      {/* Mini KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300 group">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Đơn trong ngày</p>
            <p className="text-2xl font-black text-slate-950 mt-0.5">{metrics.todayTotal}</p>
          </div>
        </div>

        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thành công hôm nay</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{metrics.todayCompleted}</p>
          </div>
        </div>

        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300 group">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <RefreshCw className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hủy đơn hôm nay</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{metrics.todayCancelled}</p>
          </div>
        </div>

        <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300 group">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Đơn chờ xác nhận</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{metrics.pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-orange-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn #ORD, tên khách hoặc số điện thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 border border-transparent focus:border-orange-400 focus:bg-white text-xs font-semibold placeholder:text-slate-400 text-slate-800 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full md:w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-orange-400 cursor-pointer"
          >
            <option value="">Tất cả trạng thái đơn</option>
            {Object.entries(statusLabels).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content Area */}
      {loading ? (
        <div className="bg-white border border-orange-100 rounded-3xl p-16 shadow-sm overflow-hidden flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
          <span className="text-xs text-slate-400 font-bold animate-pulse">Đang đồng bộ danh sách đơn...</span>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-600">{error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-orange-100 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-4">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-950">Không tìm thấy đơn hàng</h3>
          <p className="text-sm font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            Không có đơn hàng nào tại chi nhánh khớp với điều kiện tìm kiếm hoặc bộ lọc.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Mã đơn</th>
                  <th className="py-4 px-4">Thời gian</th>
                  <th className="py-4 px-4">Khách hàng</th>
                  <th className="py-4 px-4">Chi tiết món ăn</th>
                  <th className="py-4 px-4 text-center">Trạng thái</th>
                  <th className="py-4 px-4 text-right">Tổng tiền</th>
                  <th className="py-4 px-6 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {paginatedOrders.map((order) => {
                  const customerName = typeof order.cusId === "object" && order.cusId !== null
                    ? order.cusId.fullName || order.cusId.username
                    : "Khách lẻ";
                  
                  const statusInfo = statusLabels[order.status] || { label: order.status, bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" };

                  // Generate food item preview string
                  const itemsPreview = order.items
                    .map((item) => {
                      const name = typeof item.productId === "object" && item.productId !== null ? item.productId.name : "Món ăn";
                      return `${name} x${item.quantity}`;
                    })
                    .join(", ");

                  return (
                    <tr
                      key={order._id}
                      onClick={() => navigate(`/manager/orders/${order._id}`)}
                      className="hover:bg-orange-50/25 cursor-pointer transition-colors duration-200 group"
                    >
                      {/* Code */}
                      <td className="py-5 px-6 font-black text-slate-900">
                        <span className="text-orange-600 hover:text-orange-700 font-black">
                          #{order.code}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-5 px-4 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{getRelativeTime(order.createdAt)}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800">{customerName}</div>
                          {typeof order.cusId === "object" && order.cusId !== null && (
                            <div className="text-[10px] text-slate-400 font-medium">{order.cusId.phone}</div>
                          )}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-5 px-4 max-w-[200px]">
                        <p className="truncate text-slate-500 font-medium" title={itemsPreview}>
                          {itemsPreview}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusInfo.bg} ${statusInfo.text} shadow-inner`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-5 px-4 text-right font-black text-slate-950">
                        {order.totalPrice.toLocaleString("vi-VN")}₫
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {order.payment?.method === "cash" ? "Tiền mặt (COD)" : "Online"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/manager/orders/${order._id}`}
                          className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm font-bold active:scale-95 duration-150"
                        >
                          <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span>Chi tiết</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Footer ── */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Record count info */}
            <p className="text-xs font-bold text-slate-500">
              Hiển thị <span className="text-slate-800">{startRecord}</span> -{" "}
              <span className="text-slate-800">{endRecord}</span> trên{" "}
              <span className="text-slate-800">{filteredOrders.length}</span> đơn hàng
            </p>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Page size selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-400 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {pageNumbers.map((p, index) => {
                  const isCurrent = p === currentPage;
                  const isDots = p === "...";

                  return (
                    <button
                      key={index}
                      disabled={isDots}
                      onClick={() => typeof p === "number" && setCurrentPage(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                        isCurrent
                          ? "bg-orange-500 text-white shadow-sm shadow-orange-500/10"
                          : isDots
                          ? "text-slate-400 cursor-default"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-orange-300"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerOrders;
