import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/staff_orders/domain/repositories/staff_orders_repository.dart';

class ConfirmStaffOrderUseCase {
  final StaffOrdersRepository _repository;
  ConfirmStaffOrderUseCase(this._repository);

  Future<Either<Failure, void>> call({
    required String orderId,
    required String storeId,
  }) {
    return _repository.confirmOrder(orderId: orderId, storeId: storeId);
  }
}

class RejectStaffOrderUseCase {
  final StaffOrdersRepository _repository;
  RejectStaffOrderUseCase(this._repository);

  Future<Either<Failure, void>> call({
    required String orderId,
    required String storeId,
    required String reason,
  }) {
    return _repository.rejectOrder(orderId: orderId, storeId: storeId, reason: reason);
  }
}

class ReadyStaffOrderUseCase {
  final StaffOrdersRepository _repository;
  ReadyStaffOrderUseCase(this._repository);

  Future<Either<Failure, void>> call({
    required String orderId,
    required String storeId,
  }) {
    return _repository.readyOrder(orderId: orderId, storeId: storeId);
  }
}
