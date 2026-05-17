import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ReceiptText,
  ShoppingBag,
  ChevronRight,
  Clock,
  Star,
  X
} from "lucide-react";
import orderService from "@/services/order.service";
import type { Order } from "@/services/order.service";
import { buildVariantChips } from "@/utils/cartVariants";

type OrderStatusFilter =
  | "all"
  | "pending"
  | "processing"
  | "shipping"
  | "completed"
  | "cancelled";

interface Toast {
  id: number;
  type: "success" | "warning" | "error";
  message: string;
}

// Danh sách lý do hủy đơn (Có thể tùy chỉnh)
const CANCEL_REASONS = [
  "Tôi muốn thay đổi món ăn / số lượng",
  "Tôi muốn thay đổi địa chỉ nhận hàng",
  "Thời gian chờ xác nhận quá lâu",
  "Tôi không có nhu cầu nữa",
  "Lý do khác..."
];

const OrderHistoryTabContent = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- Modal Cancel States ---
  const [cancelModalData, setCancelModalData] = useState<{ isOpen: boolean; orderId: string | null }>({ isOpen: false, orderId: null });
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [otherReason, setOtherReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await orderService.getMyOrders();
        setOrders(res.data);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const showToast = (type: Toast["type"], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "processing") {
      return ["confirmed", "processing", "ready_for_delivery"].includes(order.status);
    }
    return order.status === statusFilter;
  });

  // Mở Modal Hủy
  const openCancelModal = (orderId: string) => {
    setCancelModalData({ isOpen: true, orderId });
    setSelectedReason(CANCEL_REASONS[0]);
    setOtherReason("");
  };

  // Đóng Modal Hủy
  const closeCancelModal = () => {
    if (isCancelling) return;
    setCancelModalData({ isOpen: false, orderId: null });
  };

  // Xác nhận Hủy Đơn Gọi API
  const submitCancelOrder = async () => {
    if (!cancelModalData.orderId) return;

    // Lấy lý do cuối cùng
    const finalReason = selectedReason === "Lý do khác..."
      ? (otherReason.trim() || "Khách hàng không để lại lý do")
      : selectedReason;

    try {
      setIsCancelling(true);
      // Gửi reason lên API (Giả định hàm cancelOrder hỗ trợ param thứ 2 là data)
      await orderService.cancelOrder(cancelModalData.orderId, { reason: finalReason } as any);

      showToast("success", "Đã hủy đơn hàng thành công");
      closeCancelModal();

      // Refresh list
      const res = await orderService.getMyOrders();
      setOrders(res.data);
    } catch (err) {
      showToast("error", "Không thể hủy đơn hàng này");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "Hoàn thành", className: "bg-emerald-50 text-emerald-600 border-emerald-200" };
      case "shipping":
        return { label: "Đang giao", className: "bg-orange-50 text-orange-600 border-orange-200" };
      case "ready_for_delivery":
        return { label: "Chờ Shipper lấy", className: "bg-blue-50 text-blue-600 border-blue-200" };
      case "confirmed":
      case "processing":
        return { label: "Đang chế biến", className: "bg-blue-50 text-blue-600 border-blue-200" };
      case "cancelled":
        return { label: "Đã hủy", className: "bg-slate-100 text-slate-600 border-slate-200" };
      case "pending":
      default:
        return { label: "Chờ xác nhận", className: "bg-rose-50 text-rose-600 border-rose-200" };
    }
  };

  const getImageUrl = (image: any) => {
    if (!image) return undefined;
    if (typeof image === "string") return image;
    return image.secure_url || image.url || undefined;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">
          Đang tải lịch sử đơn hàng...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 relative">
      {/* Toast Container */}
      <div className="fixed top-24 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border bg-white pointer-events-auto animate-in slide-in-from-right-8 fade-in ${toast.type === "success" ? "border-emerald-200" :
              toast.type === "warning" ? "border-orange-200" : "border-red-200"
              }`}
          >
            {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-orange-500" />}
            {toast.type === "error" && <XCircle className="w-5 h-5 text-red-500" />}
            <span className="text-sm font-bold text-slate-700">
              {toast.message}
            </span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
          <ReceiptText className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-slate-900">
            Lịch sử đơn hàng
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium mt-1">
            Theo dõi và đánh giá các món ngon bạn đã thưởng thức.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mask-fade-edges-right">
          {(
            [
              { id: "all", label: "Tất cả" },
              { id: "pending", label: "Chờ xác nhận" },
              { id: "processing", label: "Đang chuẩn bị" },
              { id: "shipping", label: "Đang giao" },
              { id: "completed", label: "Hoàn thành" },
              { id: "cancelled", label: "Đã hủy" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as OrderStatusFilter)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 border ${statusFilter === tab.id
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-5">
              <ShoppingBag className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có đơn hàng nào</h3>
            <p className="text-slate-500 font-medium max-w-sm mb-6">
              Bạn chưa có đơn hàng nào trong trạng thái này. Hãy khám phá thực đơn của chúng tôi nhé!
            </p>
            <button
              onClick={() => navigate("/menu")}
              className="px-8 py-3.5 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95"
            >
              Đặt món ngay
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusBadge = getStatusBadge(order.status);
            const firstItem = order.items[0];
            const variantChips = buildVariantChips((firstItem as any)?.variations);
            const moreItemsCount = order.items.length - 1;

            return (
              <div
                key={order._id}
                className="flex flex-col sm:flex-row items-stretch rounded-[1.5rem] bg-white shadow-sm hover:shadow-xl border border-slate-200 transition-all overflow-hidden group"
              >
                {/* Product Image */}
                <div
                  className="w-full sm:w-40 md:w-48 aspect-video sm:aspect-square shrink-0 bg-slate-100 relative overflow-hidden"
                >
                  <img
                    src={getImageUrl((firstItem.product_id as any)?.image)}
                    alt="Food"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">

                  {/* Top Area: Title & Status */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1.5 leading-tight group-hover:text-orange-600 transition-colors">
                        {(firstItem as any).product_id?.name || "Sản phẩm"}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                        <span className="text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">
                          #{order.code.slice(-6)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider border ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Middle Area: Variants & Extra Items */}
                  <div className="mb-5">
                    {variantChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {variantChips.map((c) => (
                          <span
                            key={c.key}
                            className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md"
                          >
                            {c.text}
                          </span>
                        ))}
                      </div>
                    )}

                    {moreItemsCount > 0 && (
                      <div className="text-sm font-bold text-slate-400">
                        ... và {moreItemsCount} món khác
                      </div>
                    )}
                  </div>

                  {/* Bottom Area: Price & Actions */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Tổng thanh toán
                      </p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">
                        {order.total_price.toLocaleString("vi-VN")}đ
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      {/* Trạng thái Pending -> Nút Hủy */}
                      {order.status === "pending" && (
                        <button
                          onClick={() => openCancelModal(order._id)}
                          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors active:scale-95"
                        >
                          Hủy đơn
                        </button>
                      )}

                      {/* Nút Xem chi tiết */}
                      <button
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors active:scale-95"
                      >
                        Chi tiết
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Trạng thái Hoàn thành -> Nút Đánh giá */}
                      {order.status === "completed" && (
                        <button
                          onClick={() => navigate(`/rating/${order._id}`)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors active:scale-95"
                        >
                          <Star className="w-4 h-4 fill-current" />
                          Đánh giá
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- MODAL HỦY ĐƠN HÀNG --- */}
      {cancelModalData.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-lg">Hủy đơn hàng</h3>
              </div>
              <button
                onClick={closeCancelModal}
                disabled={isCancelling}
                className="p-2 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6">
              <p className="text-slate-600 text-sm font-medium mb-5">
                Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này nhé:
              </p>

              <div className="space-y-3">
                {CANCEL_REASONS.map((reason, idx) => (
                  <label
                    key={idx}
                    onClick={() => setSelectedReason(reason)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${selectedReason === reason ? 'border-red-500 bg-red-50' : 'border-slate-100 hover:border-red-200'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedReason === reason ? 'border-red-500 bg-red-500' : 'border-slate-300'
                      }`}>
                      {selectedReason === reason && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className={`text-sm font-bold ${selectedReason === reason ? 'text-red-900' : 'text-slate-700'}`}>
                      {reason}
                    </span>
                  </label>
                ))}
              </div>

              {/* Ô nhập lý do khác */}
              {selectedReason === "Lý do khác..." && (
                <div className="mt-3 animate-in slide-in-from-top-2">
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Nhập lý do của bạn (không bắt buộc)..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={closeCancelModal}
                disabled={isCancelling}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Đóng lại
              </button>
              <button
                onClick={submitCancelOrder}
                disabled={isCancelling}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-70"
              >
                {isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Xác nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryTabContent;