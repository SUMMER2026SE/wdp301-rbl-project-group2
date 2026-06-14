import { apiClient } from "@/lib/api-client";

export type StaffRequestType = "CREATE_STAFF" | "DEACTIVATE_STAFF";
export type StaffRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type StaffDeactivateReason = "resignation" | "violation" | "transfer" | "other";

export interface StaffUser {
  _id: string;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  storeId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffRequest {
  _id: string;
  type: StaffRequestType;
  storeId:
    | string
    | { _id: string; name?: string; address?: string };
  requestedBy:
    | string
    | { _id: string; username?: string; fullName?: string; email?: string };
  status: StaffRequestStatus;
  candidate?: {
    fullName: string;
    email: string;
    phone: string;
    desiredPosition?: string;
    note?: string;
    confirmedStoreId: string;
  };
  targetStaffId?: string | StaffUser;
  reason?: StaffDeactivateReason | string;
  note?: string;
  reviewedBy?:
    | string
    | { _id: string; username?: string; fullName?: string; email?: string };
  reviewedAt?: string;
  adminNote?: string;
  createdUserId?: string;
  createdAt: string;
  updatedAt: string;
}

class StaffRequestAPI {
  async getManagerStaff(params?: {
    search?: string;
    status?: string;
  }): Promise<{ success: boolean; data: StaffUser[] }> {
    const response = await apiClient.get("/manager/staff", { params });
    return response.data;
  }

  async getManagerStaffRequests(params?: {
    status?: string;
    type?: string;
  }): Promise<{ success: boolean; data: StaffRequest[] }> {
    const response = await apiClient.get("/manager/staff-requests", {
      params,
    });
    return response.data;
  }

  async createManagerCreateStaffRequest(data: {
    fullName: string;
    email: string;
    phone: string;
    desiredPosition?: string;
    note?: string;
    confirmedStoreId: string;
  }): Promise<{ success: boolean; data: StaffRequest }> {
    const response = await apiClient.post(
      "/manager/staff-requests/create-staff",
      data,
    );
    return response.data;
  }

  async createManagerDeactivateStaffRequest(data: {
    targetStaffId: string;
    reason: StaffDeactivateReason | string;
    note?: string;
  }): Promise<{ success: boolean; data: StaffRequest }> {
    const response = await apiClient.post(
      "/manager/staff-requests/deactivate-staff",
      data,
    );
    return response.data;
  }

  async cancelManagerStaffRequest(
    id: string,
  ): Promise<{ success: boolean; data: StaffRequest }> {
    const response = await apiClient.patch(
      `/manager/staff-requests/${id}/cancel`,
    );
    return response.data;
  }

  async getAdminStaffRequests(params?: {
    status?: string;
    type?: string;
    storeId?: string;
  }): Promise<{ success: boolean; data: StaffRequest[] }> {
    const response = await apiClient.get("/admin/staff-requests", { params });
    return response.data;
  }

  async approveAdminStaffRequest(
    id: string,
    data: {
      adminNote?: string;
      deactivateStatus?: "inactive" | "blocked";
    },
  ): Promise<{ success: boolean; data: StaffRequest }> {
    const response = await apiClient.patch(
      `/admin/staff-requests/${id}/approve`,
      data,
    );
    return response.data;
  }

  async rejectAdminStaffRequest(
    id: string,
    data: { adminNote: string },
  ): Promise<{ success: boolean; data: StaffRequest }> {
    const response = await apiClient.patch(
      `/admin/staff-requests/${id}/reject`,
      data,
    );
    return response.data;
  }
}

export default new StaffRequestAPI();
