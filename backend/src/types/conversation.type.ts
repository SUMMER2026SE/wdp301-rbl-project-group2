import mongoose from 'mongoose';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
}

export interface IConversation extends mongoose.Document<mongoose.Types.ObjectId> {
  storeId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId | null;
  lastMessageId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends mongoose.Document<mongoose.Types.ObjectId> {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text?: string | null;
  type: MessageType;
  mediaUrls: string[];
  createdAt: Date;
}
