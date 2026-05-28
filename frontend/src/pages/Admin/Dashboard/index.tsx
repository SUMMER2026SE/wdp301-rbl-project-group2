import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
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
  RevenueFilterType,
} from "@/types/adminDboard";
import {
  formatCurrency,
  getCustomerBars,
  getNewCustomersCount,
  getOrderBars,
  getRecentOrdersForList,
  getRevenueBars,
  getRevenueDataByFilter,
  getRevenueFilterLabel,
  isCompletedOrder,
} from "@/utils/adminDboard";

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueFilter, setRevenueFilter] = useState<RevenueFilterType>("week");

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

          console.log("Dashboard customers:", rawCustomers);
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
    return getRevenueDataByFilter(orders, revenueFilter);
  }, [orders, revenueFilter]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => isCompletedOrder(o.status))
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  }, [orders]);

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

        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e7dbcf] rounded-lg text-sm font-bold text-[#1b140d] hover:bg-[#f3ede7]"
          >
            <span className="material-symbols-outlined text-lg">
              calendar_today
            </span>
            7 ngày gần nhất
          </button>

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
            <p className="text-sm font-medium text-[#9a734c]">Doanh thu tổng</p>
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
                Doanh thu theo thời gian
              </h4>
              <p className="text-sm text-[#9a734c]">
                {getRevenueFilterLabel(revenueFilter)}
              </p>
            </div>

            <select
              value={revenueFilter}
              onChange={(e) =>
                setRevenueFilter(e.target.value as RevenueFilterType)
              }
              className="bg-[#f3ede7] border-none text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#ee8c2b] text-[#1b140d]"
            >
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
            </select>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
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
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                  return `${num}`;
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e7dbcf",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: any) => {
                  if (value === undefined || value === null) return ["", ""];
                  return [formatCurrency(Number(value)), "Doanh thu"];
                }}
                labelFormatter={(_, payload) => {
                  if (!payload || payload.length === 0) return "";
                  const item = payload[0]?.payload as RevenueChartItem;
                  return `${item.day} (${item.fullDate})`;
                }}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="#ee8c2b"
                strokeWidth={3}
                dot={{ fill: "#ee8c2b", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
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
