import mongoose from 'mongoose';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { SupportConversationModel, SupportMessageModel } from '@/models';
import appAssert from '@/utils/appAssert';
import { getOrderById } from './order.service';

export const createOrGetConversation = async (userId: mongoose.Types.ObjectId, orderIdOrCode?: string) => {
  let orderIdToUse = null;

  if (orderIdOrCode) {
    const order = await getOrderById(orderIdOrCode);
    // `getOrderById` populates `user_id`, so it can be either ObjectId or a populated document.
    const orderOwnerId =
      (order as any).user_id?._id?.toString?.() ??
      (order as any).user_id?.toString?.();
    appAssert(
      orderOwnerId && orderOwnerId === userId.toString(),
      BAD_REQUEST,
      'Bạn không có quyền chat cho đơn hàng này'
    );
    orderIdToUse = order._id;
  }

  let conversation = await SupportConversationModel.findOne({
    user_id: userId,
    order_id: orderIdToUse,
    status: 'open',
  });

  if (!conversation) {
    conversation = await SupportConversationModel.create({
      user_id: userId,
      order_id: orderIdToUse,
      store_id: null,
      status: 'open',
    });
  }

  return conversation;
};

export const getMessages = async (conversationId: string, requesterId: mongoose.Types.ObjectId, role: string) => {
  const conversation = await SupportConversationModel.findById(conversationId);
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');

  // Only owner user or staff/admin can view
  const isOwner = conversation.user_id.toString() === requesterId.toString();
  const isStaff = role === 'STAFF' || role === 'ADMIN';
  appAssert(isOwner || isStaff, BAD_REQUEST, 'Bạn không có quyền xem cuộc trò chuyện này');

  const messages = await SupportMessageModel.find({ conversation_id: conversation._id }).sort({ createdAt: 1 });
  return { conversation, messages };
};

export const sendMessage = async (
  conversationId: string,
  senderId: mongoose.Types.ObjectId,
  role: string,
  content: string,
  image_url?: string
) => {
  appAssert(content.trim() || image_url, BAD_REQUEST, 'Nội dung tin nhắn hoặc ảnh không được để trống');

  const conversation = await SupportConversationModel.findById(conversationId);
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');

  const isOwner = conversation.user_id.toString() === senderId.toString();
  const isStaff = role === 'STAFF' || role === 'ADMIN';
  appAssert(isOwner || isStaff, BAD_REQUEST, 'Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này');

  const message = await SupportMessageModel.create({
    conversation_id: conversation._id,
    sender_type: isOwner ? 'USER' : 'STAFF',
    sender_id: senderId,
    content: content.trim(),
    image_url: image_url || null,
  });

  return message;
};

export const listStaffConversations = async () => {
  // For now: list all open conversations, newest first
  const conversations = await SupportConversationModel.find({ status: 'open' })
    .sort({ updatedAt: -1 })
    .populate('order_id')
    .populate('user_id');

  // For unread count and last message we need messages per conversation
  const results = await Promise.all(
    conversations.map(async (conv) => {
      const [lastMessage] = await SupportMessageModel.find({ conversation_id: conv._id })
        .sort({ createdAt: -1 })
        .limit(1);
      const unreadCount = await SupportMessageModel.countDocuments({
        conversation_id: conv._id,
        sender_type: 'USER',
        is_read: false,
      });

      const order: any = conv.order_id;
      const user: any = conv.user_id;

      return {
        id: conv._id.toString(),
        orderCode: order?.code ?? 'Tư vấn',
        orderId: order?._id?.toString() ?? '',
        customerName: user?.username ?? 'Khách hàng',
        lastMessage: lastMessage
          ? {
            content: lastMessage.content,
            image_url: lastMessage.image_url,
            createdAt: lastMessage.createdAt.toISOString(),
            senderType: lastMessage.sender_type,
          }
          : undefined,
        unreadCount,
        status: conv.status,
        createdAt: conv.createdAt.toISOString(),
      };
    })
  );

  return results;
};

export const markAsRead = async (conversationId: string, requesterId: mongoose.Types.ObjectId, role: string) => {
  const conversation = await SupportConversationModel.findById(conversationId);
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');

  // If staff, mark USER messages as read. If user, mark STAFF messages as read.
  const isStaff = role === 'STAFF' || role === 'ADMIN';
  const targetSenderType = isStaff ? 'USER' : 'STAFF';

  await SupportMessageModel.updateMany(
    {
      conversation_id: conversation._id,
      sender_type: targetSenderType,
      is_read: false,
    },
    { is_read: true }
  );

  return { success: true };
};

export const closeConversation = async (conversationId: string) => {
  const conversation = await SupportConversationModel.findByIdAndUpdate(
    conversationId,
    { status: 'closed' },
    { new: true }
  );
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');
  return conversation;
};

export const listUserConversations = async (userId: mongoose.Types.ObjectId) => {
  const conversations = await SupportConversationModel.find({ user_id: userId })
    .sort({ updatedAt: -1 })
    .populate('order_id');

  const results = await Promise.all(
    conversations.map(async (conv) => {
      const [lastMessage] = await SupportMessageModel.find({ conversation_id: conv._id })
        .sort({ createdAt: -1 })
        .limit(1);
      
      const unreadCount = await SupportMessageModel.countDocuments({
        conversation_id: conv._id,
        sender_type: 'STAFF',
        is_read: false,
      });

      const order: any = conv.order_id;

      return {
        id: conv._id.toString(),
        orderCode: order?.code ?? 'Tư vấn',
        orderId: order?._id?.toString() ?? '',
        lastMessage: lastMessage
          ? {
            content: lastMessage.content,
            image_url: lastMessage.image_url,
            createdAt: lastMessage.createdAt.toISOString(),
            senderType: lastMessage.sender_type,
          }
          : undefined,
        unreadCount,
        status: conv.status,
        updatedAt: conv.updatedAt.toISOString(),
      };
    })
  );

  return results;
};



