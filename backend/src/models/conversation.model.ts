import { IConversation, IMessage, MessageType } from '@/types/conversation.type';
import mongoose from 'mongoose';

// --- CONVERSATIONS ---
const ConversationSchema = new mongoose.Schema<IConversation>(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    lastMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  {
    timestamps: true,
  }
);

// Indexes
ConversationSchema.index({ storeId: 1, customerId: 1 });
ConversationSchema.index({ orderId: 1 });

export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema, 'conversations');

// --- MESSAGES ---
const MessageSchema = new mongoose.Schema<IMessage>(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: null },
    type: { type: String, required: true, enum: MessageType, default: MessageType.TEXT },
    mediaUrls: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
MessageSchema.index({ conversationId: 1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const MessageModel = mongoose.model<IMessage>('Message', MessageSchema, 'messages');
