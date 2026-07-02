import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_orders/domain/repositories/staff_orders_repository.dart';

class GetStaffOrdersUseCase {
  final StaffOrdersRepository _repository;

  GetStaffOrdersUseCase(this._repository);

  Future<Either<Failure, List<OrderModel>>> call({
    required String storeId,
    String? status,
    int? page,
    int? limit,
  }) {
    return _repository.getStaffOrders(
      storeId: storeId,
      status: status,
      page: page,
      limit: limit,
    );
  }
}
