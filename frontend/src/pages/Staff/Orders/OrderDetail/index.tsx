import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  CheckCircle2,
  Package,
  MapPin,
  ShoppingBag,
  AlertTriangle,
  Printer,
  Receipt,
  X,
  User,
  CreditCard,
  Truck,
  UtensilsCrossed,
  Check,
  ChefHat,
  MessageCircle,
  BellRing
} from "lucide-react";
import orderService from "@/services/order.service";
import type { Order } from "@/services/order.service";
import RejectModal from "@/components/Staff/RejectModal";
import { format } from "date-fns";

type ChecklistItem = { label: string; done: boolean };

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending": return "Mới nhận";
    case "confirmed":
    case "processing": return "Đang chế biến";
    case "ready_for_delivery": return "Chờ đi giao";
    case "shipping": return "Đang giao";
    case "completed": return "Hoàn thành";
    case "cancelled": return "Đã hủy";
    default: return "Chờ xử lý";
  }
};

const getStatusTheme = (status: string) => {
  switch (status) {
    case "pending": return "bg-rose-50 text-rose-600 border-rose-200"; // Đỏ nhạt
    case "confirmed":
    case "processing": return "bg-blue-50 text-blue-600 border-blue-200"; // Xanh dương
    case "ready_for_delivery": return "bg-emerald-50 text-emerald-600 border-emerald-200"; // Xanh lá
    case "shipping": return "bg-orange-50 text-orange-600 border-orange-200"; // Cam
    case "completed": return "bg-slate-100 text-slate-700 border-slate-300"; // Xám
    case "cancelled": return "bg-red-100 text-red-700 border-red-300";
    default: return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const buildChecklist = (items: Order["items"]): ChecklistItem[] =>
  items.flatMap((item) => {
    const base: ChecklistItem = {
      label: `Chuẩn bị ${typeof item.productId === 'object' ? item.productId.name : "món ăn"} (x${item.quantity})`,
      done: false,
    };
    const extras: ChecklistItem[] = (item.variations || []).map((v) => ({
      label: `${v.name}: ${v.choice} — ${typeof item.productId === 'object' ? item.productId.name : ""}`,
      done: false,
    }));
    return [base, ...extras];
  });

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function StaffOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id);
      setOrder(res.data);
      setChecklist(buildChecklist(res.data.items));
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Không thể tải chi tiết đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateStatus = async (status: Order["status"]) => {
    if (!order) return;
    try {
      setUpdating(true);

      // Nếu là hành động Nhận giao hàng (Tôi đi giao), gọi endpoint riêng nếu có, hoặc update status
      if (status === 'shipping' && order.status === 'ready_for_delivery') {
        await orderService.assignDelivery(order._id);
      } else {
        await orderService.updateOrderStatus(order._id, status);
      }

      await fetchOrder();
    } catch {
      alert("Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại!");
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!order) return;

    try {
      setUpdating(true);
      await orderService.rejectOrder(order._id, reason);
      setIsRejectModalOpen(false);
      await fetchOrder();
    } catch (err) {
      alert("Không thể từ chối đơn hàng. Vui lòng thử lại!");
    } finally {
      setUpdating(false);
    }
  };

  const toggleChecklist = (idx: number) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, done: !item.done } : item))
    );
  };

  // ─── RENDER LOADERS & ERRORS ───
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-slate-600 font-bold">Đang mở đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white p-10 rounded-3xl flex flex-col items-center text-center max-w-md shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-5">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Không tìm thấy đơn hàng</h2>
          <button onClick={() => navigate("/staff/orders")} className="w-full py-3.5 bg-orange-500 text-white font-bold rounded-xl">
            Quay lại bảng điều khiển
          </button>
        </div>
      </div>
    );
  }

  // ─── TIMELINE LOGIC ───
  const timelineSteps = [
    { key: "pending", label: "Mới nhận", icon: BellRing },
    { key: "processing", label: "Đang chế biến", icon: ChefHat },
    { key: "ready_for_delivery", label: "Chờ đi giao", icon: Package },
    { key: "shipping", label: "Đang giao", icon: Truck },
    { key: "completed", label: "Đã giao hàng", icon: CheckCircle2 },
  ];

  // Logic map status hiện tại vào Timeline (Gộp confirmed và processing)
  let activeStepKey = order.status;
  if (order.status === "confirmed") activeStepKey = "processing";
  const currentStatusIdx = activeStepKey === "cancelled" ? -1 : timelineSteps.findIndex(s => s.key === activeStepKey);

  // ─── SMART ACTION BUTTONS (Khớp 100% với Ảnh) ───
  const renderActionButtons = () => {
    if (order.status === 'cancelled') return null;
    if (order.status === 'completed' || order.status === 'shipping') {
      return (
        <div className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-xl flex justify-center items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {order.status === 'completed' ? "Đơn hàng đã hoàn tất" : "Bạn đang đi giao đơn này"}
        </div>
      );
    }

    // 1. Trạng thái: MỚI NHẬN
    if (order.status === 'pending') {
      return (
        <div className="flex gap-3">
          <button
            onClick={() => setIsRejectModalOpen(true)}
            disabled={updating}
            className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
          >
            Từ chối
          </button>
          <button
            onClick={() => handleUpdateStatus('confirmed')}
            disabled={updating}
            className="flex-[2] py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {updating && <Loader2 className="w-5 h-5 animate-spin" />}
            Nhận đơn
          </button>
        </div>
      );
    }

    // 2. Trạng thái: ĐANG CHẾ BIẾN
    if (order.status === 'confirmed' || order.status === 'processing') {
      return (
        <button
          onClick={() => handleUpdateStatus('ready_for_delivery')}
          disabled={updating}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          Đóng gói xong
        </button>
      );
    }

    // 3. Trạng thái: CHỜ ĐI GIAO
    if (order.status === 'ready_for_delivery') {
      return (
        <button
          onClick={() => handleUpdateStatus('shipping')}
          disabled={updating}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {updating && <Loader2 className="w-5 h-5 animate-spin" />}
          Tôi đi giao đơn này
        </button>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[1200px] h-[95vh] md:h-full max-h-[900px] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative">

        {/* Nút Đóng */}
        <button
          onClick={() => navigate("/staff/orders")}
          className="absolute top-5 right-5 p-2.5 bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all z-20 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* --- HEADER --- */}
        <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">#{order.code}</h1>
              <span className={`px-3 py-1 text-[11px] font-black rounded-full uppercase tracking-widest border ${getStatusTheme(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              Đặt lúc {format(new Date(order.createdAt), "HH:mm, dd/MM/yyyy")}
            </p>
          </div>

          <div className="flex items-center gap-3 pr-12 md:pr-0">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all active:scale-95">
              <Printer className="w-4 h-4" /> In Bill
            </button>
            <button
              onClick={() => navigate(`/staff/support?orderId=${order._id}`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" /> Liên hệ
            </button>
          </div>
        </div>

        {/* --- BODY LAYOUT --- */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50/30">

          {/* CỘT TRÁI (THÔNG TIN ĐƠN HÀNG) */}
          {/* Kỹ thuật ẩn thanh cuộn: [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {/* DANH SÁCH MÓN ĂN */}
            <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Danh sách món</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {order.items.map((item, idx) => {
                  const product = typeof item.productId === 'object' ? item.productId : null;
                  const imageUrl = typeof product?.image === 'string' ? product.image : (product?.image as { secureUrl: string })?.secureUrl;

                  return (
                    <div key={idx} className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                        {imageUrl ? <img className="w-full h-full object-cover" src={imageUrl} alt={product?.name} /> : <UtensilsCrossed className="w-6 h-6 text-slate-300" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-base leading-tight mb-1">{product?.name || "Sản phẩm"}</p>
                        {item.variations?.length > 0 && (
                          <p className="text-xs font-medium text-slate-500">
                            Ghi chú: {item.variations.map(v => `${v.name}: ${v.choice}`).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="text-center px-4">
                        <span className="font-black text-slate-500 text-sm">SL</span>
                        <p className="font-black text-slate-900 text-lg">x{item.quantity}</p>
                      </div>
                      <div className="text-right pl-4 min-w-[100px]">
                        <p className="font-black text-slate-900 text-lg">{(item.subTotal || 0).toLocaleString("vi-VN")}đ</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* THÔNG TIN KHÁCH HÀNG & THANH TOÁN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="bg-white p-6 border border-slate-200 rounded-[1.5rem] shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-orange-500" />
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Khách hàng</h3>
                </div>
                <p className="font-bold text-slate-900 text-lg">{typeof order.cusId === 'object' ? (order.cusId.fullName || order.cusId.username) : "Khách hàng"}</p>
                <p className="text-orange-600 font-bold mb-4">{typeof order.cusId === 'object' ? order.cusId.phone : order.deliveryAddress?.phone || "Chưa có SĐT"}</p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-0.5">Địa chỉ giao</p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {order.deliveryAddress?.detail ? `${order.deliveryAddress.detail}, ${order.deliveryAddress.ward}, ${order.deliveryAddress.city}` : "Chưa cập nhật địa chỉ giao hàng"}
                    </p>
                  </div>
                </div>

                {order.note && (
                  <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <p className="text-[10px] text-rose-600 font-black uppercase tracking-wider mb-1">Ghi chú của khách</p>
                    <p className="text-sm font-bold text-rose-900">"{order.note}"</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 border border-slate-200 rounded-[1.5rem] shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-orange-500" />
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Thanh toán</h3>
                </div>
                <div className="space-y-3 mb-4 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Tạm tính</span>
                    <span className="text-slate-900 font-bold">{(order.subTotal || 0).toLocaleString("vi-VN")}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Phí giao hàng</span>
                    <span className="text-slate-900 font-bold">{(order.shippingFee || 0).toLocaleString("vi-VN")}đ</span>
                  </div>
                  {order.voucher && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold">
                      <span className="flex items-center gap-1.5"><Receipt className="w-4 h-4" /> Voucher ({order.voucher})</span>
                      <span>Đã áp dụng</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-dashed border-slate-200">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-black text-slate-500">TỔNG CỘNG</span>
                    <span className="text-3xl font-black text-orange-600 tracking-tight">
                      {(order.totalPrice || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">
                      {order.payment?.method === 'cash' ? 'Thanh toán COD' : 'Chuyển khoản'}
                      ({order.payment?.paidAt ? 'Đã thu tiền' : 'Chưa thu tiền'})
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* CHECKLIST BẾP */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] p-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ChefHat className="w-4 h-4" /> Checklist Khu Bếp
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checklist.map((item, idx) => (
                  <label key={idx} className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 select-none ${item.done ? 'bg-emerald-50 border-emerald-200 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:border-orange-300'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-0.5 ${item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`}>
                      {item.done && <Check className="w-4 h-4 stroke-[3px]" />}
                    </div>
                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(idx)} className="hidden" />
                    <span className={`text-sm font-bold leading-snug ${item.done ? 'text-emerald-800 line-through' : 'text-slate-800'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* CỘT PHẢI (TIẾN TRÌNH & ACTION) */}
          <aside className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 shadow-[-10px_0_20px_rgba(0,0,0,0.02)] z-10">

            {/* Timeline */}
            <div className="p-8 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Tiến trình xử lý</h3>
              <div className="relative space-y-8 before:content-[''] before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
                {timelineSteps.map((step, idx) => {
                  const Icon = step.icon;
                  const isPast = idx < currentStatusIdx;
                  const isCurrent = idx === currentStatusIdx;
                  const isFuture = idx > currentStatusIdx;

                  return (
                    <div key={idx} className={`relative pl-14 transition-opacity ${isFuture ? 'opacity-40' : 'opacity-100'}`}>
                      <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 bg-white transition-all ${isPast ? 'border-emerald-500 text-emerald-500 bg-emerald-50' :
                        isCurrent ? 'border-orange-500 text-orange-500 shadow-[0_0_0_6px_rgba(249,115,22,0.1)]' :
                          'border-slate-200 text-slate-400'
                        }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="pt-2.5">
                        <p className={`text-base font-black leading-none ${isCurrent ? 'text-orange-600' : 'text-slate-900'}`}>{step.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Actions Area */}
            <div className="p-6 bg-white border-t border-slate-100 pb-8 lg:pb-6">
              {renderActionButtons()}
            </div>
          </aside>

        </div>
      </div>

      {/* MODAL TỪ CHỐI ĐƠN HÀNG */}
      <RejectModal
        isOpen={isRejectModalOpen}
        orderCode={order.code}
        onConfirm={handleConfirmReject}
        onClose={() => setIsRejectModalOpen(false)}
        isLoading={updating}
      />
    </div>
  );
}
