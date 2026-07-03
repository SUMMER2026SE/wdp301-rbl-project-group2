class ConversationModel {
  final String id;
  final String customerId;
  final String customerName;
  final String orderId;
  final String orderCode;
  final ChatMessageModel? lastMessage;
  final int unreadCount;
  final String status; // open, closed
  final DateTime createdAt;

  ConversationModel({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.orderId,
    required this.orderCode,
    this.lastMessage,
    this.unreadCount = 0,
    required this.status,
    required this.createdAt,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    return ConversationModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      customerId: json['customerId'] as String? ?? '',
      customerName: json['customerName'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      orderCode: json['orderCode'] as String? ?? '',
      lastMessage: json['lastMessage'] != null
          ? ChatMessageModel.fromJson(
              json['lastMessage'] as Map<String, dynamic>,
            )
          : null,
      unreadCount: json['unreadCount'] as int? ?? 0,
      status: json['status'] as String? ?? 'open',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String).toLocal()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'customerId': customerId,
      'customerName': customerName,
      'orderId': orderId,
      'orderCode': orderCode,
      'lastMessage': lastMessage?.toJson(),
      'unreadCount': unreadCount,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class ChatMessageModel {
  final String id;
  final String senderType; // USER, STAFF
  final String content;
  final String? imageUrl;
  final DateTime createdAt;

  ChatMessageModel({
    required this.id,
    required this.senderType,
    required this.content,
    this.imageUrl,
    required this.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      senderType: json['senderType'] as String? ?? 'USER',
      content: json['content'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String).toLocal()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'senderType': senderType,
      'content': content,
      'imageUrl': imageUrl,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
