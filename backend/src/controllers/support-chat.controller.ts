import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { catchErrors } from '@/utils/async-handler';
import * as supportChatService from '@/services/support-chat.service';
import * as supportSettingsService from '@/services/support-settings.service';
import { FORBIDDEN, UNAUTHORIZED } from '@/constants/http';
import { UserModel } from '@/models';
import appAssert from '@/utils/app-assert';

const serializeSupportSettings = (settings: any) => {
  const obj = settings?.toObject ? settings.toObject() : settings;
  return {
    id: obj?._id?.toString(),
    userId: obj?.user_id?.toString(),
    isOnline: obj?.isOnline ?? false,
    welcomeMessage: obj?.welcomeMessage,
    outOfOffice: obj?.outOfOffice,
    quickReplies: obj?.quickReplies ?? [],
    createdAt: obj?.createdAt,
    updatedAt: obj?.updatedAt,
  };
};

const getStaffStoreId = async (userId: string | mongoose.Types.ObjectId, requestedStoreId?: string) => {
  const user = await UserModel.findById(userId).select('storeId');
  appAssert(user, UNAUTHORIZED, 'User not found');

  const authStoreId = user.storeId?.toString();
  appAssert(authStoreId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  appAssert(
    !requestedStoreId || requestedStoreId === authStoreId,
    FORBIDDEN,
    'Bạn không có quyền thao tác chi nhánh này'
  );

  return new mongoose.Types.ObjectId(authStoreId);
};

const getStaffStoreIdIfNeeded = async (userId: string | mongoose.Types.ObjectId, role: string) => {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole !== 'staff') return undefined;
  return getStaffStoreId(userId);
};

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

  const requesterStoreId = await getStaffStoreIdIfNeeded(req.userId, role);
  const { messages } = await supportChatService.getMessages(id, userId, role, requesterStoreId);
  const payload = messages.map((m) => {
    const obj = m.toObject ? m.toObject() : m;
    return {
      id: (obj as any)._id?.toString(),
      conversationId: (obj as any).conversation_id?.toString(),
      senderType: (obj as any).sender_type,
      senderId: (obj as any).sender_id?.toString(),
      content: (obj as any).content,
      imageUrl: (obj as any).image_url,
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
  const { content, imageUrl } = req.body as { content?: string; imageUrl?: string };

  const requesterStoreId = await getStaffStoreIdIfNeeded(req.userId, role);
  const message = await supportChatService.sendMessage(id, userId, role, content ?? '', imageUrl, requesterStoreId);
  const { conversation } = await supportChatService.getMessages(id, userId, role, requesterStoreId);
  const obj = message.toObject ? message.toObject() : message;
  const payload = {
    id: (obj as any)._id?.toString(),
    conversationId: (obj as any).conversation_id?.toString(),
    senderType: (obj as any).sender_type,
    senderId: (obj as any).sender_id?.toString(),
    content: (obj as any).content,
    imageUrl: (obj as any).image_url,
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
    } else if (payload.senderType === 'USER') {
      io?.to('staff')?.emit('support:inbox_updated', {
        conversationId: payload.conversationId,
        message: payload,
      });
    }
  } catch {
    // ignore realtime errors
  }

  return res.status(201).json({ message: payload });
});

import { Role } from '@/types';

export const listStaffConversations = catchErrors(async (req: Request, res: Response) => {
  const role = req.role!.toLowerCase();
  if (role !== Role.STAFF && role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Chỉ nhân viên mới được xem danh sách hội thoại' });
  }

  const requestedStoreId = req.query.storeId as string | undefined;
  const scopedStoreId = role === Role.STAFF ? await getStaffStoreId(req.userId, requestedStoreId) : undefined;
  const conversations = await supportChatService.listStaffConversations(scopedStoreId?.toString());
  return res.json({ conversations });
});

export const markAsRead = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const role = req.role!;
  const { id } = req.params;

  const requesterStoreId = await getStaffStoreIdIfNeeded(req.userId, role);
  await supportChatService.markAsRead(id, userId, role, requesterStoreId);
  return res.json({ message: 'Marked as read' });
});

export const closeConversation = catchErrors(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = req.role!;
  const requesterStoreId = await getStaffStoreIdIfNeeded(req.userId, role);

  await supportChatService.closeConversation(id, role, requesterStoreId);
  return res.json({ message: 'Conversation closed' });
});

export const getSupportSettings = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const settings = await supportSettingsService.getSettings(userId);
  return res.json({ settings: serializeSupportSettings(settings) });
});

export const updateSupportSettings = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  let updateData = { ...req.body };

  // Convert flat mobile body format to nested model format
  if ('autoReply' in updateData || 'greetingMessage' in updateData) {
    updateData.welcomeMessage = {
      enabled: updateData.autoReply ?? false,
      content: updateData.greetingMessage ?? '',
    };
    delete updateData.autoReply;
    delete updateData.greetingMessage;
  }

  const settings = await supportSettingsService.updateSettings(userId, updateData);
  return res.json({ settings: serializeSupportSettings(settings) });
});

export const updateSupportStatus = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const { isOnline } = req.body as { isOnline?: boolean };

  const settings = await supportSettingsService.updateSettings(userId, { isOnline: isOnline ?? false });
  return res.json({ settings: serializeSupportSettings(settings) });
});

export const listUserConversations = catchErrors(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const conversations = await supportChatService.listUserConversations(userId);
  return res.json({ conversations });
});
