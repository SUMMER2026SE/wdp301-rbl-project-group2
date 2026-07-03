import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  BellRing,
  ChefHat,
  PackageCheck,
  Banknote,
  Clock,
  ArrowRight,
  ListOrdered,
  UtensilsCrossed,
  AlertTriangle,
  Users,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  Bar,
  BarChart,
} from "recharts";
import orderService, { type Order } from "@/services/order.service";
import productService from "@/services/product.service";
import managerDashboardService, { type ManagerDashboardMetrics } from "@/services/manager-dashboard.service";
import type { Product } from "@/types/product";
import { useAuth } from "@/hooks/useAuth";

// ── Helpers ─────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Chào buổi sáng", emoji: "☀️" };
  if (h < 18) return { text: "Chào buổi chiều", emoji: "🌤️" };
  return { text: "Chào buổi tối", emoji: "🌙" };
};

const formatCurrency = (value: number) => {
  return value.toLocaleString("vi-VN") + "₫";
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xử lý", color: "#fbbf24" }, // amber-400
  confirmed: { label: "Đã nhận đơn", color: "#3b82f6" }, // blue-400
  processing: { label: "Đang chế biến", color: "#60a5fa" }, // blue-300
  ready_for_delivery: { label: "Chờ giao", color: "#22d3ee" }, // cyan-400
  shipping: { label: "Đang vận chuyển", color: "#818cf8" }, // indigo-400
  delivered: { label: "Đã giao hàng", color: "#34d399" }, // emerald-400
  completed: { label: "Hoàn tất", color: "#10b981" }, // emerald-500
  cancelled: { label: "Đã hủy", color: "#f87171" }, // red-400
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Tiền mặt (COD)",
  cash: "Tiền mặt (COD)",
  cod: "Tiền mặt (COD)",
  COD: "Tiền mặt (COD)",
  VNPAY: "Ví VNPAY",
  vnpay: "Ví VNPAY",
  PAYOS: "Cổng PayOS",
  payos: "Cổng PayOS",
  unknown: "Thanh toán khác",
};

const DONUT_COLORS = ["#3b82f6", "#fbbf24", "#10b981", "#ef4444", "#818cf8", "#22d3ee"];
// Dummy fallback payments for empty stats
const fallbackPayments = [
  { name: "Tiền mặt (COD)", value: 2400000 },
  { name: "Cổng PayOS", value: 3800000 },
  { name: "Ví VNPAY", value: 1250000 },
];

// Dummy fallback staff performance for empty stats
const fallbackStaff = [
  { name: "Trần Văn A", "Đơn hoàn thành": 12, "Doanh thu": 1850000, "Doanh thu (k₫)": 1850 },
  { name: "Nguyễn Thị B", "Đơn hoàn thành": 8, "Doanh thu": 1200000, "Doanh thu (k₫)": 1200 },
  { name: "Lê Hoàng C", "Đơn hoàn thành": 15, "Doanh thu": 2450000, "Doanh thu (k₫)": 2450 },
];

const getTodayHourlyData = (completedOrders: Order[]) => {
  const hours = [8, 10, 12, 14, 16, 18, 20, 22];
  const todayStr = new Date().toDateString();
  const todayOrders = completedOrders.filter(
    (o) => new Date(o.createdAt).toDateString() === todayStr
  );

  return hours.map((hour) => {
    const label = `${hour.toString().padStart(2, "0")}:00`;
    const total = todayOrders
      .filter((o) => {
        const h = new Date(o.createdAt).getHours();
        return h >= hour && h < hour + 2;
      })
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    return { name: label, "Doanh thu": total };
  });
};

const getWeeklyData = (completedOrders: Order[]) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days.map((day) => {
    const dateStr = day.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });
    const dateKey = day.toDateString();
    const total = completedOrders
      .filter((o) => new Date(o.createdAt).toDateString() === dateKey)
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    return { name: dateStr, "Doanh thu": total };
  });
};

