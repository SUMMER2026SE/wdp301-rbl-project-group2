import { apiClient } from "@/lib/api-client";

export interface ManagerOrderActionPayload {
  reason?: string;
  note?: string;
}

export interface ManagerAssignDeliveryPayload extends ManagerOrderActionPayload {
  driverId: string;
}

export interface ManagerOverrideStatusPayload extends ManagerOrderActionPayload {
  status: Order['status'];
}

export interface StaffStoreScope {
  storeId: string;
}

export interface StaffOrderListParams extends StaffStoreScope {
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface StaffOrderActionPayload extends StaffStoreScope {
  reason?: string;
}

export interface PlaceOrderItemVariation {
  name: string;
  choice: string;
  extraPrice?: number;
}

export interface PlaceOrderItem {
  productId: string;
  quantity: number;
  variations?: PlaceOrderItemVariation[];
}

export interface PlaceOrderAddress {
  label?: string;
  receiverName: string;
  phone: string;
  detail: string;
  ward: string;
  district?: string;
  city: string;
  /** Geocoded [lng, lat] from the customer's full address, computed on the frontend.
   * Sent to backend so both sides compute shipping distance from the same coordinates. */
  customerCoords?: [number, number];
}

export type PaymentMethod =
  | "cash"
  | "cash_on_delivery"
  | "bank_transfer"
  | "momo"
  | "vnpay"
  | "stripe";

export interface PlaceOrderRequest {
  items: PlaceOrderItem[];
  paymentMethod?: PaymentMethod;
  voucher?: string;
  shippingFee?: number;
  deliveryAddress?: PlaceOrderAddress;
  note?: string;
}

export interface PlacedOrder {
  _id: string;
  code: string;
  status: string;
  items: Array<{
    productId: string;
    quantity: number;
    variations: Array<{ name: string; choice: string; extraPrice: number }>;
    subTotal: number;
  }>;
  subTotal: number;
  note?: string;
  staffNoteItems?: string[];
  shippingFee: number;
  totalPrice: number;
  payment: {
    method: PaymentMethod;
    paidAt: string | null;
  };
  deliveryAddress: PlaceOrderAddress;
  voucherId: string | null;
  checkoutUrl?: string;
  createdAt: string;
}

export interface Order {
  _id: string;
  code: string;
  storeId?: string | { _id: string } | null;
  cusId?:
  | string
  | {
    _id: string;
    username: string;
    fullName?: string;
    email: string;
    phone: string;
  };
  items: Array<{
    productId:
    | string
    | {
      _id: string;
      name: string;
      image: string | { secureUrl?: string };
      price: number;
    };
    quantity: number;
    variations: Array<{ name: string; choice: string; extraPrice?: number }>;
    subTotal: number;
  }>;
  note?: string;
  staffNoteItems?: string[];
  status:
  | "pending"
  | "confirmed"
  | "processing"
  | "preparing"
  | "ready_for_delivery"
  | "shipping"
  | "delivering"
  | "delivered"
  | "completed"
  | "cancelled";
  subTotal: number;
  shippingFee: number;
  totalPrice: number;
  payment: {
    method: PaymentMethod;
    paidAt: string | null;
  };
  deliveryAddress: PlaceOrderAddress;
  deliveryInfo?: {
    shippedAt?: string;
    deliveredAt?: string;
    driverId?: string | null;
  };
  voucher?: string | null;
  createdAt: string;
  updatedAt: string;
  isReviewed?: boolean;
  discountAmount?: number;
  statusHistory?: any[];
  cancellation?: {
    reason: string;
    cancelledBy: "staff" | "customer";
    refundRequired?: boolean;
    refundedAt?: string | null;
  } | null;
}

export interface OrderListResponse {
  success: boolean;
  data: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class OrderService {
  async placeOrder(
    data: PlaceOrderRequest,
  ): Promise<{ success: boolean; data: PlacedOrder }> {
    const response = await apiClient.post("/orders", data);
    return response.data;
  }

  async getMyOrders(page = 1, limit = 10): Promise<OrderListResponse> {
    const response = await apiClient.get("/orders/me", {
      params: { page, limit },
    });
    return response.data;
  }

  async getOrderById(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(
    id: string,
    status: string,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/${id}/status`, { status });
    return response.data;
  }

  async getAllOrders(params?: {
    status?: string;
    driverId?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<OrderListResponse> {
    const response = await apiClient.get("/orders", { params });
    return response.data;
  }

  async cancelOrder(
    id: string,
    data?: { reason: string }
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch(`/orders/${id}/cancel`, data);
    return response.data;
  }

  // ── Staff actions ────────────────────────────────────────────────────────

  async getStaffOrders(params: StaffOrderListParams): Promise<OrderListResponse> {
    const response = await apiClient.get('/orders/staff/orders', { params });
    return response.data;
  }

  async getStaffOrderById(
    id: string,
    scope: StaffStoreScope,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.get(`/orders/staff/orders/${id}`, { params: scope });
    return response.data;
  }

  async staffConfirmOrder(
    id: string,
    scope: StaffStoreScope,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/staff/orders/${id}/confirm`, scope);
    return response.data;
  }

  async staffRejectOrder(
    id: string,
    data: StaffOrderActionPayload,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/staff/orders/${id}/reject`, data);
    return response.data;
  }

  async staffMarkOrderReady(
    id: string,
    scope: StaffStoreScope,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/staff/orders/${id}/ready`, scope);
    return response.data;
  }

