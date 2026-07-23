import { Queue, Worker, Job } from 'bullmq';
import { redisConfig } from '@/config/redis';
import NotificationModel from '@/models/notification.model';
import UserModel from '@/models/user.model';
import { NotificationType } from '@/types';
import { sendMail } from '@/utils/send-mail';

export interface INotificationJobData {
  userId: string;
  orderCode: string;
  status: string;
  reason?: string;
  orderId?: string;
}

// 1. Khởi tạo BullMQ Queue kết nối tới Redis
export const notificationQueue = new Queue('order-notification-queue', {
  connection: redisConfig,
});

const getOrderNotificationContent = (status: string, orderCode: string, reason?: string) => {
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

let ioInstance: any = null;

export const setNotificationSocketIO = (io: any) => {
  ioInstance = io;
};

// 2. Worker lắng nghe và xử lý Job từ Redis
export const startNotificationWorker = () => {
  const worker = new Worker<INotificationJobData>(
    'order-notification-queue',
    async (job: Job<INotificationJobData>) => {
      const { userId, orderCode, status, reason, orderId } = job.data;
      console.log(`[NotificationWorker] Đang xử lý thông báo đơn hàng #${orderCode} cho user: ${userId} (Job #${job.id})`);

      const content = getOrderNotificationContent(status, orderCode, reason);

      // 1. Lưu bản ghi Notification vào MongoDB
      const notificationDoc = await NotificationModel.create({
        userId,
        title: content.title,
        body: content.body,
        type: NotificationType.ORDER,
        isRead: false,
      });

      // 2. Phát sự kiện Socket.IO tức thì tới room của User
      if (ioInstance) {
        const notiObj = notificationDoc.toObject();
        ioInstance.to(`user:${userId}`).emit('notification:new', notiObj);
        ioInstance.to(`user:${userId}`).emit('order:status_updated', {
          orderId,
          code: orderCode,
          status,
          cancellationReason: reason,
          message: content.body,
        });
      }

      // 3. Nếu là đơn hủy, gửi email thông báo hủy đơn tới email người dùng
      if (status === 'cancelled') {
        try {
          const user = await UserModel.findById(userId).select('email fullName username').lean();
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
        } catch (mailErr: any) {
          console.error('[NotificationWorker] Lỗi gửi email hủy đơn:', mailErr.message);
        }
      }

      return notificationDoc.toObject();
    },
    {
      connection: redisConfig,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[NotificationWorker] Job #${job.id} đã hoàn thành gửi thông báo cho đơn #${job.data.orderCode}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job #${job?.id} thất bại. Lỗi:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Redis Error] Notification worker connection error:', err.message);
  });
};

notificationQueue.on('error', (err) => {
  console.error('[Redis Error] notificationQueue connection error:', err.message);
});
