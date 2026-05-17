import type { Order } from "@/services/order.service";

export interface CustomerAPI {
  _id: string;
  createdAt?: string;
  joinDate?: string;
}

export interface CustomerResponse {
  success?: boolean;
  data?: CustomerAPI[] | { customers?: CustomerAPI[]; users?: CustomerAPI[] };
  customers?: CustomerAPI[];
  users?: CustomerAPI[];
}

export interface RevenueChartItem {
  day: string;
  revenue: number;
  orders: number;
  fullDate: string;
}

export type RevenueFilterType = "week" | "month" | "year";

export interface RecentOrderItem {
  code: string;
  customer: string;
  time: string;
  items: number;
  total: string;
  status: string;
  statusClass: string;
}

export interface RevenueFilterResult {
  revenueData: RevenueChartItem[];
  revenueBars: number[];
  orderBars: number[];
}

export type DashboardOrder = Order;
