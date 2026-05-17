import { INotification } from '@/types';
import { NotificationType } from '@/types/notification.type';
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema<INotification>(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    isRead: { type: Boolean, default: false },
    expires_at: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema, 'notifications');

export default NotificationModel;
