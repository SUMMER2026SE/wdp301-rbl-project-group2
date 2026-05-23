import { Router } from 'express';
import { payosCancelHandler, payosWebhookHandler } from '@/controllers/payment.controller';

const paymentRoutes = Router();

/**
 * Public Webhook for PayOS
 * PayOS sends POST request to this endpoint
 */
paymentRoutes.post('/webhook/payos', payosWebhookHandler);

// Called by FE after PayOS redirects user back with cancelUrl params
paymentRoutes.get('/payos/cancel', payosCancelHandler);

export default paymentRoutes;
