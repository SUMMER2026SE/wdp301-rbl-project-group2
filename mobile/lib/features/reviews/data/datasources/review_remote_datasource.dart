import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for review API calls.
class ReviewRemoteDataSource {
  final Dio _dio;

  ReviewRemoteDataSource() : _dio = ApiClient().dio;

  /// Create a review for an order product.
  Future<Map<String, dynamic>> createReview({
    required String orderId,
    required String productId,
    required int rating,
    required String comment,
    List<String>? images,
  }) async {
    final response = await _dio.post(
      ApiEndpoints.reviews,
      data: {
        'orderId': orderId,
        'productId': productId,
        'rating': rating,
        'comment': comment,
        'images': ?images,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Get reviews for a specific order.
  Future<List<Map<String, dynamic>>> getReviewsByOrder(String orderId) async {
    final response = await _dio.get(ApiEndpoints.reviewByOrder(orderId));
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  /// Get reviews for a specific product with pagination.
  Future<Map<String, dynamic>> getProductReviews({
    required String productId,
    int page = 1,
    int limit = 10,
  }) async {
    final response = await _dio.get(
      ApiEndpoints.productReviews(productId),
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = response.data as Map<String, dynamic>;
    return {
      'reviews':
          (data['data'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
      'pagination': data['pagination'] as Map<String, dynamic>? ?? {},
    };
  }
}
