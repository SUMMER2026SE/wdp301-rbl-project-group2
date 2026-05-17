import type { Order } from "@/services/order.service";
import type {
  CustomerAPI,
  RecentOrderItem,
  RevenueChartItem,
  RevenueFilterType,
} from "@/types/adminDboard";

export const VI_DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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

export const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const getRevenueDataByFilter = (
  orders: Order[],
  filter: RevenueFilterType,
): RevenueChartItem[] => {
  const now = new Date();
  const result: RevenueChartItem[] = [];

  if (filter === "week") {
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);

      result.push({
        day: VI_DAY_NAMES[date.getDay()],
        revenue: 0,
        orders: 0,
        fullDate: formatDateKey(date),
      });
    }

    const map = new Map(result.map((item) => [item.fullDate, item]));

    orders.forEach((order) => {
      if (!isCompletedOrder(order.status)) return;

      const createdAt = new Date(order.createdAt);
      const key = formatDateKey(createdAt);
      const target = map.get(key);

      if (target) {
        target.revenue += Number(order.total_price || 0);
        target.orders += 1;
      }
    });

    return result;
  }

  if (filter === "month") {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const totalDays = getDaysInMonth(currentMonth, currentYear);

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day);

      result.push({
        day: `${day}`,
        revenue: 0,
        orders: 0,
        fullDate: formatDateKey(date),
      });
    }

    orders.forEach((order) => {
      if (!isCompletedOrder(order.status)) return;

      const createdAt = new Date(order.createdAt);
      if (
        createdAt.getMonth() !== currentMonth ||
        createdAt.getFullYear() !== currentYear
      ) {
        return;
      }

      const dayIndex = createdAt.getDate() - 1;
      if (result[dayIndex]) {
        result[dayIndex].revenue += Number(order.total_price || 0);
        result[dayIndex].orders += 1;
      }
    });

    return result;
  }

  const currentYear = now.getFullYear();
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

  for (let month = 0; month < 12; month++) {
    result.push({
      day: monthLabels[month],
      revenue: 0,
      orders: 0,
      fullDate: `${currentYear}-${String(month + 1).padStart(2, "0")}`,
    });
  }

  orders.forEach((order) => {
    if (!isCompletedOrder(order.status)) return;

    const createdAt = new Date(order.createdAt);
    if (createdAt.getFullYear() !== currentYear) return;

    const monthIndex = createdAt.getMonth();
    result[monthIndex].revenue += Number(order.total_price || 0);
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

export const getRevenueFilterLabel = (filter: RevenueFilterType) => {
  switch (filter) {
    case "week":
      return "7 ngày gần nhất";
    case "month":
      return "Tháng hiện tại";
    case "year":
      return "Năm hiện tại";
    default:
      return "";
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
        typeof o.user_id === "object" && o.user_id?.username
          ? o.user_id.username
          : "Ẩn danh",
      time: formatShortDate(o.createdAt),
      items: Array.isArray(o.items) ? o.items.length : 0,
      total: formatCurrency(Number(o.total_price || 0)),
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
    if (isNaN(d.getTime())) return false;

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
  const dailyOrders = revenueData.map((item) => item.orders);
  const maxOrders = Math.max(...dailyOrders, 1);

  return dailyOrders.map((count) =>
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
    if (isNaN(parsed.getTime())) return;

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
