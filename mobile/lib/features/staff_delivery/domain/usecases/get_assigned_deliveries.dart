import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_delivery/domain/repositories/staff_delivery_repository.dart';

class GetAssignedDeliveriesUseCase {
  final StaffDeliveryRepository _repository;

  GetAssignedDeliveriesUseCase(this._repository);

  Future<Either<Failure, List<OrderModel>>> call({
    required String storeId,
    required String driverId,
  }) {
    return _repository.getAssignedDeliveries(
      storeId: storeId,
      driverId: driverId,
    );
  }
}
