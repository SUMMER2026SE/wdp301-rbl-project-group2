import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  BellRing,
  ChefHat,
  PackageCheck,
  Banknote,
  Clock,
  ArrowRight,
  TrendingUp,
  ListOrdered,
  Users,
  UtensilsCrossed,
  MessageCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import orderService from "@/services/order.service";
import type { Order } from "@/services/order.service";
import { formatCurrency } from "@/utils/adminDboard";

// ── Helpers ─────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Chào buổi sáng", emoji: "☀️" };
  if (h < 18) return { text: "Chào buổi chiều", emoji: "🌤️" };
  return { text: "Chào buổi tối", emoji: "🌙" };
};

const getRelativeTime = (dateStr: string) => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
};

const STATUS_MAP: Record<
  string,
  { label: string; dot: string; bg: string; text: string }
> = {
  pending: {
    label: "Chờ xử lý",
    dot: "bg-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  confirmed: {
    label: "Đã xác nhận",
    dot: "bg-blue-400",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  processing: {
    label: "Đang nấu",
    dot: "bg-blue-400",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  ready_for_delivery: {
    label: "Sẵn sàng giao",
    dot: "bg-cyan-400",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
  },
  shipping: {
    label: "Đang giao",
    dot: "bg-indigo-400",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
  },
  completed: {
    label: "Thành công",
    dot: "bg-emerald-400",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  cancelled: {
    label: "Đã hủy",
    dot: "bg-red-400",
    bg: "bg-red-50",
    text: "text-red-700",
  },
};

const VI_DAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

const DONUT_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444"];

const getOrderStoreId = (order: Order) => {
  if (!order.storeId) return null;
  return typeof order.storeId === "string" ? order.storeId : order.storeId._id;
};

// ── Component ───────────────────────────────────────────────────────────

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { storeId } = useAuth();

  // ── Realtime clock ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Fetch data ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!storeId) return;
      try {
        setLoading(true);
        const res = await orderService.getStaffOrders({ storeId, limit: 100 });
        const scopedOrders = res.data?.filter((order) => getOrderStoreId(order) === storeId) ?? [];
        setOrders(scopedOrders);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [storeId]);

  // ── Computed stats ────────────────────────────────────────────────────
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders],
  );

  const processingCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "confirmed" ||
          o.status === "shipping" ||
          o.status === "processing",
      ).length,
    [orders],
  );

  const todayCompleted = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "completed" &&
          new Date(o.createdAt).toDateString() === new Date().toDateString(),
      ),
    [orders],
  );

  const todayRevenue = useMemo(
    () =>
      todayCompleted.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0),
    [todayCompleted],
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 10),
    [orders],
  );

  // Pipeline data for donut
  const pipelineData = useMemo(() => {
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    return [
      { name: "Chờ xử lý", value: pendingCount },
      { name: "Đang xử lý", value: processingCount },
      { name: "Hoàn thành", value: todayCompleted.length },
      { name: "Đã hủy", value: cancelled },
    ].filter((d) => d.value > 0);
  }, [orders, pendingCount, processingCount, todayCompleted]);

  const totalPipeline = pipelineData.reduce((s, d) => s + d.value, 0);

  // ── Sparkline data (7 days) ───────────────────────────────────────────
  const sparklineData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toDateString();
    });

    return {
      pending: days.map(
        (day) =>
          orders.filter(
            (o) =>
              o.status === "pending" &&
              new Date(o.createdAt).toDateString() === day,
          ).length,
      ),
      processing: days.map(
        (day) =>
          orders.filter(
            (o) =>
              (o.status === "confirmed" ||
                o.status === "shipping" ||
                o.status === "processing") &&
              new Date(o.createdAt).toDateString() === day,
          ).length,
      ),
      completed: days.map(
        (day) =>
          orders.filter(
            (o) =>
              o.status === "completed" &&
              new Date(o.createdAt).toDateString() === day,
          ).length,
      ),
      revenue: days.map((day) =>
        orders
          .filter(
            (o) =>
              o.status === "completed" &&
              new Date(o.createdAt).toDateString() === day,
          )
          .reduce((s, o) => s + Number(o.totalPrice || 0), 0),
      ),
    };
  }, [orders]);

  // ── Greeting ──────────────────────────────────────────────────────────
  const greeting = getGreeting();
  const formattedDate = `${VI_DAYS[currentTime.getDay()]}, ${currentTime.toLocaleDateString("vi-VN")}`;
  const formattedTime = currentTime.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // ── Stats config ──────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Chờ xử lý",
      value: pendingCount,
      icon: BellRing,
      iconBg: "bg-orange-50 dark:bg-orange-950/20",
      iconText: "text-[#ea580c] dark:text-orange-400",
      bars: sparklineData.pending,
      barColor: "bg-[#ea580c] dark:bg-orange-500",
    },
    {
      label: "Đang xử lý",
      value: processingCount,
      icon: ChefHat,
      iconBg: "bg-orange-50 dark:bg-orange-950/20",
      iconText: "text-[#ea580c] dark:text-orange-400",
      bars: sparklineData.processing,
      barColor: "bg-[#ea580c] dark:bg-orange-500",
    },
    {
      label: "Hoàn thành hôm nay",
      value: todayCompleted.length,
      icon: PackageCheck,
      iconBg: "bg-orange-50 dark:bg-orange-950/20",
      iconText: "text-[#ea580c] dark:text-orange-400",
      bars: sparklineData.completed,
      barColor: "bg-[#ea580c] dark:bg-orange-500",
    },
    {
      label: "Doanh thu hôm nay",
      value: formatCurrency(todayRevenue),
      icon: Banknote,
      iconBg: "bg-orange-50 dark:bg-orange-950/20",
      iconText: "text-[#ea580c] dark:text-orange-400",
      bars: sparklineData.revenue,
      barColor: "bg-[#ea580c] dark:bg-orange-500",
      isRevenue: true,
    },
  ];

  // ── Quick actions config ──────────────────────────────────────────────
  const quickActions = [
    {
      label: "Đơn hàng",
      desc: "Xem & xử lý đơn mới",
      icon: ListOrdered,
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      to: "/staff/orders",
      primary: true,
    },
    {
      label: "Khách hàng",
      desc: "Quản lý thông tin khách",
      icon: Users,
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      to: "/staff/customers",
    },
    {
      label: "Thực đơn",
      desc: "Quản lý món ăn",
      icon: UtensilsCrossed,
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
      to: "/staff/menu",
    },
    {
      label: "Chat hỗ trợ",
      desc: "Trò chuyện với khách",
      icon: MessageCircle,
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      to: "/staff/support-chat",
    },
  ];

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="p-4 bg-amber-50 rounded-2xl">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
        <p className="text-[#9a734c] font-medium animate-pulse">
          Đang tải dữ liệu hệ thống...
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#e7dbcf] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-2xl">
            {greeting.emoji}
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#1b140d]">
              {greeting.text}!
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-[#9a734c] font-medium">
                {formattedDate}
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#1b140d] bg-[#f3ede7] px-2.5 py-0.5 rounded-full">
                <Clock className="w-3.5 h-3.5 text-[#ea580c]" />
                {formattedTime}
              </div>
            </div>
          </div>
        </div>
        <button
          className="group flex items-center gap-2 px-6 py-3 bg-[#ea580c] text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] transition-all shrink-0"
          onClick={() => navigate("/staff/orders")}
        >
          <BellRing className="w-4 h-4" />
          {pendingCount > 0
            ? `${pendingCount} đơn chờ xử lý`
            : "Xem tất cả đơn hàng"}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const maxBar = Math.max(...stat.bars, 1);
          return (
            <div
              key={i}
              className="group bg-white border border-[#e7dbcf] rounded-2xl p-5 flex flex-col gap-4 hover:border-[#ea580c]/40 hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={() => navigate("/staff/orders")}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                  <Icon className={`w-5 h-5 ${stat.iconText}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#9a734c]">
                  {stat.label}
                </p>
                <h3 className="text-3xl font-black mt-1 text-[#1b140d] tracking-tight">
                  {stat.value}
                </h3>
              </div>
              {/* Mini sparkline */}
              <div className="h-8 w-full flex items-end gap-[3px]">
                {stat.bars.map((val, j) => (
                  <div
                    key={j}
                    className={`flex-1 rounded-sm ${stat.barColor} transition-all duration-500`}
                    style={{
                      height: `${Math.max((val / maxBar) * 100, 8)}%`,
                      opacity:
                        j === stat.bars.length - 1
                          ? 1
                          : 0.4 + (j / stat.bars.length) * 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Grid: Table + Sidebar ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Recent Orders Table ──────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white border border-[#e7dbcf] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#e7dbcf] flex items-center justify-between">
            <h4 className="text-lg font-bold text-[#1b140d]">
              Đơn hàng gần đây
            </h4>
            <button
              onClick={() => navigate("/staff/orders")}
              className="flex items-center gap-1 text-xs font-bold text-[#ea580c] hover:underline"
            >
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfaf8] border-b border-[#e7dbcf]">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                    Đơn hàng
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-[#9a734c] tracking-wider text-right">
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7dbcf]">
                {recentOrders.map((order) => {
                  const customerName =
                    typeof order.cusId === "object"
                      ? order.cusId.fullName || order.cusId.username || "Khách vãng lai"
                      : "Khách vãng lai";
                  const statusInfo =
                    STATUS_MAP[order.status] ?? STATUS_MAP.pending;
                  return (
                    <tr
                      key={order._id}
                      // onClick={() => navigate(`/order-detail/${order._id}`)}
                      className="hover:bg-[#fcfaf8] hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#ea580c] hover:underline">
                            #{order.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200/60 flex items-center justify-center text-[#ea580c] font-black text-xs shadow-sm"
                          >
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-[#1b140d] font-medium truncate max-w-[130px]">
                            {customerName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusInfo.bg} ${statusInfo.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}
                          />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-[#1b140d]">
                          {formatCurrency(Number(order.totalPrice || 0))}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-[#9a734c]">
                          {getRelativeTime(order.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#f3ede7] rounded-2xl flex items-center justify-center">
                  <ListOrdered className="w-8 h-8 text-[#9a734c]/40" />
                </div>
                <p className="text-sm font-medium text-[#9a734c]">
                  Chưa có đơn hàng nào
                </p>
                <p className="text-xs text-[#9a734c]/60 mt-1">
                  Các đơn hàng mới sẽ xuất hiện tại đây
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Donut Chart Card */}
          {totalPipeline > 0 && (
            <div className="bg-white border border-[#e7dbcf] rounded-2xl p-6 shadow-sm">
              <h4 className="text-lg font-bold text-[#1b140d] mb-4">
                Tổng quan đơn hàng
              </h4>
              <div className="relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pipelineData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e7dbcf",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      formatter={(value, name) => [
                        `${Number(value)} đơn`,
                        String(name),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#1b140d]">
                      {totalPipeline}
                    </p>
                    <p className="text-[10px] font-bold text-[#9a734c] uppercase tracking-wider">
                      Tổng đơn
                    </p>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {pipelineData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          DONUT_COLORS[i % DONUT_COLORS.length],
                      }}
                    />
                    <span className="text-xs text-[#9a734c] truncate">
                      {item.name}
                    </span>
                    <span className="text-xs font-bold text-[#1b140d] ml-auto">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white border border-[#e7dbcf] rounded-2xl p-6 shadow-sm">
            <h4 className="text-lg font-bold text-[#1b140d] mb-4">
              Truy cập nhanh
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.to}
                    className={`group flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left hover:scale-[1.01] hover:shadow-md ${action.primary
                      ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:border-amber-300"
                      : "bg-[#fcfaf8] border-[#e7dbcf] hover:border-[#ea580c]/40 hover:bg-white"
                      }`}
                    onClick={() => navigate(action.to)}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${action.iconBg} shrink-0`}
                    >
                      <ActionIcon
                        className={`w-5 h-5 ${action.iconText}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-[#1b140d] block">
                        {action.label}
                      </span>
                      <span className="text-xs text-[#9a734c] block mt-0.5">
                        {action.desc}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#9a734c]/40 group-hover:text-[#ea580c] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Status Card removed */}
        </div>
      </div>
    </div>
  );
}
