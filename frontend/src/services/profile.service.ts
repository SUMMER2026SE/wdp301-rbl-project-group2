import { apiClient } from "@/lib/api-client";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export interface UserPreferences {
  dietary: string[];
  allergies: string[];
  healthGoals: string[];
}

export type UserMeResponse = {
  _id: string;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  collectedPoints: number;
  tier: string;
  referralCode: string;
  referredBy?: string | null;
  role: string;
  preferences?: UserPreferences;
  ordersCount?: number;
  reviewsCount?: number;
  savedCount?: number;
  receiveCampaignNotifications?: boolean;
  storeId?: string | null;
};

export interface MembershipInfo {
  collectedPoints: number;
  tier: string;
  referralCode: string;
  referredBy?: string | null;
  referralRewardStatus?: "none" | "pending" | "processing" | "rewarded" | "rejected";
  referralQualifiedOrderId?: string | null;
  referralRewardVoucherId?: string | null;
  referralRewardedAt?: string | null;
  referralRejectionReason?: string | null;
  redeemedVoucherIds?: string[];
}

export interface PointTransaction {
  _id: string;
  amount: number;
  type: "earn" | "redeem" | "referral" | "bonus";
  description: string;
  orderId?: string;
  createdAt: string;
}

export interface AddressPayload {
  label?: string;
  receiverName: string;
  phone?: string;
  detail: string;
  ward: string;
  district?: string;
  city: string;
  isDefault: boolean;
}

export type UpdateMePayload = {
  username?: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
  addresses?: AddressPayload[];
  receiveCampaignNotifications?: boolean;
};

export const userService = {
  getMe() {
    return apiClient.get<ApiResponse<UserMeResponse>>("/users/me");
  },

  updateMe(payload: UpdateMePayload) {
    return apiClient.patch<ApiResponse<UserMeResponse>>("/users/me", payload);
  },

  updatePreferences(preferences: Partial<UserPreferences>) {
    return apiClient.patch<ApiResponse<UserMeResponse>>("/users/me", {
      preferences,
    });
  },

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return apiClient.patch<ApiResponse<null>>("/users/me/password", payload);
  },
  updateAvatar(file: File) {
    const form = new FormData();
    form.append("file", file);

    return apiClient.patch<ApiResponse<UserMeResponse>>(
      "/users/me/avatar",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },

  getMembership() {
    return apiClient.get<ApiResponse<MembershipInfo>>("/users/me/membership");
  },

  getPointTransactions(skip = 0, limit = 20) {
    return apiClient.get<ApiResponse<PointTransaction[]>>("/users/me/points", {
      params: { skip, limit },
    });
  },

  claimReferral(code: string) {
    return apiClient.post<ApiResponse<{ message: string }>>("/users/me/referral/claim", { code });
  },
};
