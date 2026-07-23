import mongoose from 'mongoose';
import NotificationModel from '@/models/notification.model';

export const getMyNotifications = async (req: any, res: any) => {
  const notifications = await NotificationModel.find({
    userId: req.userId,
  }).sort({ createdAt: -1 });

  return res.json({
    success: true,
    data: notifications,
  });
};

export const getUnreadNotificationCount = async (req: any, res: any) => {
  const count = await NotificationModel.countDocuments({
    userId: req.userId,
    isRead: false,
  });

  return res.json({
    success: true,
    data: { count },
  });
};

export const markNotificationAsRead = async (req: any, res: any) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id) || id.startsWith('temp-')) {
    return res.json({
      success: true,
      data: null,
    });
  }

  const notification = await NotificationModel.findOneAndUpdate(
    {
      _id: id,
      userId: req.userId,
    },
    {
      isRead: true,
    },
    { new: true }
  );

  return res.json({
    success: true,
    data: notification,
  });
};

export const markAllNotificationsAsRead = async (req: any, res: any) => {
  await NotificationModel.updateMany(
    {
      userId: req.userId,
      isRead: false,
    },
    {
      isRead: true,
    }
  );

  return res.json({
    success: true,
    message: 'Đã đánh dấu tất cả là đã đọc',
  });
};
