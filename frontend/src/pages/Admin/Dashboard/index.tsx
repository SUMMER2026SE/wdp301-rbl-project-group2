import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  PackageSearch,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import apiClient from "@/lib/api-client";
import OrderService, { type Order } from "@/services/order.service";
import type {
  CustomerAPI,
  CustomerResponse,
  RevenueChartItem,
} from "@/types/adminDboard";
import {
  formatCurrency,
  getCustomerBars,
  getNewCustomersCount,
  getOrderBars,
  getRevenueBars,
  getRevenueDataByYear,
} from "@/utils/adminDboard";
import {
  getOperatingYears,
  getRevenueComparisonDataByYears,
  getRevenueComparisonSummary,
  type RevenueComparisonChartItem,
} from "@/utils/revenueComparison";
import { getProductPerformance } from "@/utils/productPerformance";
import { getAdminStores, type IStore } from "@/services/store.service";

type HoveredRevenueBar = {
  item: RevenueComparisonChartItem;
  value: number;
  year: number;
  label: string;
} | null;

const ALL_STORES_ID = "all";

const RevenueComparisonTooltip = ({
  hoveredBar,
}: {
  hoveredBar: HoveredRevenueBar;
}) => {
  if (!hoveredBar || hoveredBar.value <= 0) return null;

  return (
    <div className="rounded-lg border border-[#e7dbcf] bg-white px-3 py-2 shadow-sm text-xs">
      <p className="font-bold text-[#1b140d] mb-1">
        {hoveredBar.item.day} - {hoveredBar.year}
      </p>

      <p className="text-[#ee8c2b] font-semibold">
        {hoveredBar.label}: {formatCurrency(hoveredBar.value)}
      </p>
    </div>
  );
};

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [productPeriodDays, setProductPeriodDays] = useState(30);
  const [stores, setStores] = useState<IStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  const currentYear = new Date().getFullYear();

  const [baseYear, setBaseYear] = useState(currentYear - 1);
  const [compareYear, setCompareYear] = useState(currentYear);

  const [hoveredRevenueBar, setHoveredRevenueBar] =
    useState<HoveredRevenueBar>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const [ordersResult, customersResult, storesResult] =
          await Promise.allSettled([
            OrderService.getAllOrders({ limit: 1000, page: 1 }),
            apiClient.get<CustomerResponse>("/admin/customers", {
              params: { page: 1, limit: 1000 },
            }),
            getAdminStores({ page: 1, limit: 1000, isActive: true }),
          ]);

        if (ordersResult.status === "fulfilled") {
          const ordersRes = ordersResult.value;

          if (ordersRes?.success && Array.isArray(ordersRes.data)) {
            setOrders(ordersRes.data);
          } else {
            setOrders([]);
          }
        } else {
          console.error("Failed to fetch orders:", ordersResult.reason);
          setOrders([]);
        }

        if (customersResult.status === "fulfilled") {
          const payload = customersResult.value.data;
          let rawCustomers: CustomerAPI[] = [];

          if (Array.isArray(payload.data)) {
            rawCustomers = payload.data;
          } else if (
            payload.data &&
            "customers" in payload.data &&
            Array.isArray(payload.data.customers)
          ) {
            rawCustomers = payload.data.customers;
          } else if (
            payload.data &&
            "users" in payload.data &&
            Array.isArray(payload.data.users)
          ) {
            rawCustomers = payload.data.users;
          } else if (Array.isArray(payload.customers)) {
            rawCustomers = payload.customers;
          } else if (Array.isArray(payload.users)) {
            rawCustomers = payload.users;
          }

          setCustomers(rawCustomers);
        } else {
          console.error("Failed to fetch customers:", customersResult.reason);
          setCustomers([]);
        }

        if (storesResult.status === "fulfilled") {
          const storesRes = storesResult.value;

          if (storesRes?.success && Array.isArray(storesRes.data)) {
            setStores(storesRes.data);
          } else {
            setStores([]);
          }
        } else {
          console.error("Failed to fetch stores:", storesResult.reason);
          setStores([]);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setOrders([]);
        setCustomers([]);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getOrderStoreId = (order: Order) => {
    const store = order.storeId;

    if (typeof store === "object" && store) {
      return store._id;
    }

    if (typeof store === "string") {
      return store;
    }

    return "";
  };

  const scopedOrders = useMemo(() => {
    if (selectedStoreId === ALL_STORES_ID) return orders;

    return orders.filter((order) => getOrderStoreId(order) === selectedStoreId);
  }, [orders, selectedStoreId]);

  const revenueData: RevenueChartItem[] = useMemo(() => {
    return getRevenueDataByYear(scopedOrders, compareYear);
  }, [scopedOrders, compareYear]);

  const operatingYears = useMemo(() => {
    return getOperatingYears(scopedOrders);
  }, [scopedOrders]);

  useEffect(() => {
    if (operatingYears.length === 0) return;

    const defaultCompareYear = operatingYears[0];
    const defaultBaseYear = operatingYears[1] ?? operatingYears[0];

    setCompareYear((prev) =>
      operatingYears.includes(prev) ? prev : defaultCompareYear,
    );

    setBaseYear((prev) => {
      if (!operatingYears.includes(prev)) {
        return defaultBaseYear;
      }

      if (prev === compareYear) {
        return defaultBaseYear;
      }

      return prev;
    });
  }, [operatingYears, compareYear]);

  const revenueComparisonData = useMemo(() => {
    return getRevenueComparisonDataByYears(scopedOrders, baseYear, compareYear);
  }, [scopedOrders, baseYear, compareYear]);

  const revenueComparisonSummary = useMemo(() => {
    return getRevenueComparisonSummary(revenueComparisonData);
  }, [revenueComparisonData]);

  const totalRevenue = useMemo(() => {
    return revenueComparisonSummary.compareTotal;
  }, [revenueComparisonSummary]);

  const totalOrdersCount = useMemo(() => scopedOrders.length, [scopedOrders]);

  const newCustomersCount = useMemo(() => {
    return getNewCustomersCount(customers);
  }, [customers]);

  const revenueBars = useMemo(() => {
    return getRevenueBars(revenueData);
  }, [revenueData]);

  const orderBars = useMemo(() => {
    return getOrderBars(revenueData);
  }, [revenueData]);

  const customerBars = useMemo(() => {
    return getCustomerBars(customers);
  }, [customers]);

  const storeOptions = useMemo(() => {
    return stores
      .map((store) => ({
        id: store._id,
        name: store.name || `Cửa hàng ${store._id.slice(-4).toUpperCase()}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [stores]);

  useEffect(() => {
    if (selectedStoreId === ALL_STORES_ID) return;

    const stillExists = storeOptions.some(
      (store) => store.id === selectedStoreId,
    );

    if (!stillExists) {
      setSelectedStoreId(ALL_STORES_ID);
    }
  }, [selectedStoreId, storeOptions]);

  const performanceAnalysis = useMemo(
    () =>
      getProductPerformance(orders, productPeriodDays, {
        stores,
        storeId: selectedStoreId,
      }),
    [orders, productPeriodDays, stores, selectedStoreId],
  );

  const storePerformance = useMemo(
    () => performanceAnalysis.storePerformance,
    [performanceAnalysis],
  );

  const productPerformance = useMemo(
    () => performanceAnalysis.productPerformance.slice(0, 5),
    [performanceAnalysis],
  );

  const campaignSuggestionChartData = useMemo(
    () =>
      productPerformance.map((product, index) => ({
        rank: index + 1,
        productId: product.productId,
        name: product.productName,
        label: `#${index + 1} ${product.productName}`,
        revenue: product.revenue,
      })),
    [productPerformance],
  );

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#9a734c]">
            Tình hình nhà hàng của bạn hôm nay.
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e7dbcf] rounded-lg">
            <span className="material-symbols-outlined text-lg">
              calendar_today
            </span>

            <select
              value={baseYear}
              onChange={(e) => setBaseYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-[#1b140d] outline-none"
            >
              {operatingYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <span className="text-[#9a734c] font-bold">vs</span>

            <select
              value={compareYear}
              onChange={(e) => setCompareYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-[#1b140d] outline-none"
            >
              {operatingYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e7dbcf] rounded-lg">
            <Store className="h-4 w-4 text-[#9a734c]" />

            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#1b140d] outline-none"
            >
              <option value={ALL_STORES_ID}>Tất cả cửa hàng</option>

              {storeOptions.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[#ee8c2b] text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-[#ee8c2b]/10 rounded-lg">
              <span className="material-symbols-outlined text-[#ee8c2b]">
                payments
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-[#9a734c]">
              Doanh thu năm {compareYear}
            </p>
            <h3 className="text-3xl font-bold mt-1 text-[#1b140d]">
              {loading ? "..." : formatCurrency(totalRevenue)}
            </h3>
          </div>

          <div className="h-12 w-full flex items-end gap-1">
            {revenueBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-[#ee8c2b]/20"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="material-symbols-outlined text-blue-600">
                receipt_long
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-[#9a734c]">Tổng đơn hàng</p>
            <h3 className="text-3xl font-bold mt-1 text-[#1b140d]">
              {loading ? "..." : totalOrdersCount}
            </h3>
          </div>

          <div className="h-12 w-full flex items-end gap-1">
            {orderBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-blue-200"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="material-symbols-outlined text-purple-600">
                person_add
              </span>
            </div>

            <span className="text-[#9a734c] text-sm font-bold flex items-center">
              Tháng này
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-[#9a734c]">Khách hàng mới</p>
            <h3 className="text-3xl font-bold mt-1 text-[#1b140d]">
              {loading ? "..." : newCustomersCount}
            </h3>
          </div>

          <div className="h-12 w-full flex items-end gap-1">
            {customerBars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-purple-200"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white border border-[#e7dbcf] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-[#1b140d]">
                So sánh doanh thu theo năm
              </h4>

              <p className="text-sm text-[#9a734c]">
                So sánh doanh thu từng tháng giữa {baseYear} và {compareYear}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <div className="px-3 py-2 rounded-lg bg-[#f3ede7] text-[#1b140d]">
              <span className="font-medium text-[#9a734c]">
                Doanh thu {baseYear}:{" "}
              </span>
              <span className="font-bold">
                {formatCurrency(revenueComparisonSummary.baseTotal)}
              </span>
            </div>

            <div className="px-3 py-2 rounded-lg bg-[#f3ede7] text-[#1b140d]">
              <span className="font-medium text-[#9a734c]">
                Doanh thu {compareYear}:{" "}
              </span>
              <span className="font-bold">
                {formatCurrency(revenueComparisonSummary.compareTotal)}
              </span>
            </div>

            <div
              className={`px-3 py-2 rounded-lg font-bold ${
                revenueComparisonSummary.growthPercent === null
                  ? "bg-gray-100 text-gray-500"
                  : revenueComparisonSummary.growthPercent >= 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {revenueComparisonSummary.growthPercent === null
                ? `Chưa có dữ liệu năm ${baseYear}`
                : `${
                    revenueComparisonSummary.growthPercent >= 0 ? "+" : ""
                  }${revenueComparisonSummary.growthPercent.toFixed(
                    1,
                  )}% so với năm ${baseYear}`}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7dbcf" />

              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#9a734c" }}
                stroke="#e7dbcf"
              />

              <YAxis
                tick={{ fontSize: 12, fill: "#9a734c" }}
                stroke="#e7dbcf"
                tickFormatter={(value) => {
                  const num = Number(value);

                  if (num >= 1000000) {
                    return `${(num / 1000000).toFixed(1)}M`;
                  }

                  if (num >= 1000) {
                    return `${(num / 1000).toFixed(0)}K`;
                  }

                  return `${num}`;
                }}
              />

              <Tooltip
                shared={false}
                cursor={false}
                content={() => (
                  <RevenueComparisonTooltip hoveredBar={hoveredRevenueBar} />
                )}
              />

              <Legend />

              <Bar
                dataKey="baseYearRevenue"
                name={`Doanh thu ${baseYear}`}
                fill="#e7dbcf"
                radius={[6, 6, 0, 0]}
                onMouseEnter={(data: any) => {
                  const item = data?.payload as RevenueComparisonChartItem;
                  const value = Number(item?.baseYearRevenue || 0);

                  setHoveredRevenueBar({
                    item,
                    value,
                    year: item.baseYear,
                    label: `Doanh thu ${item.baseYear}`,
                  });
                }}
                onMouseLeave={() => setHoveredRevenueBar(null)}
              />

              <Bar
                dataKey="compareYearRevenue"
                name={`Doanh thu ${compareYear}`}
                fill="#ee8c2b"
                radius={[6, 6, 0, 0]}
                onMouseEnter={(data: any) => {
                  const item = data?.payload as RevenueComparisonChartItem;
                  const value = Number(item?.compareYearRevenue || 0);

                  setHoveredRevenueBar({
                    item,
                    value,
                    year: item.compareYear,
                    label: `Doanh thu ${item.compareYear}`,
                  });
                }}
                onMouseLeave={() => setHoveredRevenueBar(null)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      <div className="bg-white border border-[#e7dbcf] rounded-xl overflow-hidden">
        <div className="border-b border-[#e7dbcf] p-5">
          <div>
            <div className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-orange-600" />
              <h4 className="text-lg font-bold text-[#1b140d]">
                {selectedStoreId === ALL_STORES_ID
                  ? "Món bán chạy"
                  : "Bán chạy theo cửa hàng"}
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setProductPeriodDays(days)}
                aria-pressed={productPeriodDays === days}
                className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors ${
                  productPeriodDays === days
                    ? "bg-orange-600 text-white"
                    : "bg-[#f3ede7] text-[#9a734c] hover:bg-[#e7dbcf]"
                }`}
              >
                {days} ngày
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center text-center text-sm text-[#9a734c]">
            Đang phân tích dữ liệu bán hàng...
          </div>
        ) : campaignSuggestionChartData.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center text-center">
            <PackageSearch className="h-9 w-9 text-[#e7dbcf]" />
            <p className="mt-3 font-bold text-[#1b140d]">
              Chưa có món đủ dữ liệu
            </p>
          </div>
        ) : (
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={campaignSuggestionChartData}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3ede7" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#9a734c" }}
                  tickFormatter={(value) => formatCurrency(Number(value))}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={220}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#1b140d", fontWeight: 700 }}
                  tickFormatter={(value) =>
                    String(value).length > 30
                      ? `${String(value).slice(0, 30)}...`
                      : String(value)
                  }
                />
                <Tooltip
                  cursor={{ fill: "#fcfaf8" }}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Doanh thu",
                  ]}
                  labelFormatter={(value) => String(value)}
                />
                <Bar
                  dataKey="revenue"
                  name="Doanh thu"
                  fill="#ee8c2b"
                  radius={[0, 8, 8, 0]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#e7dbcf] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e7dbcf] p-6">
          <div>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-orange-600" />
              <h4 className="text-lg font-bold text-[#1b140d]">
                Hiệu suất từng cửa hàng
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setProductPeriodDays(days)}
                aria-pressed={productPeriodDays === days}
                className={`min-h-10 rounded-lg px-4 text-xs font-bold transition-colors ${
                  productPeriodDays === days
                    ? "bg-orange-600 text-white"
                    : "bg-[#f3ede7] text-[#9a734c] hover:bg-[#e7dbcf]"
                }`}
              >
                {days} ngày
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[#9a734c]">
            Đang phân tích hiệu suất cửa hàng...
          </div>
        ) : storePerformance.length === 0 ? (
          <div className="p-10 text-center">
            <Store className="mx-auto h-9 w-9 text-[#e7dbcf]" />
            <p className="mt-3 font-bold text-[#1b140d]">
              Chưa có dữ liệu cửa hàng trong kỳ này
            </p>
            <p className="mt-1 text-sm text-[#9a734c]">
              Báo cáo sẽ xuất hiện khi có đơn hoàn thành trong{" "}
              {productPeriodDays} ngày gần nhất.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#fcfaf8] text-xs uppercase tracking-wide text-[#9a734c]">
                <tr>
                  <th className="px-6 py-4 font-bold">Cửa hàng</th>
                  <th className="px-4 py-4 font-bold">Doanh thu</th>
                  <th className="px-4 py-4 font-bold">Số đơn</th>
                  <th className="px-4 py-4 font-bold">So với kỳ trước</th>
                  <th className="px-4 py-4 font-bold">Món bán chạy</th>
                  <th className="px-6 py-4 font-bold">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e7dbcf]">
                {storePerformance.map((store) => {
                  const isGrowing =
                    store.growthPercent !== null && store.growthPercent >= 0;

                  return (
                    <tr key={store.storeId} className="hover:bg-[#fcfaf8]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                            <Store className="h-4 w-4" />
                          </span>

                          <div>
                            <p className="font-bold text-[#1b140d]">
                              {store.storeName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-[#1b140d]">
                        {formatCurrency(store.revenue)}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-[#1b140d]">
                        {store.orderCount.toLocaleString("vi-VN")}
                      </td>

                      <td className="px-4 py-4">
                        {store.growthPercent === null ? (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            Mới trong kỳ này
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                              isGrowing
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {isGrowing ? (
                              <TrendingUp className="h-3.5 w-3.5" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            {isGrowing ? "+" : ""}
                            {store.growthPercent.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-[#1b140d]">
                        {store.topProductName}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            store.status === "good"
                              ? "bg-emerald-50 text-emerald-700"
                              : store.status === "stable"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {store.status === "good" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {store.statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
