import { apiClient } from "@/lib/api-client";

class PaymentAPI {
  cancelPayosOrder(orderCode: number) {
    return apiClient.get("/payments/payos/cancel", {
      params: { orderCode },
    });
  }
}

export default new PaymentAPI();

