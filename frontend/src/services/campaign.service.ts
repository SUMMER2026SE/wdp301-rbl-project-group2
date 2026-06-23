import { apiClient } from "@/lib/api-client";

export type CampaignStatus = "pending" | "approved" | "rejected";

export const CampaignStatus = {
  PENDING: "pending" as const,
  APPROVED: "approved" as const,
  REJECTED: "rejected" as const,
};

export interface CampaignProductItem {
  productId: string | { _id: string; name: string; price: number; image?: any };
  fixedPrice?: number | null;
  discount?: number | null;
}

export interface Campaign {
  _id: string;
  name: string;
  type: string;
  status: CampaignStatus;
  createdBy: string | { _id: string; username: string; email: string };
  products: CampaignProductItem[];
  startTime: string;
  endTime: string;
  views?: number;
  clicks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  type: string;
  products: {
    productId: string;
    fixedPrice?: number | null;
    discount?: number | null;
  }[];
  startTime: string;
  endTime: string;
}

class CampaignAPI {
  async getCampaigns(): Promise<{ success: boolean; data: Campaign[] }> {
    const response = await apiClient.get("/campaigns");
    return response.data;
  }

  async getCampaignById(id: string): Promise<{ success: boolean; data: Campaign }> {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  }

  async createCampaign(data: CreateCampaignPayload): Promise<{ success: boolean; data: Campaign; message: string }> {
    const response = await apiClient.post("/campaigns", data);
    return response.data;
  }

  async updateCampaign(id: string, data: Partial<CreateCampaignPayload>): Promise<{ success: boolean; data: Campaign; message: string }> {
    const response = await apiClient.put(`/campaigns/${id}`, data);
    return response.data;
  }

  async deleteCampaign(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/campaigns/${id}`);
    return response.data;
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<{ success: boolean; data: Campaign; message: string }> {
    const response = await apiClient.patch(`/campaigns/${id}/status`, { status });
    return response.data;
  }

  async trackActivity(id: string, action: "view" | "click"): Promise<{ success: boolean; data: Campaign }> {
    const response = await apiClient.post(`/campaigns/${id}/track`, { action });
    return response.data;
  }
}

export default new CampaignAPI();
