import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Truck,
  User,
  Calendar,
  DollarSign,
  Check,
  ChevronRight,
  Info,
  X,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import managerDashboardService, {
  type ManagerCashOverview,
  type ManagerCashOrder,
} from "@/services/manager-dashboard.service";

const formatCurrency = (value: number) => value.toLocaleString("vi-VN") + "₫";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getCustomerName = (customer: unknown) => {
  if (customer && typeof customer === "object") {
    const data = customer as { fullName?: string; username?: string; email?: string };
    return data.fullName || data.username || data.email || "Khách lẻ";
  }
  return "Khách lẻ";
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const ManagerCash = () => {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [cash, setCash] = useState<ManagerCashOverview | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pendingOrders = cash?.pending.orders ?? [];
  const selectedTotal = useMemo(
    () =>
      pendingOrders
        .filter((order) => selectedOrderIds.includes(order._id))
        .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
    [pendingOrders, selectedOrderIds],
  );

  const fetchCashOverview = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const response = await managerDashboardService.getManagerCashOverview({ date: selectedDate });
      setCash(response.data);
      setSelectedOrderIds([]);
    } catch (error) {
      console.error("Failed to fetch manager cash overview:", error);
      toast.error("Không tải được dữ liệu COD chi nhánh");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCashOverview(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCashOverview]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

  const toggleAllPending = () => {
    setSelectedOrderIds((current) =>
      current.length === pendingOrders.length
        ? []
        : pendingOrders.map((order) => order._id),
    );
  };

  const confirmSelected = async () => {
    if (selectedOrderIds.length === 0) return;

    setSubmitting(true);
    const toastId = toast.loading("Đang xác nhận thu tiền COD...");
    try {
      const response = await managerDashboardService.confirmManagerCodCollection(
        selectedOrderIds,
      );
      toast.success(
        `Đã xác nhận thu ${formatCurrency(response.data.totalCollected)} thành công!`,
        { id: toastId },
      );
      await fetchCashOverview();
    } catch (error) {
      console.error("Failed to confirm COD collection:", error);
      toast.error("Không xác nhận được thu COD", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Find max daily amount for relative bar calculations
  const maxDailyAmount = useMemo(() => {
    const daily = cash?.dailyTotals ?? [];
    if (daily.length === 0) return 1;
    return Math.max(...daily.map((d) => d.total), 1);
  }, [cash]);

  // Find max driver amount for relative bar calculations
  const maxDriverAmount = useMemo(() => {
    const drivers = cash?.byDriver ?? [];
    if (drivers.length === 0) return 1;
    return Math.max(...drivers.map((d) => d.pendingTotal + d.collectedTotal), 1);
  }, [cash]);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white border border-orange-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 flex items-center gap-1.5">
            Bàn giao ngân quỹ COD
          </span>
          <h1 className="text-2xl font-black text-slate-950 mt-1">COD chi nhánh</h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Xác nhận số tiền mặt (COD) thu được từ shipper sau khi hoàn tất giao hàng.
          </p>
        </div>
        <button
          onClick={() => void fetchCashOverview()}
          disabled={loading || refreshing}
          className="h-11 px-5 rounded-2xl bg-orange-50 hover:bg-orange-100/80 active:bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.03]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Đang làm mới..." : "Làm mới"}
        </button>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Ngày kiểm tra COD</p>
          <p className="mt-1 text-sm font-bold text-slate-700">Xem đơn COD hoàn thành theo ngày vận hành của chi nhánh.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setSelectedDate(toDateInputValue(new Date()))} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 hover:border-orange-300 hover:text-orange-600">Hôm nay</button>
          <button type="button" onClick={() => { const date = new Date(); date.setDate(date.getDate() - 1); setSelectedDate(toDateInputValue(date)); }} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 hover:border-orange-300 hover:text-orange-600">Hôm qua</button>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none focus:border-orange-400" />
        </div>
      </div>

      {cash?.shouldWarnCloseout && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
          <p className="text-sm font-black">Còn {cash.pending.count} đơn COD chưa đối soát trước giờ đóng cửa {cash.closeTime}.</p>
          <p className="mt-1 text-xs font-semibold">Vui lòng thu đủ tiền mặt từ nhân viên giao trước khi kết thúc ngày vận hành.</p>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="COD chờ thu"
          value={loading ? "—" : formatCurrency(cash?.pending.total ?? 0)}
          desc={`${cash?.pending.count ?? 0} đơn hàng đang giữ tiền mặt`}
          icon={<Banknote className="w-5 h-5" />}
          loading={loading}
        />
        <SummaryCard
          title="COD đã thu"
          value={loading ? "—" : formatCurrency(cash?.collected.total ?? 0)}
          desc={`${cash?.collected.count ?? 0} đơn hàng đã nộp két`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          loading={loading}
          iconColor="emerald"
        />
        {/* Dynamic highlighted selector card */}
        <div
          className={`rounded-3xl p-5 shadow-sm transition-all duration-300 border ${selectedOrderIds.length > 0
              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400/20 shadow-orange-500/25"
              : "bg-white border-orange-100 text-slate-900"
            }`}
        >
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-colors ${selectedOrderIds.length > 0 ? "bg-white/20 text-white" : "bg-orange-50 text-orange-600"
              }`}
          >
            <Truck className="w-5 h-5" />
          </div>
          <p
            className={`text-xs font-black uppercase tracking-wider ${selectedOrderIds.length > 0 ? "text-orange-100" : "text-slate-400"
              }`}
          >
            Đang chọn đối soát
          </p>
          <p className="text-2xl font-black mt-1">
            {loading ? "—" : formatCurrency(selectedTotal)}
          </p>
          <p
            className={`text-xs font-semibold mt-1 ${selectedOrderIds.length > 0 ? "text-orange-100/90" : "text-slate-500"
              }`}
          >
            {selectedOrderIds.length} đơn hàng đã chọn
          </p>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Pending Table */}
        <div className="lg:col-span-2 bg-white border border-orange-100 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/30">
            <div>
              <h2 className="font-black text-slate-950">Đơn COD chờ đối soát</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Các đơn giao thành công chờ bạn xác nhận thu tiền từ shipper.
              </p>
            </div>
            {!loading && pendingOrders.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={toggleAllPending}
                  className="px-4 h-10 rounded-xl border border-slate-200 bg-white text-xs font-black hover:bg-slate-50 active:scale-95 transition-all"
                >
                  {selectedOrderIds.length === pendingOrders.length
                    ? "Bỏ chọn hết"
                    : "Chọn tất cả"}
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="p-5 flex items-center gap-4 animate-pulse">
                  <div className="w-4 h-4 bg-slate-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-24" />
                    <div className="h-3 bg-slate-200 rounded w-40" />
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-16" />
                    <div className="h-3 bg-slate-200 rounded w-20" />
                  </div>
                </div>
              ))
            ) : pendingOrders.length === 0 ? (
              <div className="p-16 text-center text-sm font-bold text-slate-400 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                Không có đơn COD chờ thu.
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  Mọi giao dịch tiền mặt tại chi nhánh đã được đối soát xong!
                </p>
              </div>
            ) : (
              pendingOrders.map((order) => (
                <CashOrderRow
                  key={order._id}
                  order={order}
                  checked={selectedOrderIds.includes(order._id)}
                  onToggle={() => toggleOrder(order._id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Side: Driver Breakdown & Daily breakdown */}
        <div className="space-y-6">
          {/* Driver Summary */}
          <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm">
            <h2 className="font-black text-slate-950 mb-4 flex items-center gap-2">
              <Truck className="w-4.5 h-4.5 text-orange-500" />
              Theo nhân viên giao
            </h2>
            <div className="space-y-3.5">
              {loading ? (
                [1, 2].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-2 bg-slate-200 rounded w-full" />
                  </div>
                ))
              ) : (cash?.byDriver ?? []).length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 text-center py-4">
                  Chưa có thống kê giao hàng.
                </p>
              ) : (
                (cash?.byDriver ?? []).map((driver) => {
                  const total = driver.pendingTotal + driver.collectedTotal;
                  const percentPending = total > 0 ? (driver.pendingTotal / total) * 100 : 0;

                  return (
                    <div key={driver.driverId} className="rounded-2xl bg-slate-50/50 border border-slate-100 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center">
                            {driver.driverName.charAt(0)}
                          </div>
                          <p className="font-black text-sm text-slate-900 truncate max-w-40">
                            {driver.driverName}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                          {driver.pendingOrders + driver.collectedOrders} đơn
                        </span>
                      </div>

                      {/* Info metrics */}
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Chờ thu: {formatCurrency(driver.pendingTotal)}</span>
                        <span className="text-slate-900">Đã thu: {formatCurrency(driver.collectedTotal)}</span>
                      </div>

                      {/* Mini visual split progress bar */}
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${percentPending}%` }}
                          className="bg-amber-500 h-full"
                          title="Tỷ lệ COD chờ thu"
                        />
                        <div
                          style={{ width: `${100 - percentPending}%` }}
                          className="bg-emerald-500 h-full"
                          title="Tỷ lệ COD đã thu"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Daily Summary */}
          <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm">
            <h2 className="font-black text-slate-950 mb-4 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-orange-500" />
              Doanh thu COD theo ngày
            </h2>
            <div className="space-y-4">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-1">
                    <div className="h-3 bg-slate-200 rounded w-1/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                  </div>
                ))
              ) : (cash?.dailyTotals ?? []).length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 text-center py-4">
                  Chưa ghi nhận doanh thu COD nào.
                </p>
              ) : (
                (cash?.dailyTotals ?? []).slice(0, 7).map((day) => {
                  const widthPercent = (day.total / maxDailyAmount) * 100;
                  return (
                    <div key={day.date} className={`space-y-1 rounded-2xl p-2 ${day.date === cash?.selectedDate ? "bg-orange-50" : ""}`}>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">{formatDate(day.date)}</span>
                        <span className="text-slate-950">{formatCurrency(day.total)}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${widthPercent}%` }}
                          className="bg-orange-500 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar Drawer */}
      {!loading && selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-12 duration-300">
          <div className="bg-slate-950/95 border border-slate-800 text-white rounded-[2rem] p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center animate-bounce">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black">
                  Đã chọn {selectedOrderIds.length} đơn hàng COD
                </p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Tổng tiền mặt:{" "}
                  <span className="text-orange-400 font-black">
                    {formatCurrency(selectedTotal)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedOrderIds([])}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy chọn
              </button>
              <button
                disabled={submitting}
                onClick={() => void confirmSelected()}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-xs text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                {submitting ? "Đang xác nhận..." : "Xác nhận đã thu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Summary Card Sub-component
const SummaryCard = ({
  title,
  value,
  desc,
  icon,
  loading,
  iconColor = "orange",
}: {
  title: string;
  value: string;
  desc: string;
  icon: ReactNode;
  loading: boolean;
  iconColor?: "orange" | "emerald";
}) => {
  const bgStyles = iconColor === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600";
  return (
    <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className={`w-11 h-11 rounded-2xl ${bgStyles} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 shadow-inner`}>
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p>
      <p className="text-2xl font-black text-slate-950 mt-1">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1">{desc}</p>
    </div>
  );
};

// Cash Order Row Sub-component
const CashOrderRow = ({
  order,
  checked,
  onToggle,
}: {
  order: ManagerCashOrder;
  checked: boolean;
  onToggle: () => void;
}) => (
  <label
    className={`flex items-center gap-4 p-5 hover:bg-orange-50/20 cursor-pointer transition-all duration-200 select-none ${checked ? "bg-orange-50/15" : "bg-transparent"
      }`}
  >
    {/* Custom Checkbox */}
    <div className="relative flex items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="sr-only"
      />
      <div
        className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all ${checked
            ? "border-orange-500 bg-orange-500 text-white shadow-sm"
            : "border-slate-300 bg-white hover:border-orange-300"
          }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[4.5]" />}
      </div>
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-black text-orange-600 text-sm hover:underline">
          #{order.code}
        </p>
      </div>
      <p className="text-xs font-semibold text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-bold text-slate-700">{getCustomerName(order.customer)}</span>
        <span className="text-slate-300">•</span>
        <span>Hoàn tất {formatDate(order.completedAt)}</span>
      </p>
    </div>

    <div className="text-right">
      <p className="font-black text-slate-950 text-sm">
        {formatCurrency(Number(order.totalPrice || 0))}
      </p>
      <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center justify-end gap-1">
        <User className="w-3 h-3 text-slate-300" />
        {order.deliveryInfo?.driverName || "Chưa gán shipper"}
      </p>
    </div>
  </label>
);

export default ManagerCash;
