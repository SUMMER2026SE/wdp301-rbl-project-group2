import mongoose from 'mongoose';
import NotificationModel from '@/models/notification.model';
import { NotificationType } from '@/types';

const getOrderNotificationContent = (status: string, orderCode: string) => {
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
                body: `Đơn hàng #${orderCode} đã bị hủy.`,
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
}: {
    userId: mongoose.Types.ObjectId;
    orderCode: string;
    status: string;
}) => {
    const content = getOrderNotificationContent(status, orderCode);

    return NotificationModel.create({
        userId,
        title: content.title,
        body: content.body,
        type: NotificationType.ORDER,
        isRead: false,
    });
};
