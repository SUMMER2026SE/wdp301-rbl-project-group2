import { apiClient } from "@/lib/api-client";

export const REVIEW_FEEDBACK_TAG_VALUES = [
  "unhygienic",
  "wrong_flavor",
  "too_salty",
  "too_bland",
  "too_sweet",
  "not_fresh",
  "undercooked",
  "overcooked",
  "served_cold",
  "small_portion",
  "poor_packaging",
  "different_from_photo",
] as const;

export type ReviewFeedbackTag = (typeof REVIEW_FEEDBACK_TAG_VALUES)[number];
export type ReviewReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export interface ReviewReactionSummary {
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
}

export interface CreateReviewRequest {
  productId: string;
  rating: number;
  feedbackTags?: ReviewFeedbackTag[];
  comment: string;
  images?: string[];
  isAnonymous?: boolean;
}

export interface OrderRatingRequest {
  orderId: string;
  reviews: CreateReviewRequest[];
}

export interface ReviewImage {
  _id?: string;
  id?: string;
  secureUrl?: string;
  secure_url?: string;
  url?: string;
}

export interface Review {
  _id: string;
  user?: {
    name?: string;
    avatar?: string | null;
  };
  userId?: {
    _id: string;
    username?: string;
    avatar?: string | null;
  };
  orderId: string;
  productId: string;
  rating: number;
  feedbackTags: ReviewFeedbackTag[];
  comment?: string | null;
  images: Array<string | ReviewImage>;
  reply?: string | null;
  isAnonymous: boolean;
  reactions?: ReviewReactionSummary;
  currentUserReaction?: ReviewReactionType | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeaturedReview extends Omit<Review, "productId"> {
  productId: {
    _id: string;
    name: string;
    image?: string | null;
  };
}

export interface RejectedReview {
  productId: string;
  reason: string;
  category: string;
  bannedUntil?: string | null;
}

export interface CreateOrderReviewsResponse {
  reviews: Review[];
  rejectedReviews: RejectedReview[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ReviewService {
  /** Submit ratings for an order */
  async createOrderReviews(data: OrderRatingRequest): Promise<ApiResponse<CreateOrderReviewsResponse>> {
    const response = await apiClient.post<ApiResponse<CreateOrderReviewsResponse>>("/reviews", data);
    return response.data;
  }

  /** Get reviews for a product */
  async getProductReviews(productId: string, page = 1, limit = 10): Promise<ApiResponse<Review[]>> {
    const response = await apiClient.get<ApiResponse<Review[]>>(`/reviews/product/${productId}`, {
      params: { page, limit },
    });
    return response.data;
  }

  /** Get recent positive reviews for public testimonial sections */
  async getFeaturedReviews(limit = 3): Promise<ApiResponse<FeaturedReview[]>> {
    const response = await apiClient.get<ApiResponse<FeaturedReview[]>>("/reviews/featured", {
      params: { limit },
    });
    return response.data;
  }

  /** Add, change, or remove the current user's reaction on a review */
  async setReviewReaction(
    reviewId: string,
    reaction: ReviewReactionType | null,
  ): Promise<ApiResponse<{
    reviewId: string;
    reactions: ReviewReactionSummary;
    currentUserReaction: ReviewReactionType | null;
  }>> {
    const response = await apiClient.put(`/reviews/${reviewId}/reaction`, { reaction });
    return response.data;
  }

  /** Get reviews for an order by the current user */
  async getOrderReviews(orderId: string): Promise<ApiResponse<Review[]>> {
    const response = await apiClient.get<ApiResponse<Review[]>>(`/reviews/order/${orderId}`);
    return response.data;
  }
}

export default new ReviewService();
