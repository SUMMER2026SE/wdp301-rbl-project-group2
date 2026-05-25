import { INotification, NotificationType } from '@/types';
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema<INotification>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    type: { type: String, required: true, enum: NotificationType },
    isRead: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
NotificationSchema.index({ userId: 1 });

// Compound Indexes
NotificationSchema.index({ userId: 1, isRead: 1 });

const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema, 'notifications');

export default NotificationModel;
