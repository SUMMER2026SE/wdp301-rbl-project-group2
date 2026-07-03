import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_orders/domain/repositories/staff_orders_repository.dart';

class GetStaffOrderByIdUseCase {
  final StaffOrdersRepository _repository;

  GetStaffOrderByIdUseCase(this._repository);

  Future<Either<Failure, OrderModel>> call({
    required String orderId,
    required String storeId,
  }) {
    return _repository.getStaffOrderById(orderId: orderId, storeId: storeId);
  }
}
