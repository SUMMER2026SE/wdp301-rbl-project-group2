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

export interface RecommendationScoreBreakdown {
  collaborative: number;
  itemSimilarity: number;
  userSimilarity: number;
  behavior: number;
  campaign: number;
  healthGoal: number;
  taste: number;
  dietary: number;
  popularity: number;
  diversity: number;
  rotation: number;
}

export interface RecommendationSimilarUser {
  userIdHash: string;
  similarity: number;
  sharedSignals: string[];
  supportingProducts: Array<{
    productId: string;
    productName: string;
    signal: "ordered" | "reviewed";
    score: number;
  }>;
}

export interface RecommendationInsightsResponse {
  success: boolean;
  data: {
    algorithmVersion: string;
    computedAt: string;
    userProfile: {
      id: string;
      name: string;
      email: string;
      preferences: {
        dietary: string[];
        allergies: string[];
        healthGoals: string[];
        tastes: string[];
      };
    };
    interactionSummary: {
      completedOrders: number;
      reviewedProducts: number;
      viewedProducts?: number;
      recommendationClicks?: number;
      interactedProducts: Array<{
        productId: string;
        productName: string;
        quantity: number;
        orderCount: number;
        reviewRating?: number;
        score: number;
      }>;
    };
    topSimilarUsers: RecommendationSimilarUser[];
    recommendations: Array<{
      product: ProductLike;
      explanation: {
        reason: string;
        algorithmVersion: string;
        finalScore: number;
        scoreBreakdown: RecommendationScoreBreakdown;
        matchedSignals: string[];
        similarUsers: RecommendationSimilarUser[];
        similarProducts: Array<{
          productId: string;
          productName: string;
          similarity: number;
          source: "co_purchase" | "co_review" | "tag_similarity";
        }>;
      };
    }>;
    fallback: {
      usedPopularityFallback: boolean;
      reason: string | null;
    };
  };
}

interface ProductLike {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  campaignPrice?: number;
  isCampaignRunning?: boolean;
  campaignName?: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  healthTags?: string[];
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

  async getRecommendationInsights(userId: string): Promise<RecommendationInsightsResponse> {
    const response = await apiClient.get(`/admin/customers/${userId}/recommendation-insights`);
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
