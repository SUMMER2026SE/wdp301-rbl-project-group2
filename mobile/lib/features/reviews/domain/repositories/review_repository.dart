import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Abstract repository interface for review operations.
/// Implemented in the data layer.
abstract class ReviewRepository {
  /// Create a review for an order product.
  Future<Either<Failure, Map<String, dynamic>>> createReview({
    required String orderId,
    required String productId,
    required int rating,
    required String comment,
    List<String>? images,
  });

  /// Get reviews for a specific order.
  Future<Either<Failure, List<Map<String, dynamic>>>> getReviewsByOrder(
    String orderId,
  );
}
