import { Loader2, Eye } from "lucide-react";
import type { Order } from "@/services/order.service";
import { useNavigate } from "react-router-dom";

interface OrderKanbanCardProps {
  order: Order;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onMarkReady: (id: string) => void;
  onAssignDelivery?: (id: string) => void;
  isActioning: boolean;
  isOverdue?: boolean;
}

export default function OrderKanbanCard({
  order,
  onConfirm,
  onReject,
  onMarkReady,
  onAssignDelivery,
  isActioning,
  isOverdue = false,
}: OrderKanbanCardProps) {
  const navigate = useNavigate();
  const isPending = order.status === "pending";
  const isPrepaing =
    order.status === "confirmed" || order.status === "processing";
  const isReady = order.status === "ready_for_delivery";

  // Check if there is any allergy warning
  const hasAllergyAlert = order.staffNoteItems && order.staffNoteItems.some(
    (n) => n.toLowerCase().includes("dị ứng") || n.toLowerCase().includes("cảnh báo")
  );

  const customerId = order.cusId
    ? typeof order.cusId === "string"
      ? order.cusId
      : order.cusId._id
    : null;

  const customerName = order.cusId
    ? typeof order.cusId === "string"
      ? "Khách hàng"
      : order.cusId.fullName || order.cusId.username
    : null;

  return (
    <div
      onClick={() => navigate(`/staff/orders/${order._id}`)}
      className={[
        "bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm transition-all cursor-pointer hover:shadow-md group/card border",
        isOverdue
          ? "border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse"
          : isPending
          ? "border-red-100 dark:border-red-900/30 ring-1 ring-red-200 dark:ring-red-800/50"
          : "border-gray-100 dark:border-white/10",
      ].join(" ")}
    >
      {/* Order code + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-primary">#{order.code}</span>
          {isOverdue && (
            <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-bounce">
              Trễ 5+ phút!
            </span>
          )}
          {hasAllergyAlert && (
            <span className="relative group cursor-help inline-flex items-center justify-center text-xs">
              ⚠️ <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded ml-1">Dị ứng</span>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-red-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                <p className="font-bold">Khách có dị ứng. Cần lưu ý khi chế biến.</p>
              </div>
            </span>
          )}
          <Eye className="w-4 h-4 text-gray-300 group-hover/card:text-primary transition-colors" />
        </div>
        <span className="text-[11px] text-gray-400">
          {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Customer profile quick-link */}
      {customerId && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/staff/customers/${customerId}`);
          }}
          className="mb-3 flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-orange-300 dark:hover:border-orange-800 transition-all text-xs"
        >
          <span className="font-bold text-gray-600 dark:text-gray-300 truncate max-w-[155px] flex items-center gap-1">
            <span>👤</span> {customerName || "Khách hàng"}
          </span>
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
            Hồ sơ ➔
          </span>
        </div>
      )}

      {/* Note from customer (Priority #1) */}
      {order.note && (
        <div className="mb-3 p-2 bg-red-50/50 dark:bg-red-900/10 border-l-2 border-red-300 dark:border-red-800 rounded-r-xl">
          <p className="text-red-700 dark:text-red-400 font-bold text-[11px] uppercase tracking-tight leading-relaxed">
            [GHI CHÚ: {order.note}]
          </p>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-1.5 mb-4 max-h-36 overflow-y-auto pr-1.5 custom-scrollbar">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-bold text-gray-800 dark:text-gray-200 truncate block">
                {(item.productId as { name?: string })?.name ?? "Món ăn"}
              </span>
              {item.variations.length > 0 && (
                <span className="text-[11px] text-gray-400 block mt-0.5">
                  {item.variations.map((v) => `${v.name}: ${v.choice}`).join(", ")}
                </span>
              )}
            </div>
            <span className="font-black text-[#ea580c] dark:text-orange-400 shrink-0">
              x{item.quantity}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onReject(order._id)}
            disabled={isActioning}
            className="py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-1 text-sm font-bold"
          >
            {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Từ chối"}
          </button>
          <button
            onClick={() => onConfirm(order._id)}
            disabled={isActioning}
            className="py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-1"
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
          className="w-full py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
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
          className="w-full py-2 rounded-xl bg-orange-500 text-white font-black text-sm shadow-sm hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
        >
          {isActioning ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "TÔI ĐI GIAO ĐƠN"
          )}
        </button>
      )}
      {isReady && !onAssignDelivery && (
        <div className="w-full py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 font-bold text-sm text-center">
          📦 Chờ shipper đến lấy
        </div>
      )}
    </div>
  );
}
