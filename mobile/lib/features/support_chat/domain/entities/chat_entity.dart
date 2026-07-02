/// Pure domain entity for a support conversation.
class ConversationEntity {
  final String id;
  final String userId;
  final String? userName;
  final String? orderId;
  final String status; // active, closed
  final String? lastMessage;
  final int unreadCount;
  final String? updatedAt;

  const ConversationEntity({
    required this.id,
    required this.userId,
    this.userName,
    this.orderId,
    required this.status,
    this.lastMessage,
    this.unreadCount = 0,
    this.updatedAt,
  });
}

/// Pure domain entity for a support message.
class MessageEntity {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderRole; // customer, staff, admin
  final String content;
  final String? image;
  final bool read;
  final String createdAt;

  const MessageEntity({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    required this.content,
    this.image,
    this.read = false,
    required this.createdAt,
  });
}
