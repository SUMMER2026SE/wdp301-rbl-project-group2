import { apiClient } from "@/lib/api-client";
import type {
  AdminManagerResponse,
  CreateManagerPayload,
  ManagerAPI,
  StoreOption,
} from "@/types/adminManager";

class AdminManagerService {
  async fetchManagers(page = 1, limit = 100): Promise<AdminManagerResponse> {
    const response = await apiClient.get<AdminManagerResponse>(
      "/admin/managers",
      {
        params: { page, limit },
      },
    );

    return response.data;
  }

  async fetchStores(): Promise<StoreOption[]> {
    const response = await apiClient.get<{
      success?: boolean;
      message?: string;
      data?: StoreOption[] | { stores?: StoreOption[] };
      stores?: StoreOption[];
    }>("/admin/stores");

    const payload = response.data;

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (payload.data && typeof payload.data === "object") {
      return payload.data.stores || [];
    }

    return payload.stores || [];
  }

  async createManager(payload: CreateManagerPayload) {
    const response = await apiClient.post<{
      success: boolean;
      message?: string;
      data: ManagerAPI;
    }>("/admin/managers", payload);

    return response.data;
  }

  async updateManagerStatus(id: string, isActive: boolean) {
    const response = await apiClient.patch<{
      success: boolean;
      message?: string;
      data: ManagerAPI;
    }>(`/admin/managers/${id}`, {
      isActive,
    });

    return response.data;
  }
}

export default new AdminManagerService();
