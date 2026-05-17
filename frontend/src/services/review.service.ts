import { apiClient } from "@/lib/api-client";

export interface CreateReviewRequest {
  product_id: string;
  rating: number;
  comment: string;
  images?: string[];
  isAnonymous?: boolean;
}

export interface OrderRatingRequest {
  order_id: string;
  reviews: CreateReviewRequest[];
}

class ReviewService {
  /** Submit ratings for an order */
  async createOrderReviews(data: OrderRatingRequest): Promise<any> {
    const response = await apiClient.post("/reviews", data);
    return response.data;
  }

  /** Get reviews for a product */
  async getProductReviews(productId: string, page = 1, limit = 10): Promise<any> {
    const response = await apiClient.get(`/reviews/product/${productId}`, {
      params: { page, limit },
    });
    return response.data;
  }

  /** Get reviews for an order by the current user */
  async getOrderReviews(orderId: string): Promise<any> {
    const response = await apiClient.get(`/reviews/order/${orderId}`);
    return response.data;
  }
}

export default new ReviewService();
