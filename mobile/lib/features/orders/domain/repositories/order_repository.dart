import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/orders/domain/entities/order_entity.dart';
import 'package:dartz/dartz.dart';

/// Abstract repository interface for customer orders.
/// Implemented in the data layer.
abstract class OrderRepository {
  /// Get paginated list of current user's orders, optionally filtered by status.
  Future<Either<Failure, List<OrderEntity>>> getMyOrders({
    int page = 1,
    int limit = 10,
    String? status,
  });

  /// Get a single order by its ID.
  Future<Either<Failure, OrderEntity>> getOrderById(String id);

  /// Cancel an order (customer-initiated).
  Future<Either<Failure, OrderEntity>> cancelOrder(String id, {String? reason});

  /// Customer confirms they have received the order.
  Future<Either<Failure, OrderEntity>> customerConfirmReceived(String id);
}
