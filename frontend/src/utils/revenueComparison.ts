import type { Order } from "@/services/order.service";
import { isCompletedOrder } from "@/utils/adminDboard";

export type RevenueComparisonChartItem = {
  day: string;
  baseYearRevenue: number;
  compareYearRevenue: number;
  baseYear: number;
  compareYear: number;
  month: number;
};

const MONTH_LABELS = [
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

const getOrderDate = (order: Order): Date | null => {
  const date = new Date(order.createdAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const getOperatingYears = (orders: Order[]) => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const years = orders
    .map((order) => getOrderDate(order)?.getFullYear())
    .filter((year): year is number => Boolean(year));

  const firstYear =
    years.length > 0 ? Math.min(...years, previousYear) : previousYear;

  return Array.from(
    { length: currentYear - firstYear + 1 },
    (_, index) => currentYear - index,
  );
};

export const getRevenueComparisonDataByYears = (
  orders: Order[],
  baseYear: number,
  compareYear: number,
): RevenueComparisonChartItem[] => {
  const result: RevenueComparisonChartItem[] = MONTH_LABELS.map(
    (label, index) => ({
      day: label,
      baseYearRevenue: 0,
      compareYearRevenue: 0,
      baseYear,
      compareYear,
      month: index + 1,
    }),
  );

  orders.forEach((order) => {
    if (!isCompletedOrder(order.status)) return;

    const createdAt = getOrderDate(order);
    if (!createdAt) return;

    const orderYear = createdAt.getFullYear();
    const monthIndex = createdAt.getMonth();

    if (!result[monthIndex]) return;

    if (orderYear === baseYear) {
      result[monthIndex].baseYearRevenue += Number(order.totalPrice || 0);
    }

    if (orderYear === compareYear) {
      result[monthIndex].compareYearRevenue += Number(order.totalPrice || 0);
    }
  });

  return result;
};

export const getRevenueComparisonSummary = (
  data: RevenueComparisonChartItem[],
) => {
  const baseTotal = data.reduce((sum, item) => sum + item.baseYearRevenue, 0);

  const compareTotal = data.reduce(
    (sum, item) => sum + item.compareYearRevenue,
    0,
  );

  const growthPercent =
    baseTotal > 0 ? ((compareTotal - baseTotal) / baseTotal) * 100 : null;

  return {
    baseTotal,
    compareTotal,
    growthPercent,
  };
};