const getMonthlyData = (completedOrders: Order[]) => {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days.map((day) => {
    const dateStr = day.toLocaleDateString("vi-VN", { day: "numeric" });
    const dateKey = day.toDateString();
    const total = completedOrders
      .filter((o) => new Date(o.createdAt).toDateString() === dateKey)
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    return { name: dateStr, "Doanh thu": total };
  });
};

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState<ManagerDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Tab state for Operation Analytics
  const [activeReportTab, setActiveReportTab] = useState<"revenue" | "staff">("revenue");
  const [revenueInterval, setRevenueInterval] = useState<"day" | "week" | "month">("week");

  // ── Realtime clock ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Fetch data ────────────────────────────────────────────────────────
  const fetchDashboardData = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [ordersRes, productsRes, metricsRes] = await Promise.all([
        orderService.getManagerOrders({ limit: 100 }),
        productService.getManagerMenu(),
        managerDashboardService.getManagerDashboardMetrics(),
      ]);
      setOrders(ordersRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setMetrics(metricsRes.data ?? null);
    } catch (err) {
      console.error("Failed to fetch manager dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData(true);
  }, []);

  // ── Computed stats ────────────────────────────────────────────────────
  const pendingCount = metrics?.orders.newOrders ?? orders.filter((o) => o.status === "pending").length;

  const processingCount =
    metrics?.orders.inProgress ??
    orders.filter(
      (o) =>
        o.status === "confirmed" ||
        o.status === "processing" ||
        o.status === "ready_for_delivery" ||
        o.status === "shipping",
    ).length;

  const todayCompleted = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "completed" &&
          new Date(o.createdAt).toDateString() === new Date().toDateString(),
      ),
    [orders],
  );

  const todayRevenue = metrics?.revenue.today ?? todayCompleted.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  const weekRevenue = metrics?.revenue.week ?? 0;
  const monthRevenue = metrics?.revenue.month ?? 0;
  const codPending = metrics?.revenue.codPending ?? 0;

  const activeProductsCount = metrics?.menu.activeSellingItems ?? products.filter((p) => p.isAvailable && p.status === "active").length;
  const outOfStockProductsCount = metrics?.menu.outOfStockItems ?? products.filter((p) => !p.isAvailable || p.status !== "active").length;
  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => !p.isAvailable || p.status !== "active").slice(0, 3);
  }, [products]);

  // Order Pipeline Donut data
  const pipelineData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => {
      const status = o.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .map(([status, val]) => ({
        name: STATUS_MAP[status]?.label || status,
        value: val,
        rawStatus: status,
      }))
      .filter((d) => d.value > 0);
  }, [orders]);

  const totalPipeline = orders.length;

  // Payment method split pie data
  const paymentData = useMemo(() => {
    if (!metrics?.revenue.paymentMethodSplit || Object.keys(metrics.revenue.paymentMethodSplit).length === 0) {
      return fallbackPayments;
    }
    return Object.entries(metrics.revenue.paymentMethodSplit)
      .map(([method, val]) => ({
        name: PAYMENT_LABELS[method] || method,
        value: val,
      }))
      .filter((item) => item.value > 0);
  }, [metrics]);
  void paymentData;

  const revenueCycleData = useMemo(() => {
    return [
      { name: "Hôm nay", "Doanh thu": todayRevenue },
      { name: "Tuần này", "Doanh thu": weekRevenue },
      { name: "Tháng này", "Doanh thu": monthRevenue },
      { name: "COD chưa thu", "Doanh thu": codPending },
    ];
  }, [todayRevenue, weekRevenue, monthRevenue, codPending]);

  const REVENUE_CYCLE_COLORS = ["#3b82f6", "#10b981", "#a855f7", "#fbbf24"];
  void revenueCycleData;
  void REVENUE_CYCLE_COLORS;

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === "completed");
  }, [orders]);

  const revenueLineData = useMemo(() => {
    if (revenueInterval === "day") {
      return getTodayHourlyData(completedOrders);
    }
    if (revenueInterval === "month") {
      return getMonthlyData(completedOrders);
    }
    return getWeeklyData(completedOrders);
  }, [revenueInterval, completedOrders]);

  // Staff Performance data
  const staffData = useMemo(() => {
    const performance = metrics?.staffPerformance ?? [];
    if (performance.length === 0) {
      return fallbackStaff;
    }
    return performance.map((s) => ({
      name: s.staffName,
      "Đơn hoàn thành": s.completedOrders,
      "Doanh thu": s.revenue,
      "Doanh thu (k₫)": Math.round(s.revenue / 1000),
    }));
  }, [metrics]);

  const greeting = getGreeting();
  const formattedDate = currentTime.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = currentTime.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const statCards = [
    {
      label: "Đơn chờ xử lý",
      value: pendingCount,
      desc: "Yêu cầu duyệt ngay",
      icon: BellRing,
      iconBg: "bg-amber-50 text-amber-600 border border-amber-100/60 shadow-sm",
      to: "/manager/orders",
    },
    {
      label: "Đang chế biến & giao",
      value: processingCount,
      desc: "Shipper đang hoạt động",
      icon: ChefHat,
      iconBg: "bg-blue-50 text-blue-600 border border-blue-100/60 shadow-sm",
      to: "/manager/orders",
    },
    {
      label: "Doanh thu hôm nay",
      value: formatCurrency(todayRevenue),
      desc: `Tuần: ${formatCurrency(weekRevenue)}`,
      icon: Banknote,
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100/60 shadow-sm",
      to: "/manager/cash",
    },
    {
      label: "COD chờ thu két",
      value: formatCurrency(codPending),
      desc: `${metrics?.orders.averageProcessingMinutes ?? 0}m xử lý trung bình`,
      icon: PackageCheck,
      iconBg: "bg-cyan-50 text-cyan-600 border border-cyan-100/60 shadow-sm",
      to: "/manager/cash",
    },
    {
      label: "Món tạm ngưng / hết",
      value: outOfStockProductsCount,
      desc: `${activeProductsCount} đang mở bán`,
      icon: AlertTriangle,
      iconBg: outOfStockProductsCount > 0 ? "bg-rose-50 text-rose-600 border border-rose-100/60 shadow-sm" : "bg-slate-50 text-slate-500 border border-slate-200/60 shadow-sm",
      to: "/manager/menu",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="p-4 bg-orange-50 rounded-2xl">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
        <p className="text-orange-800 font-bold animate-pulse">
          Đang tải dữ liệu chi nhánh...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-orange-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-2xl shrink-0">
            {greeting.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Tổng quan chi nhánh
            </h1>
            <div className="flex items-center flex-wrap gap-2.5 mt-1.5">
              <span className="text-sm text-slate-500 font-semibold">
                {greeting.text}, <span className="text-orange-600 font-black">{user?.fullName || user?.username || "Manager"}</span>!
              </span>
              <span className="text-sm text-slate-300 font-semibold">•</span>
              <span className="text-xs text-slate-400 font-bold">
                {formattedDate}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100/50">
                <Clock className="w-3.5 h-3.5" />
                {formattedTime}
              </div>
            </div>
          </div>
        </div>
        <button
          disabled={refreshing}
          onClick={() => void fetchDashboardData()}
          className="group flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 text-slate-700 font-black text-xs transition-all border border-slate-200 hover:border-orange-200 disabled:opacity-50 shrink-0 cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới số liệu
        </button>
      </div>

      {/* KPI Cards: Responsive layout fitted on a single row on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="group bg-white border border-orange-100/80 rounded-3xl p-5 flex flex-col justify-between gap-4 hover:border-orange-500/40 hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={() => navigate(stat.to)}
            >
              <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-2xl ${stat.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-black mt-1.5 text-slate-950 tracking-tight">
                  {stat.value}
                </h3>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
                  {stat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Charts & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tabbed Operational Charts Card (col-span-2) */}
        <div className="lg:col-span-2 bg-white border border-orange-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-1.5">
                <Activity className="w-5 h-5 text-orange-500" />
                Báo cáo Vận hành & Doanh số
              </h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Theo dõi doanh số chi nhánh theo chu kỳ hoặc năng suất làm việc của shipper.
              </p>
            </div>

            {/* Chart Switch Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
              <button
                onClick={() => setActiveReportTab("revenue")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeReportTab === "revenue"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Doanh số
              </button>
              <button
                onClick={() => setActiveReportTab("staff")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeReportTab === "staff"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Nhân sự giao
              </button>
            </div>
          </div>

          {/* Render Tab Contents */}
          <div className="flex-1 min-h-[200px] flex items-center">
            {activeReportTab === "revenue" ? (
              /* Tab 1: Revenue Trend Area Chart */
              <div className="w-full space-y-4">
                {/* Interval Toggles */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRevenueInterval("day")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all ${
                      revenueInterval === "day"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={() => setRevenueInterval("week")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all ${
                      revenueInterval === "week"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tuần này
                  </button>
                  <button
                    onClick={() => setRevenueInterval("month")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-all ${
                      revenueInterval === "month"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tháng này
                  </button>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueLineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: "bold" }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10, fontWeight: "bold" }} stroke="#ea580c" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #fed7aa",
                        borderRadius: "16px",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), "Doanh thu"]}
                    />
                    <Bar dataKey="Doanh thu" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Tab 2: Composed Chart of Driver Performance */
              <div className="w-full space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={staffData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: "bold" }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: "bold" }} stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: "bold" }} stroke="#f97316" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                      formatter={(value, name) => [
                        name === "Doanh thu" ? formatCurrency(Number(value)) : `${value} đơn`,
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: "bold" }} />
                    <Bar yAxisId="right" dataKey="Doanh thu" name="Doanh thu" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="left" type="monotone" dataKey="Đơn hoàn thành" name="Đơn hoàn thành" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Pipeline status Chart (col-span-1) */}
        <div className="bg-white border border-orange-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full">
          <div>
            <h4 className="text-base font-black text-slate-950 flex items-center gap-1.5">
              <PieIcon className="w-4.5 h-4.5 text-orange-500" />
              Cơ cấu Đơn hàng
            </h4>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Tỷ lệ phân phối trạng thái các đơn hàng.
            </p>
          </div>

          {totalPipeline > 0 ? (
            <div className="flex-1 flex flex-col justify-around py-4">
              <div className="relative h-[130px] flex items-center justify-center shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pipelineData.map((item, index) => {
                        const statusColor = STATUS_MAP[item.rawStatus]?.color || DONUT_COLORS[index % DONUT_COLORS.length];
                        return <Cell key={`cell-${index}`} fill={statusColor} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #fed7aa",
                        borderRadius: "16px",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                      formatter={(value, name) => [`${Number(value)} đơn`, String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut center metrics */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl font-black text-slate-950 leading-none">
                      {totalPipeline}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Tổng đơn
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Legend split grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 max-h-[110px] overflow-y-auto pr-1 no-scrollbar border-t border-slate-50 pt-3">
                {pipelineData.map((item, i) => {
                  const statusColor = STATUS_MAP[item.rawStatus]?.color || DONUT_COLORS[i % DONUT_COLORS.length];
                  return (
                    <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: statusColor }}
                      />
                      <span className="text-[11px] text-slate-500 font-bold truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-black text-slate-900 ml-auto">
                        {item.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 font-bold flex-1 flex items-center justify-center">
              Chưa đủ dữ liệu vẽ biểu đồ.
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Recent orders (col-span-2) + Quick Shortcuts & Alerts (col-span-1) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Supervision Table */}
        <div className="lg:col-span-2 bg-white border border-orange-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
            <div>
              <h4 className="text-base font-black text-slate-950 flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-orange-500" />
                Đơn hàng cần giám sát
              </h4>
            </div>
            <button
              onClick={() => navigate("/manager/orders")}
              className="flex items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-700 transition-colors"
            >
              Xem tất cả <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-black uppercase text-slate-400 tracking-wider">
                    Đơn hàng
                  </th>
                  <th className="px-6 py-3 text-xs font-black uppercase text-slate-400 tracking-wider">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-xs font-black uppercase text-slate-400 tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-xs font-black uppercase text-slate-400 tracking-wider text-right">
                    Tổng tiền
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((order) => {
                  const customerName =
                    typeof order.cusId === "object" && order.cusId !== null
                      ? order.cusId.fullName || order.cusId.username
                      : "Khách lẻ";
                  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "#94a3b8" };
                  return (
                    <tr
                      key={order._id}
                      onClick={() => navigate(`/manager/orders/${order._id}`)}
                      className="hover:bg-orange-50/15 transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-orange-600 group-hover:underline">
                          #{order.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700 font-bold">
                          {customerName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{
                            backgroundColor: `${statusInfo.color}15`,
                            color: statusInfo.color,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: statusInfo.color }}
                          />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-950">
                          {formatCurrency(Number(order.totalPrice || 0))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <ListOrdered className="w-6 h-6 text-orange-400" />
                </div>
                <p className="text-sm font-bold text-slate-500">
                  Chưa có đơn hàng nào tại chi nhánh
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Operational Warnings & Quick Shortcuts */}
        <div className="space-y-6">
          {/* Out of Stock Warning block */}
          {outOfStockProductsCount > 0 && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-3xl p-5 shadow-sm space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                <h4 className="text-sm font-black">Cảnh báo hết hàng / tạm ngưng</h4>
              </div>
              <div className="space-y-2">
                {outOfStockProducts.map((p) => (
                  <div
                    key={p._id}
                    className="flex justify-between items-center text-xs font-bold text-slate-700 bg-white p-2.5 rounded-xl border border-rose-100/50 hover:border-rose-300 transition-all cursor-pointer"
                    onClick={() => navigate("/manager/menu")}
                  >
                    <span className="truncate max-w-[130px]">{p.name}</span>
                    <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-black shrink-0">
                      {!p.isAvailable ? "Hết hàng" : "Tạm ẩn"}
                    </span>
                  </div>
                ))}
                {outOfStockProductsCount > 3 && (
                  <button
                    onClick={() => navigate("/manager/menu")}
                    className="text-[10px] font-black text-rose-600 hover:text-rose-700 hover:underline block pt-1"
                  >
                    Xem thêm {outOfStockProductsCount - 3} món khác...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick actions panel */}
          <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm">
            <h4 className="text-base font-black text-slate-950 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-orange-500" />
              Phím tắt vận hành
            </h4>
            <div className="grid gap-3">
              <button
                onClick={() => navigate("/manager/orders")}
                className="group flex items-center gap-3 p-3.5 rounded-2xl border border-orange-100 bg-orange-50/25 hover:bg-orange-50/60 hover:border-orange-200 transition-all text-left cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-orange-500 text-white shrink-0">
                  <ListOrdered className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-slate-950 block">
                    Đơn hàng cần duyệt
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
                    Xử lý & thay đổi trạng thái giao nhận
                  </span>
                </div>
              </button>

              <button
                onClick={() => navigate("/manager/menu")}
                className="group flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-orange-200 hover:shadow-md transition-all text-left cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 shrink-0">
                  <UtensilsCrossed className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-slate-950 block">
                    Menu & Kho chi nhánh
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
                    Bật tắt món ăn và xem công thức bếp
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
