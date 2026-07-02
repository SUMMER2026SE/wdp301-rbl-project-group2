import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Abstract repository interface for cart operations.
/// Implemented in the data layer.
abstract class CartRepository {
  /// Get current user's cart.
  Future<Either<Failure, Map<String, dynamic>>> getCart();

  /// Add item to cart.
  Future<Either<Failure, Map<String, dynamic>>> addItem({
    required String productId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  });

  /// Update cart item quantity or details.
  Future<Either<Failure, Map<String, dynamic>>> updateItem({
    required String itemId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  });

  /// Remove item from cart.
  Future<Either<Failure, void>> removeItem(String itemId);

  /// Clear all items from cart.
  Future<Either<Failure, void>> clearCart();

  /// Merge local cart items into server cart.
  Future<Either<Failure, Map<String, dynamic>>> mergeCart(
    List<Map<String, dynamic>> items,
  );
}
