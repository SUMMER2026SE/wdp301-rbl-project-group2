import mongoose from 'mongoose';

export enum NotificationType {
  SYSTEM = 'system',
  ORDER = 'order',
  PROMOTION = 'promotion',
  CHAT = 'chat',
  
  ORDER_STATUS_UPDATED = 'order',
  ORDER_CANCELLED = 'order',
}

export interface INotification extends mongoose.Document<mongoose.Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId | null;
  title: string;
  body?: string;
  type: NotificationType;
  isRead: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
}
