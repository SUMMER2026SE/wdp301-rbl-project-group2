import mongoose from 'mongoose';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND } from '@/constants/http';
import { SupportConversationModel, SupportMessageModel } from '@/models';
import appAssert from '@/utils/app-assert';
import { getOrderById } from './order.service';

const isStaffRole = (role: string) => {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === 'staff' || normalizedRole === 'admin';
};

const assertStaffConversationScope = (
  conversation: { store_id?: mongoose.Types.ObjectId | null },
  role: string,
  requesterStoreId?: mongoose.Types.ObjectId
) => {
  if (role.toLowerCase() !== 'staff') return;

  appAssert(requesterStoreId, FORBIDDEN, 'Tài khoản nhân viên chưa được gán chi nhánh');
  appAssert(
    conversation.store_id?.toString() === requesterStoreId.toString(),
    FORBIDDEN,
    'Bạn không có quyền thao tác hội thoại ngoài chi nhánh của bạn'
  );
};

export const createOrGetConversation = async (userId: mongoose.Types.ObjectId, orderIdOrCode?: string) => {
  let orderIdToUse = null;
  let storeIdToUse: mongoose.Types.ObjectId | null = null;

  if (orderIdOrCode) {
    const order = await getOrderById(orderIdOrCode);
    // `getOrderById` may populate the customer, or return its ObjectId.
    const orderOwnerId = (order as any).cusId?._id?.toString?.() ?? (order as any).cusId?.toString?.();
    appAssert(
      orderOwnerId && orderOwnerId === userId.toString(),
      BAD_REQUEST,
      'Bạn không có quyền chat cho đơn hàng này'
    );
    orderIdToUse = order._id;
    storeIdToUse = (order as any).storeId ?? null;
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
      store_id: storeIdToUse,
      status: 'open',
    });
  }

  return conversation;
};

export const getMessages = async (
  conversationId: string,
  requesterId: mongoose.Types.ObjectId,
  role: string,
  requesterStoreId?: mongoose.Types.ObjectId
) => {
  const conversation = await SupportConversationModel.findById(conversationId);
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');

  // Only owner user or staff/admin can view
  const isOwner = conversation.user_id.toString() === requesterId.toString();
  const isStaff = isStaffRole(role);
  appAssert(isOwner || isStaff, BAD_REQUEST, 'Bạn không có quyền xem cuộc trò chuyện này');
  assertStaffConversationScope(conversation, role, requesterStoreId);

  const messages = await SupportMessageModel.find({ conversation_id: conversation._id }).sort({ createdAt: 1 });
  return { conversation, messages };
};

export const sendMessage = async (
  conversationId: string,
  senderId: mongoose.Types.ObjectId,
  role: string,
  content: string,
  imageUrl?: string,
  requesterStoreId?: mongoose.Types.ObjectId
) => {
  appAssert(content.trim() || imageUrl, BAD_REQUEST, 'Nội dung tin nhắn hoặc ảnh không được để trống');

  const conversation = await SupportConversationModel.findById(conversationId);
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');

  const isOwner = conversation.user_id.toString() === senderId.toString();
  const isStaff = isStaffRole(role);
  appAssert(isOwner || isStaff, BAD_REQUEST, 'Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này');
  assertStaffConversationScope(conversation, role, requesterStoreId);

  const message = await SupportMessageModel.create({
    conversation_id: conversation._id,
    sender_type: isOwner ? 'USER' : 'STAFF',
    sender_id: senderId,
    content: content.trim(),
    image_url: imageUrl || null,
  });

  conversation.updatedAt = new Date();
  await conversation.save();

  return message;
};

export const listStaffConversations = async (storeId?: string) => {
  const filter: Record<string, unknown> = { status: 'open' };
  if (storeId) {
    filter.store_id = new mongoose.Types.ObjectId(storeId);
  }
  const conversations = await SupportConversationModel.find(filter)
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
              imageUrl: lastMessage.image_url,
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

export const markAsRead = async (
  conversationId: string,
  requesterId: mongoose.Types.ObjectId,
  role: string,
  requesterStoreId?: mongoose.Types.ObjectId
) => {
  const conversation = await SupportConversationModel.findById(conversationId);
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');

  // If staff, mark USER messages as read. If user, mark STAFF messages as read.
  const isOwner = conversation.user_id.toString() === requesterId.toString();
  const isStaff = isStaffRole(role);
  appAssert(isOwner || isStaff, BAD_REQUEST, 'Bạn không có quyền cập nhật cuộc trò chuyện này');
  assertStaffConversationScope(conversation, role, requesterStoreId);
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

export const closeConversation = async (
  conversationId: string,
  role: string,
  requesterStoreId?: mongoose.Types.ObjectId
) => {
  const conversation = await SupportConversationModel.findById(conversationId);
  appAssert(conversation, NOT_FOUND, 'Không tìm thấy cuộc trò chuyện');
  assertStaffConversationScope(conversation, role, requesterStoreId);

  conversation.status = 'closed';
  await conversation.save();
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
              imageUrl: lastMessage.image_url,
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
