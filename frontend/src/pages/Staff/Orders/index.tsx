import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw, BellRing, ChefHat, PackageCheck, Inbox } from "lucide-react";
import orderService from "@/services/order.service";
import type { Order } from "@/services/order.service";
import OrderKanbanCard from "@/components/Staff/OrderKanbanCard";
import RejectModal from "@/components/Staff/RejectModal";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useToast } from "@/hooks/useToast";

const POLL_INTERVAL = 10_000; // 10 seconds

export default function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null);
  const prevPendingCount = useRef(0);
  const { playNotification } = useNotificationSound();
  const { toast } = useToast();

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await orderService.getAllOrders({
        status: "pending,confirmed,processing,ready_for_delivery",
      });
      setOrders(res.data);
    } catch {
      // silent – next poll will retry
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  // Polling every 10s
  useEffect(() => {
    const id = setInterval(() => fetchOrders(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchOrders]);

  // Derived columns
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter(
    (o) => o.status === "confirmed" || o.status === "processing",
  );
  const readyOrders = orders.filter((o) => o.status === "ready_for_delivery");

  // Sound alert when new PENDING orders arrive
  useEffect(() => {
    if (pendingOrders.length > prevPendingCount.current) {
      playNotification();
    }
    prevPendingCount.current = pendingOrders.length;
  }, [pendingOrders.length, playNotification]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const startActioning = (id: string) =>
    setActioningIds((prev) => new Set(prev).add(id));

  const stopActioning = (id: string) =>
    setActioningIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // ── Actions ────────────────────────────────────────────────────────────
  const handleConfirm = async (orderId: string) => {
    if (actioningIds.has(orderId)) return;
    startActioning(orderId);
    try {
      await orderService.confirmOrder(orderId);
      toast("Đã nhận đơn, bắt đầu chế biến!", "success");
      await fetchOrders();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Có lỗi xảy ra. Đơn hàng có thể đã bị hủy.";
      toast(msg, "error");
      await fetchOrders();
    } finally {
      stopActioning(orderId);
    }
  };

  const handleRejectOpen = (orderId: string) => {
    const order = orders.find((o) => o._id === orderId);
    if (order) setRejectTarget(order);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    const orderId = rejectTarget._id;
    startActioning(orderId);
    try {
      await orderService.rejectOrder(orderId, reason);
      toast("Đã từ chối đơn hàng.", "info");
      setRejectTarget(null);
      await fetchOrders();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Không thể từ chối đơn hàng.";
      toast(msg, "error");
    } finally {
      stopActioning(orderId);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    if (actioningIds.has(orderId)) return;
    startActioning(orderId);
    try {
      await orderService.markOrderReady(orderId);
      toast("Đơn hàng đã sẵn sàng để giao!", "success");
      await fetchOrders();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Không thể cập nhật trạng thái.";
      toast(msg, "error");
    } finally {
      stopActioning(orderId);
    }
  };

  const handleAssignDelivery = async (orderId: string) => {
    if (actioningIds.has(orderId)) return;
    startActioning(orderId);
    try {
      await orderService.assignDelivery(orderId);
      toast("Bạn đã nhận giao đơn này!", "success");
      await fetchOrders();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Không thể nhận giao đơn hàng.";
      toast(msg, "error");
    } finally {
      stopActioning(orderId);
    }
  };

  // ── Kanban Column Component ──────────────────────────────────────────────
  const KanbanColumn = ({
    title,
    count,
    colorTheme,
    icon: Icon,
    children,
  }: {
    title: string;
    count: number;
    colorTheme: "rose" | "blue" | "emerald";
    icon: any;
    children: React.ReactNode;
  }) => {
    const themeStyles = {
      rose: "text-rose-600 bg-rose-100 border-rose-200 shadow-rose-500/10",
      blue: "text-blue-600 bg-blue-100 border-blue-200 shadow-blue-500/10",
      emerald: "text-emerald-600 bg-emerald-100 border-emerald-200 shadow-emerald-500/10"
    };

    return (
      <div className="flex flex-col gap-4 bg-slate-100/50 rounded-[2rem] p-4 border border-slate-100">
        {/* Column Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${themeStyles[colorTheme]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="font-black text-slate-800 tracking-tight uppercase text-sm">
              {title}
            </span>
          </div>
          <div className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-white shadow-sm border border-slate-200 text-xs font-black text-slate-700">
            {count}
          </div>
        </div>

        {/* Column Content */}
        <div className="flex flex-col gap-3 min-h-[300px]">
          {children}
          {count === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 bg-white/50 rounded-2xl gap-2">
              <Inbox className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-400 text-center">Trống</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="p-4 bg-orange-100 rounded-2xl">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
        <p className="text-slate-500 font-bold animate-pulse">Đang đồng bộ đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Bảng Điều Phối Đơn Hàng
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Tự động đồng bộ (10s)
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95 border border-transparent hover:border-orange-200"
        >
          <RefreshCw className={`w-4 h-4 ${actioningIds.size > 0 ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Column 1: PENDING */}
        <KanbanColumn
          title="Mới Nhận"
          count={pendingOrders.length}
          colorTheme="rose"
          icon={BellRing}
        >
          {pendingOrders.map((order) => (
            <OrderKanbanCard
              key={order._id}
              order={order}
              onConfirm={handleConfirm}
              onReject={handleRejectOpen}
              onMarkReady={handleMarkReady}
              isActioning={actioningIds.has(order._id)}
            />
          ))}
        </KanbanColumn>

        {/* Column 2: CONFIRMED / PROCESSING */}
        <KanbanColumn
          title="Đang Chế Biến"
          count={preparingOrders.length}
          colorTheme="blue"
          icon={ChefHat}
        >
          {preparingOrders.map((order) => (
            <OrderKanbanCard
              key={order._id}
              order={order}
              onConfirm={handleConfirm}
              onReject={handleRejectOpen}
              onMarkReady={handleMarkReady}
              isActioning={actioningIds.has(order._id)}
            />
          ))}
        </KanbanColumn>

        {/* Column 3: READY_FOR_DELIVERY */}
        <KanbanColumn
          title="Chờ Đi Giao"
          count={readyOrders.length}
          colorTheme="emerald"
          icon={PackageCheck}
        >
          {readyOrders.map((order) => (
            <OrderKanbanCard
              key={order._id}
              order={order}
              onConfirm={handleConfirm}
              onReject={handleRejectOpen}
              onMarkReady={handleMarkReady}
              onAssignDelivery={handleAssignDelivery}
              isActioning={actioningIds.has(order._id)}
            />
          ))}
        </KanbanColumn>
      </div>

      {/* Reject Modal */}
      <RejectModal
        isOpen={!!rejectTarget}
        orderCode={rejectTarget?.code ?? ""}
        onConfirm={handleRejectConfirm}
        onClose={() => setRejectTarget(null)}
        isLoading={rejectTarget ? actioningIds.has(rejectTarget._id) : false}
      />
    </div>
  );
}