import mongoose from 'mongoose';
import NotificationModel from '@/models/notification.model';
import UserModel from '@/models/user.model';
import { NotificationType } from '@/types';
import { sendMail } from '@/utils/send-mail';

let ioInstance: any = null;

export const setNotificationSocketIO = (io: any) => {
    ioInstance = io;
};

export const getOrderNotificationContent = (status: string, orderCode: string, reason?: string) => {
    switch (status) {
        case 'confirmed':
            return {
                title: 'Đơn hàng đã được xác nhận',
                body: `Đơn hàng #${orderCode} của bạn đang được bếp chuẩn bị.`,
            };
        case 'delivering':
        case 'shipping':
            return {
                title: 'Đơn hàng đang được giao',
                body: `Đơn hàng #${orderCode} đang được giao đến bạn. Vui lòng chú ý điện thoại.`,
            };
        case 'completed':
            return {
                title: 'Đơn hàng đã hoàn tất',
                body: `Đơn hàng #${orderCode} đã hoàn tất. Chúc bạn ngon miệng!`,
            };
        case 'cancelled':
            return {
                title: 'Đơn hàng đã bị hủy',
                body: `Đơn hàng #${orderCode} đã bị hủy.${reason ? ` Lý do: ${reason}` : ''}`,
            };
        default:
            return {
                title: 'Đơn hàng được cập nhật',
                body: `Đơn hàng #${orderCode} vừa được cập nhật trạng thái.`,
            };
    }
};

export const createOrderStatusNotification = async ({
    userId,
    orderCode,
    status,
    reason,
    orderId,
}: {
    userId: mongoose.Types.ObjectId | string;
    orderCode: string;
    status: string;
    reason?: string;
    orderId?: string;
}) => {
    const content = getOrderNotificationContent(status, orderCode, reason);
    const userIdStr = userId.toString();

    // 1. Tạo bản ghi Notification trong MongoDB
    const notification = await NotificationModel.create({
        userId,
        title: content.title,
        body: content.body,
        type: NotificationType.ORDER,
        isRead: false,
    });

    // 2. Phát sự kiện Socket.IO tức thì tới room của User nếu Socket.IO sẵn sàng
    if (ioInstance) {
        const notiObj = notification.toObject();
        ioInstance.to(`user:${userIdStr}`).emit('notification:new', notiObj);
        ioInstance.to(`user:${userIdStr}`).emit('order:status_updated', {
            orderId,
            code: orderCode,
            status,
            cancellationReason: reason,
            message: content.body,
        });
    }

    // 3. Nếu là hủy đơn, tự động gửi email thông báo hủy cho khách hàng (chạy bất đồng bộ)
    if (status === 'cancelled') {
        UserModel.findById(userId)
            .select('email fullName username')
            .lean()
            .then(async (user) => {
                if (user && user.email) {
                    await sendMail({
                        to: user.email,
                        subject: `[FoodieDash] Đơn hàng #${orderCode} đã bị hủy`,
                        text: `Đơn hàng #${orderCode} của bạn đã bị hủy.${reason ? ` Lý do: ${reason}` : ''}`,
                        html: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
                            <h2 style="color: #e53e3e;">Thông báo hủy đơn hàng #${orderCode}</h2>
                            <p>Xin chào <strong>${user.fullName || user.username || 'Quý khách'}</strong>,</p>
                            <p>Đơn hàng <strong>#${orderCode}</strong> của bạn đã bị hủy.</p>
                            ${reason ? `<div style="background: #fff5f5; border-left: 4px solid #e53e3e; padding: 12px; margin: 16px 0;"><strong>Lý do hủy:</strong> ${reason}</div>` : ''}
                            <p>Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ bộ phận CSKH của FoodieDash.</p>
                            <p>Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi!</p>
                        </div>`,
                    });
                }
            })
            .catch((err) => console.error('[NotificationService] Lỗi gửi email hủy đơn:', err.message));
    }

    return notification;
};
