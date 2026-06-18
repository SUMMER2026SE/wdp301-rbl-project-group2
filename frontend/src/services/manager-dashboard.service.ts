import { apiClient } from '@/lib/api-client';

export interface ManagerDashboardMetrics {
  orders: {
    newOrders: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    averageProcessingMinutes: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
    codPending: number;
    paymentMethodSplit: Record<string, number>;
  };
  staffPerformance: Array<{
    staffId: string;
    staffName: string;
    completedOrders: number;
    revenue: number;
  }>;
  menu: {
    activeSellingItems: number;
    outOfStockItems: number;
    disabledItems: number;
    operationalNotes: number;
  };
}

export interface ManagerCashOrder {
  _id: string;
  code: string;
  totalPrice: number;
  paymentMethod?: string;
  payment?: {
    method?: string;
    paidAt?: string | null;
    cashCollectedAt?: string | null;
    cashCollectedBy?: string | null;
  };
  deliveryInfo?: {
    driverId?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
  };
  completedAt?: string;
  createdAt?: string;
  customer?: unknown;
}

export interface ManagerCashOverview {
  selectedDate?: string;
  closeTime?: string;
  isToday?: boolean;
  shouldWarnCloseout?: boolean;
  pending: {
    total: number;
    count: number;
    orders: ManagerCashOrder[];
  };
  collected: {
    total: number;
    count: number;
    orders: ManagerCashOrder[];
  };
  byDriver: Array<{
    driverId: string;
    driverName: string;
    driverPhone?: string | null;
    pendingTotal: number;
    collectedTotal: number;
    pendingOrders: number;
    collectedOrders: number;
  }>;
  dailyTotals: Array<{
    date: string;
    total: number;
  }>;
}

export interface ManagerCodCollectionResult {
  collectedAt: string;
  collectedBy: string;
  updatedCount: number;
  totalCollected: number;
  orderIds: string[];
}

export interface ManagerStoreSettings {
  storeId: string;
  openHours: {
    open: string;
    close: string;
  };
  isOpen: boolean;
}

export interface ManagerStoreInfo {
  name: string;
  address: string;
  district: string;
}

class ManagerDashboardService {
  async getManagerDashboardMetrics(): Promise<{ success: boolean; data: ManagerDashboardMetrics }> {
    const response = await apiClient.get('/manager/dashboard/metrics');
    return response.data;
  }

  async getManagerCashOverview({ date }: { date?: string } = {}): Promise<{ success: boolean; data: ManagerCashOverview }> {
    const response = await apiClient.get('/manager/cash', { params: { date } });
    return response.data;
  }

  async getManagerSettings(): Promise<{ success: boolean; data: ManagerStoreSettings }> {
    const response = await apiClient.get('/manager/settings');
    return response.data;
  }

  async updateManagerSettings(
    data: Pick<ManagerStoreSettings, 'openHours' | 'isOpen'>,
  ): Promise<{ success: boolean; data: ManagerStoreSettings }> {
    const response = await apiClient.put('/manager/settings', data);
    return response.data;
  }

  async updateManagerStoreInfo(
    data: Partial<ManagerStoreInfo>,
  ): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.put('/manager/store', data);
    return response.data;
  }

  async confirmManagerCodCollection(
    orderIds: string[],
  ): Promise<{ success: boolean; data: ManagerCodCollectionResult }> {
    const response = await apiClient.patch('/manager/cash/collect', { orderIds });
    return response.data;
  }
}

export default new ManagerDashboardService();
