import type { Order } from "@/services/order.service";
import type {
  CustomerAPI,
  RecentOrderItem,
  RevenueChartItem,
} from "@/types/adminDboard";

export const isCompletedOrder = (status?: string) =>
  String(status).trim().toLowerCase() === "completed";

export const formatCurrency = (value: number) => {
  return `${value.toLocaleString("vi-VN")}₫`;
};

export const formatShortDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("vi-VN");
};

export const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getRevenueDataByYear = (
  orders: Order[],
  year = new Date().getFullYear(),
): RevenueChartItem[] => {
  const monthLabels = [
    "T1",
    "T2",
    "T3",
    "T4",
    "T5",
    "T6",
    "T7",
    "T8",
    "T9",
    "T10",
    "T11",
    "T12",
  ];

  const result: RevenueChartItem[] = monthLabels.map((label, index) => ({
    day: label,
    revenue: 0,
    orders: 0,
    fullDate: `${year}-${String(index + 1).padStart(2, "0")}`,
  }));

  orders.forEach((order) => {
    if (!isCompletedOrder(order.status)) return;

    const createdAt = new Date(order.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    if (createdAt.getFullYear() !== year) return;

    const monthIndex = createdAt.getMonth();

    result[monthIndex].revenue += Number(order.totalPrice || 0);
    result[monthIndex].orders += 1;
  });

  return result;
};

export const getStatusClass = (status: string) => {
  const normalized = status?.toLowerCase?.() || "";

  if (normalized === "completed") {
    return "bg-green-100 text-green-700";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-red-100 text-red-600";
  }

  if (normalized === "pending") {
    return "bg-gray-100 text-gray-500";
  }

  return "bg-[#ee8c2b]/20 text-[#ee8c2b]";
};

export const getStatusLabel = (status: string) => {
  const normalized = status?.toLowerCase?.() || "";

  switch (normalized) {
    case "completed":
      return "GIAO THÀNH CÔNG";
    case "pending":
      return "CHỜ XỬ LÝ";
    case "confirmed":
      return "ĐÃ XÁC NHẬN";
    case "preparing":
      return "ĐANG CHUẨN BỊ";
    case "cooking":
      return "ĐANG CHẾ BIẾN";
    case "delivering":
      return "ĐANG GIAO";
    case "cancelled":
    case "canceled":
      return "ĐÃ HỦY";
    default:
      return status?.toUpperCase?.() || "UNKNOWN";
  }
};

export const getRecentOrdersForList = (orders: Order[]): RecentOrderItem[] => {
  return [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5)
    .map((o) => ({
      code: o.code || "N/A",
      customer:
        typeof o.cusId === "object"
          ? o.cusId.fullName || o.cusId.username || "Ẩn danh"
          : "Ẩn danh",
      time: formatShortDate(o.createdAt),
      items: Array.isArray(o.items) ? o.items.length : 0,
      total: formatCurrency(Number(o.totalPrice || 0)),
      status: getStatusLabel(o.status),
      statusClass: getStatusClass(o.status),
    }));
};

export const getNewCustomersCount = (customers: CustomerAPI[]) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return customers.filter((c) => {
    const rawDate = c.createdAt || c.joinDate;
    if (!rawDate) return false;

    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return false;

    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
};

export const getRevenueBars = (revenueData: RevenueChartItem[]) => {
  const maxRevenue = Math.max(...revenueData.map((item) => item.revenue), 1);

  return revenueData.map((item) => {
    const percent = Math.max((item.revenue / maxRevenue) * 100, 12);
    return Math.round(percent);
  });
};

export const getOrderBars = (revenueData: RevenueChartItem[]) => {
  const monthlyOrders = revenueData.map((item) => item.orders);
  const maxOrders = Math.max(...monthlyOrders, 1);

  return monthlyOrders.map((count) =>
    Math.max(Math.round((count / maxOrders) * 100), 12),
  );
};

export const getCustomerBars = (customers: CustomerAPI[]) => {
  const today = new Date();

  const recent7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(today.getDate() - (6 - index));

    return {
      key: formatDateKey(date),
      count: 0,
    };
  });

  const customerMap = new Map(recent7Days.map((item) => [item.key, item]));

  customers.forEach((customer) => {
    const rawDate = customer.createdAt || customer.joinDate;
    if (!rawDate) return;

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return;

    const key = formatDateKey(parsed);
    const target = customerMap.get(key);

    if (target) target.count += 1;
  });

  const counts = recent7Days.map((item) => item.count);
  const maxCount = Math.max(...counts, 1);

  return counts.map((count) =>
    Math.max(Math.round((count / maxCount) * 100), 12),
  );
};
