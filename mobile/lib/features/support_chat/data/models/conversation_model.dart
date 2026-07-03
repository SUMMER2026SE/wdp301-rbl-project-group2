import 'package:foa_mobile/features/support_chat/domain/entities/chat_entity.dart';

/// JSON-serializable conversation model matching backend response.
class ConversationModel {
  final String id;
  final String userId;
  final String? userName;
  final String? orderId;
  final String status; // active, closed
  final String? lastMessage;
  final int unreadCount;
  final String? updatedAt;

  const ConversationModel({
    required this.id,
    required this.userId,
    this.userName,
    this.orderId,
    required this.status,
    this.lastMessage,
    this.unreadCount = 0,
    this.updatedAt,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    return ConversationModel(
      id: json['_id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      userName: json['userName'] as String?,
      orderId: json['orderId'] as String?,
      status: json['status'] as String? ?? 'active',
      lastMessage: json['lastMessage'] as String?,
      unreadCount: json['unreadCount'] as int? ?? 0,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'userId': userId,
    'userName': userName,
    'orderId': orderId,
    'status': status,
    'lastMessage': lastMessage,
    'unreadCount': unreadCount,
    'updatedAt': updatedAt,
  };

  ConversationEntity toEntity() => ConversationEntity(
    id: id,
    userId: userId,
    userName: userName,
    orderId: orderId,
    status: status,
    lastMessage: lastMessage,
    unreadCount: unreadCount,
    updatedAt: updatedAt,
  );
}
