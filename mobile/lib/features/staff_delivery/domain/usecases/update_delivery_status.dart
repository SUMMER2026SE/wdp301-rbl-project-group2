import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/staff_delivery/domain/repositories/staff_delivery_repository.dart';

class AssignDeliveryUseCase {
  final StaffDeliveryRepository _repository;
  AssignDeliveryUseCase(this._repository);

  Future<Either<Failure, void>> call({
    required String orderId,
    required String storeId,
  }) {
    return _repository.assignDelivery(orderId: orderId, storeId: storeId);
  }
}

class CompleteDeliveryUseCase {
  final StaffDeliveryRepository _repository;
  CompleteDeliveryUseCase(this._repository);

  Future<Either<Failure, void>> call({
    required String orderId,
    required String storeId,
  }) {
    return _repository.completeDelivery(orderId: orderId, storeId: storeId);
  }
}
