import mongoose from 'mongoose';
import type { ISupportConversation, ISupportMessage } from '@/types/support-chat.type';

const SupportConversationSchema = new mongoose.Schema<ISupportConversation>(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    store_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  {
    timestamps: true,
  }
);

SupportConversationSchema.index({ user_id: 1, status: 1 });

const SupportMessageSchema = new mongoose.Schema<ISupportMessage>(
  {
    conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportConversation', required: true },
    sender_type: { type: String, enum: ['USER', 'STAFF'], required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    image_url: { type: String, default: null },
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

SupportMessageSchema.index({ conversation_id: 1, createdAt: 1 });

export const SupportConversationModel = mongoose.model<ISupportConversation>(
  'SupportConversation',
  SupportConversationSchema,
  'support_conversations'
);

export const SupportMessageModel = mongoose.model<ISupportMessage>(
  'SupportMessage',
  SupportMessageSchema,
  'support_messages'
);

