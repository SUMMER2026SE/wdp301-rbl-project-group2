import 'package:foa_mobile/features/support_chat/domain/entities/chat_entity.dart';

/// JSON-serializable message model matching backend response.
class MessageModel {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderRole; // customer, staff, admin
  final String content;
  final String? image;
  final bool read;
  final String createdAt;

  const MessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    required this.content,
    this.image,
    this.read = false,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['_id'] as String? ?? '',
      conversationId: json['conversationId'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      senderRole: json['senderRole'] as String? ?? 'customer',
      content: json['content'] as String? ?? '',
      image: json['image'] as String?,
      read: json['read'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'conversationId': conversationId,
    'senderId': senderId,
    'senderRole': senderRole,
    'content': content,
    'image': image,
    'read': read,
    'createdAt': createdAt,
  };

  MessageEntity toEntity() => MessageEntity(
    id: id,
    conversationId: conversationId,
    senderId: senderId,
    senderRole: senderRole,
    content: content,
    image: image,
    read: read,
    createdAt: createdAt,
  );
}
