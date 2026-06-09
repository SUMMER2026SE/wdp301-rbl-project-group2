import { apiClient } from "@/lib/api-client";
import type { Order } from "./order.service";

export interface Customer {
  _id: string;
  fullName?: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
  avatar?: string | null;
  status: string;
  collectedPoints: number;
  tier?: string;
  addresses?: Array<{
    label: string;
    receiverName: string;
    phone?: string;
    detail: string;
    ward: string;
    district?: string;
    city: string;
    isDefault: boolean;
  }>;
  health?: {
    allergies: string[];
    calories: number;
  };
  preferences?: {
    dietary: string[];
    allergies: string[];
    healthGoals: string[];
  };
  // Statistics appended by getCustomersWithStats:
  totalOrders?: number;
  cancelledOrders?: number;
  cancellationRate?: number;
}

export interface CustomerListResponse {
  success: boolean;
  data: {
    users: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerIncidentsResponse {
  success: boolean;
  data: Order[];
}

class CustomerService {
  async getCustomers(page?: number, limit?: number, search?: string): Promise<CustomerListResponse> {
    const response = await apiClient.get("/admin/customers", {
      params: { page, limit, search },
    });
    return response.data;
  }

  async getCustomerById(id: string): Promise<{ success: boolean; data: Customer }> {
    const response = await apiClient.get(`/admin/customers/${id}`);
    return response.data;
  }

  async getCustomerIncidents(userId: string): Promise<CustomerIncidentsResponse> {
    const response = await apiClient.get(`/admin/customers/${userId}/incidents`);
    return response.data;
  }

  async getCustomerOrders(userId: string): Promise<{ success: boolean; data: Order[] }> {
    const response = await apiClient.get("/orders", {
      params: { cusId: userId, limit: 100 }, // Fetch recent orders up to 100
    });
    return response.data;
  }
}

export default new CustomerService();
