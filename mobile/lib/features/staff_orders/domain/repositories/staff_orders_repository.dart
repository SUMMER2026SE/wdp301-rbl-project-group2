import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/order_model.dart';

abstract class StaffOrdersRepository {
  Future<Either<Failure, List<OrderModel>>> getStaffOrders({
    required String storeId,
    String? status,
    int page = 1,
    int limit = 20,
  });

  Future<Either<Failure, OrderModel>> getStaffOrderById({
    required String orderId,
    required String storeId,
  });

  Future<Either<Failure, void>> confirmOrder({
    required String orderId,
    required String storeId,
  });

  Future<Either<Failure, void>> rejectOrder({
    required String orderId,
    required String storeId,
    required String reason,
  });

  Future<Either<Failure, void>> readyOrder({
    required String orderId,
    required String storeId,
  });
}
