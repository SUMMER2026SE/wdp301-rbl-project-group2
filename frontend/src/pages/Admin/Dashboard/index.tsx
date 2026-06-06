import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  RecentOrderItem,
  RevenueChartItem,
} from "@/types/adminDboard";
import {
  formatCurrency,
  getCustomerBars,
  getNewCustomersCount,
  getOrderBars,
  getRecentOrdersForList,
  getRevenueBars,
  getRevenueDataByYear,
  isCompletedOrder,
} from "@/utils/adminDboard";
import {
  getOperatingYears,
  getRevenueComparisonDataByYears,
  getRevenueComparisonSummary,
  type RevenueComparisonChartItem,
} from "@/utils/revenueComparison";

type HoveredRevenueBar = {
  item: RevenueComparisonChartItem;
  value: number;
  year: number;
  label: string;
} | null;

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

  const currentYear = new Date().getFullYear();

  const [baseYear, setBaseYear] = useState(currentYear - 1);
  const [compareYear, setCompareYear] = useState(currentYear);

  const [hoveredRevenueBar, setHoveredRevenueBar] =
    useState<HoveredRevenueBar>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const [ordersResult, customersResult] = await Promise.allSettled([
          OrderService.getAllOrders({ limit: 1000, page: 1 }),
          apiClient.get<CustomerResponse>("/admin/customers", {
            params: { page: 1, limit: 1000 },
          }),
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
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setOrders([]);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const revenueData: RevenueChartItem[] = useMemo(() => {
    return getRevenueDataByYear(orders, compareYear);
  }, [orders, compareYear]);

  const operatingYears = useMemo(() => {
    return getOperatingYears(orders);
  }, [orders]);

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
    return getRevenueComparisonDataByYears(orders, baseYear, compareYear);
  }, [orders, baseYear, compareYear]);

  const revenueComparisonSummary = useMemo(() => {
    return getRevenueComparisonSummary(revenueComparisonData);
  }, [revenueComparisonData]);

  const totalRevenue = useMemo(() => {
    return revenueComparisonSummary.compareTotal;
  }, [revenueComparisonSummary]);

  const totalOrdersCount = useMemo(() => orders.length, [orders]);

  const newCustomersCount = useMemo(() => {
    return getNewCustomersCount(customers);
  }, [customers]);

  const recentOrdersForList: RecentOrderItem[] = useMemo(() => {
    return getRecentOrdersForList(orders);
  }, [orders]);

  const revenueBars = useMemo(() => {
    return getRevenueBars(revenueData);
  }, [revenueData]);

  const orderBars = useMemo(() => {
    return getOrderBars(revenueData);
  }, [revenueData]);

  const customerBars = useMemo(() => {
    return getCustomerBars(customers);
  }, [customers]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-[#e7dbcf] rounded-xl p-6">
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

        <div className="lg:col-span-1 bg-white border border-[#e7dbcf] rounded-xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#e7dbcf] flex items-center justify-between">
            <h4 className="text-lg font-bold text-[#1b140d]">
              Đơn hàng gần đây
            </h4>

            <Link
              to="/admin/orders"
              className="text-xs font-bold text-[#ee8c2b] hover:underline"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            <div className="divide-y divide-[#e7dbcf]">
              {recentOrdersForList.map((order) => (
                <div
                  key={order.code}
                  className="p-4 hover:bg-[#f3ede7] transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-[#1b140d]">
                      {order.code}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.statusClass}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-[#1b140d]">
                        {order.customer}
                      </p>

                      <p className="text-xs text-[#9a734c]">
                        {order.time} • {order.items} món
                      </p>
                    </div>

                    <span className="text-sm font-bold text-[#1b140d]">
                      {order.total}
                    </span>
                  </div>
                </div>
              ))}

              {!loading && recentOrdersForList.length === 0 && (
                <div className="p-6 text-sm text-[#9a734c] text-center">
                  Chưa có đơn hàng nào
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
