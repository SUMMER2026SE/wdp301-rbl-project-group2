import payOS from '@/config/payos';

/**
 * Create a payment link for an order
 * @param orderCode The order code (must be numeric for PayOS)
 * @param amount Total amount to pay
 * @param description Payment description
 * @param returnUrl URL to redirect to after successful payment
 * @param cancelUrl URL to redirect to after cancelled payment
 */
export const createPaymentLink = async (
  orderCode: number,
  amount: number,
  description: string,
  returnUrl: string,
  cancelUrl: string
) => {
  const body = {
    orderCode,
    amount,
    description,
    returnUrl,
    cancelUrl,
  };

  return await payOS.paymentRequests.create(body);
};

/**
 * Verify webhook request from PayOS
 * @param webhookBody Raw body from webhook
 */
export const verifyWebhookData = (webhookBody: any) => {
  return payOS.webhooks.verify(webhookBody);
};
