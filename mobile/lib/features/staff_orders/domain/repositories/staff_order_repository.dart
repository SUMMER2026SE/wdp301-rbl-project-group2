import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/orders/domain/entities/order_entity.dart';
import 'package:dartz/dartz.dart';

/// Abstract repository interface for staff order management.
/// Implemented in the data layer.
abstract class StaffOrderRepository {
  /// Get paginated staff order list, optionally filtered by status.
  Future<Either<Failure, List<OrderEntity>>> getStaffOrders({
    int page = 1,
    int limit = 10,
    String? status,
  });

  /// Get a single order by ID.
  Future<Either<Failure, OrderEntity>> getStaffOrderById(String id);

  /// Confirm a pending order.
  Future<Either<Failure, OrderEntity>> confirmOrder(String id);

  /// Reject a pending order.
  Future<Either<Failure, OrderEntity>> rejectOrder(String id, {String? reason});

  /// Mark an order as ready for delivery.
  Future<Either<Failure, OrderEntity>> readyOrder(String id);

  /// Mark an order as being delivered.
  Future<Either<Failure, OrderEntity>> deliverOrder(String id);

  /// Mark an order as completed.
  Future<Either<Failure, OrderEntity>> completeOrder(String id);
}
