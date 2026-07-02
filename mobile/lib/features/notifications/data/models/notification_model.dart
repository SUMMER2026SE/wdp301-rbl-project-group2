/// JSON-serializable notification model matching backend response.
class NotificationModel {
  final String id;
  final String userId;
  final String? orderId;
  final String title;
  final String body;
  final String type; // order_update, promotion, system
  final bool read;
  final String createdAt;

  const NotificationModel({
    required this.id,
    required this.userId,
    this.orderId,
    required this.title,
    required this.body,
    required this.type,
    this.read = false,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      orderId: json['orderId'] as String?,
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      type: json['type'] as String? ?? 'system',
      read: json['read'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'userId': userId,
        'orderId': orderId,
        'title': title,
        'body': body,
        'type': type,
        'read': read,
        'createdAt': createdAt,
      };
}
