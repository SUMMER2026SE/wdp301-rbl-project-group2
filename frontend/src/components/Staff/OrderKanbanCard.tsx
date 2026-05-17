import { Loader2, Phone, Wallet, Eye } from "lucide-react";
import type { Order } from "@/services/order.service";
import { useNavigate } from "react-router-dom";

interface OrderKanbanCardProps {
  order: Order;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onMarkReady: (id: string) => void;
  onAssignDelivery?: (id: string) => void; // Optional if only used in Kanban where this might be needed
  isActioning: boolean;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash_on_delivery: "COD",
  vnpay: "VNPay",
  momo: "Momo",
  credit_card: "Thẻ",
  paypal: "PayPal",
};

export default function OrderKanbanCard({
  order,
  onConfirm,
  onReject,
  onMarkReady,
  onAssignDelivery,
  isActioning,
}: OrderKanbanCardProps) {
  const navigate = useNavigate();
  const isPending = order.status === "pending";
  const isPrepaing =
    order.status === "confirmed" || order.status === "processing";
  const isReady = order.status === "ready_for_delivery";

  return (
    <div
      onClick={() => navigate(`/staff/orders/${order._id}`)}
      className={[
        "bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:shadow-md group/card",
        isPending
          ? "border-2 border-red-100 dark:border-red-900/30 ring-1 ring-red-200 dark:ring-red-800/50"
          : "border border-gray-100 dark:border-white/10",
      ].join(" ")}
    >
      {/* Order code + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-primary">#{order.code}</span>
          <Eye className="w-4 h-4 text-gray-300 group-hover/card:text-primary transition-colors" />
        </div>
        <span className="text-[11px] text-gray-400">
          {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Customer info */}
      <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {typeof order.user_id === "object" ? order.user_id?.username?.charAt(0)?.toUpperCase() : "K"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
            {typeof order.user_id === "object" ? order.user_id?.username : "Khách hàng"}
            {/* AI Flagging - Tối giản cho Bếp */}
            {order.staff_note_items && order.staff_note_items.some(n => n.toLowerCase().includes('dị ứng') || n.toLowerCase().includes('cảnh báo')) && (
              <div
                className="relative group cursor-help inline-flex items-center justify-center"
              >
                <span className="text-red-500 text-lg">⚠️</span>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-red-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-red-900">
                  <p className="font-bold">Khách có dị ứng. Cần lưu ý khi chế biến.</p>
                </div>
              </div>
            )}
          </div>
          {typeof order.user_id === "object" && order.user_id?.phone && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <Phone className="w-3 h-3" />
              {order.user_id.phone}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
          <Wallet className="w-3 h-3" />
          {PAYMENT_LABEL[order.payment.method] ?? order.payment.method}
        </div>
      </div>

      {/* Note from customer (Priority #1) */}
      {order.note && (
        <div className="mb-3 p-3 bg-red-50/50 dark:bg-red-900/10 border-l-2 border-red-300 dark:border-red-800 rounded-r-xl">
          <p className="text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-tight leading-relaxed">
            [GHI CHÚ: {order.note}]
          </p>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-1.5 mb-3 max-h-28 overflow-y-auto pr-1 scrollbar-hide">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                {(item.product_id as { name?: string })?.name ?? "Món ăn"}
              </span>
              {item.variations.length > 0 && (
                <span className="text-[11px] text-gray-400">
                  {item.variations.map((v) => `${v.name}: ${v.choice}`).join(", ")}
                </span>
              )}
            </div>
            <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0">
              x{item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-white/10 mb-3">
        <span className="text-xs text-gray-500">Tổng cộng</span>
        <span className="text-base font-black text-gray-900 dark:text-white">
          {(order.total_price ?? 0).toLocaleString("vi-VN")}đ
        </span>
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onReject(order._id)}
            disabled={isActioning}
            className="py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-1 text-sm font-bold"
          >
            {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Từ chối"}
          </button>
          <button
            onClick={() => onConfirm(order._id)}
            disabled={isActioning}
            className="py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-1"
          >
            {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Nhận đơn"}
          </button>
        </div>
      )}

      {isPrepaing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkReady(order._id);
          }}
          disabled={isActioning}
          className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
        >
          {isActioning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "✓ Đóng gói xong"
          )}
        </button>
      )}

      {isReady && onAssignDelivery && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAssignDelivery(order._id);
          }}
          disabled={isActioning}
          className="w-full py-3 rounded-xl bg-orange-500 text-white font-black text-sm shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
        >
          {isActioning ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "TÔI ĐI GIAO ĐƠN NÀY"
          )}
        </button>
      )}
      {isReady && !onAssignDelivery && (
        <div className="w-full py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 font-bold text-sm text-center">
          📦 Chờ shipper đến lấy
        </div>
      )}
    </div>
  );
}