  async staffAssignDelivery(
    id: string,
    scope: StaffStoreScope,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/staff/orders/${id}/deliver`, scope);
    return response.data;
  }

  async staffCompleteDelivery(
    id: string,
    scope: StaffStoreScope,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/staff/orders/${id}/complete`, scope);
    return response.data;
  }

  /** Staff: Nhận đơn (PENDING → CONFIRMED) */
  async confirmOrder(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/${id}/confirm`);
    return response.data;
  }

  /** Staff: Từ chối đơn (PENDING → CANCELLED) */
  async rejectOrder(
    id: string,
    reason: string,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/${id}/reject`, { reason });
    return response.data;
  }

  /** Staff: Đánh dấu nấu xong (CONFIRMED/PROCESSING → READY_FOR_DELIVERY) */
  async markOrderReady(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/${id}/ready`);
    return response.data;
  }

  /** Staff: Đi giao đơn hàng (READY_FOR_DELIVERY → SHIPPING) */
  async assignDelivery(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/${id}/deliver`);
    return response.data;
  }

  /** Staff: Giao thành công (SHIPPING → COMPLETED) */
  async completeDelivery(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/${id}/complete`);
    return response.data;
  }

  /** Customer: Xác nhận đã nhận hàng (DELIVERED → COMPLETED) */
  async confirmReceipt(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/orders/${id}/customer-confirm`);
    return response.data;
  }

  // ── Manager actions ──────────────────────────────────────────────────────

  async getManagerOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<OrderListResponse> {
    const response = await apiClient.get('/manager/orders', { params });
    return response.data;
  }

  async getManagerOrderById(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.get(`/manager/orders/${id}`);
    return response.data;
  }

  async managerConfirmOrder(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/manager/orders/${id}/confirm`);
    return response.data;
  }

  async managerRejectOrder(
    id: string,
    data: ManagerOrderActionPayload,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/manager/orders/${id}/reject`, data);
    return response.data;
  }

  async managerCancelOrder(
    id: string,
    data: ManagerOrderActionPayload,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/manager/orders/${id}/cancel`, data);
    return response.data;
  }

  async managerAssignDelivery(
    id: string,
    data: ManagerAssignDeliveryPayload,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/manager/orders/${id}/assign-delivery`, data);
    return response.data;
  }

  async managerManualCompleteOrder(
    id: string,
    data: ManagerOrderActionPayload,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/manager/orders/${id}/manual-complete`, data);
    return response.data;
  }

  async managerOverrideOrderStatus(
    id: string,
    data: ManagerOverrideStatusPayload,
  ): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.patch(`/manager/orders/${id}/override-status`, data);
    return response.data;
  }
}

export default new OrderService();
