import { Request, Response } from 'express';
import { catchErrors } from '@/utils/async-handler';
import { OK } from '@/constants/http';
import { verifyWebhookData } from '@/services/payos.service';
import { cancelPayosPayment, confirmPayment } from '@/services/order.service';

/**
 * Handle Webhook from PayOS
 */
export const payosWebhookHandler = catchErrors(async (req: Request, res: Response) => {
    const webhookBody = req.body;

    // Verify Webhook data structure and signature
    // Note: payOS.webhooks.verify returns the verified data (WebhookData)
    const verifiedData = await verifyWebhookData(webhookBody);

    // PayOS sends the event code in the root of the request body and within verifiedData
    // '00' in verifiedData.code indicates a successful payment
    if (webhookBody.code === '00' && verifiedData.code === '00') {
        const order = await confirmPayment(verifiedData.orderCode);

        // Notify user via socket so the mobile app can instantly close the checkout Modal
        const io = req.app.get('io');
        if (io && order && order.cusId) {
            io.to(`user:${order.cusId}`).emit('order:status_updated', {
                orderId: order._id,
                code: order.code,
                status: order.status,
                message: `Thanh toán thành công. Đơn hàng #${order.code} đã được xác nhận.`,
            });
        }
    }

    return res.status(OK).json({
        success: true,
        message: 'Webhook received and processed',
    });
});

/**
 * Cancel PayOS payment (called by FE after redirect from PayOS cancelUrl)
 * GET /api/payments/payos/cancel?orderCode=123
 */
export const payosCancelHandler = catchErrors(async (req: Request, res: Response) => {
    const raw = req.query.orderCode;
    const orderCode = Number(raw);

    if (!raw || Number.isNaN(orderCode)) {
        return res.status(OK).json({
            success: false,
            message: 'Thiếu hoặc sai orderCode',
        });
    }

    await cancelPayosPayment(orderCode);

    return res.status(OK).json({
        success: true,
        message: 'Đã hủy đơn hàng do thanh toán bị hủy',
    });
});