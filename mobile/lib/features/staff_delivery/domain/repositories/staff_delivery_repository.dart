import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/order_model.dart';

abstract class StaffDeliveryRepository {
  Future<Either<Failure, List<OrderModel>>> getAssignedDeliveries({
    required String storeId,
    required String driverId,
  });

  Future<Either<Failure, void>> assignDelivery({
    required String orderId,
    required String storeId,
  });

  Future<Either<Failure, void>> completeDelivery({
    required String orderId,
    required String storeId,
  });
}
