import mongoose from 'mongoose';

export enum NotificationType {
  ORDER_STATUS_UPDATED = 'order_status_updated',
  ORDER_CANCELLED = 'order_cancelled',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
}

export default interface INotification extends mongoose.Document<mongoose.Types.ObjectId> {
  user_id: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  expires_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
