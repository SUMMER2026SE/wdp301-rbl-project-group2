import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { catchErrors } from '@/utils/asyncHandler';
import * as supportChatService from '@/services/support-chat.service';
import * as supportSettingsService from '@/services/support-settings.service';

export const createOrGetConversation = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const { orderId } = req.body as { orderId?: string };

  const conversation = await supportChatService.createOrGetConversation(userId, orderId);
  const convObj = conversation.toObject ? conversation.toObject() : conversation;
  const payload = {
    id: (convObj as any)._id?.toString(),
    orderId: (convObj as any).order_id?.toString(),
    storeId: (convObj as any).store_id?.toString() || undefined,
    status: (convObj as any).status,
    createdAt: (convObj as any).createdAt,
    updatedAt: (convObj as any).updatedAt,
  };
  return res.json({ conversation: payload });
});

export const getMessages = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const role = req.role!;
  const { id } = req.params;

  const { messages } = await supportChatService.getMessages(id, userId, role);
  const payload = messages.map((m) => {
    const obj = m.toObject ? m.toObject() : m;
    return {
      id: (obj as any)._id?.toString(),
      conversationId: (obj as any).conversation_id?.toString(),
      senderType: (obj as any).sender_type,
      senderId: (obj as any).sender_id?.toString(),
      content: (obj as any).content,
      image_url: (obj as any).image_url,
      createdAt: (obj as any).createdAt,
      isRead: (obj as any).is_read ?? false,
    };
  });
  return res.json({ messages: payload });
});

export const sendMessage = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const role = req.role!;
  const { id } = req.params;
  const { content, image_url } = req.body as { content?: string, image_url?: string };

  const message = await supportChatService.sendMessage(id, userId, role, content ?? '', image_url);
  const { conversation } = await supportChatService.getMessages(id, userId, role);
  const obj = message.toObject ? message.toObject() : message;
  const payload = {
    id: (obj as any)._id?.toString(),
    conversationId: (obj as any).conversation_id?.toString(),
    senderType: (obj as any).sender_type,
    senderId: (obj as any).sender_id?.toString(),
    content: (obj as any).content,
    image_url: (obj as any).image_url,
    createdAt: (obj as any).createdAt,
    isRead: (obj as any).is_read ?? false,
  };

  // Realtime broadcast (best-effort)
  try {
    const io = req.app.get('io');
    io?.to(`support:conversation:${id}`)?.emit('support:new_message', payload);
    if (payload.senderType === 'STAFF') {
      io?.to(`user:${conversation.user_id?.toString()}`)?.emit('support:inbox_updated', {
        conversationId: payload.conversationId,
        message: payload,
      });
    }
  } catch {
    // ignore realtime errors
  }

  return res.status(201).json({ message: payload });
});

export const listStaffConversations = catchErrors(async (req: Request, res: Response) => {
  const role = req.role!;
  if (role !== 'STAFF' && role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ nhân viên mới được xem danh sách hội thoại' });
  }

  const conversations = await supportChatService.listStaffConversations();
  return res.json({ conversations });
});

export const markAsRead = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const role = req.role!;
  const { id } = req.params;

  await supportChatService.markAsRead(id, userId, role);
  return res.json({ message: 'Marked as read' });
});

export const closeConversation = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;

  await supportChatService.closeConversation(id);
  return res.json({ message: 'Conversation closed' });
});

export const getSupportSettings = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const settings = await supportSettingsService.getSettings(userId);
  return res.json({ settings });
});

export const updateSupportSettings = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const settings = await supportSettingsService.updateSettings(userId, req.body);
  return res.json({ settings });
});

export const listUserConversations = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const conversations = await supportChatService.listUserConversations(userId);
  return res.json({ conversations });
});



