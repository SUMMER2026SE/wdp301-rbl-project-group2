/// JSON-serializable review model matching backend response.
class ReviewModel {
  final String id;
  final String userId;
  final String orderId;
  final String productId;
  final String? productName;
  final int rating;
  final String? comment;
  final List<String> images;
  final String? reply;
  final String createdAt;

  const ReviewModel({
    required this.id,
    required this.userId,
    required this.orderId,
    required this.productId,
    this.productName,
    required this.rating,
    this.comment,
    this.images = const [],
    this.reply,
    required this.createdAt,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id: json['_id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String?,
      rating: json['rating'] as int? ?? 5,
      comment: json['comment'] as String?,
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      reply: json['reply'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'userId': userId,
        'orderId': orderId,
        'productId': productId,
        'productName': productName,
        'rating': rating,
        'comment': comment,
        'images': images,
        'reply': reply,
        'createdAt': createdAt,
      };
}
