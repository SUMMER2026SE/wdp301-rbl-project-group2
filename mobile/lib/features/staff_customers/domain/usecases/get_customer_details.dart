import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_customers/domain/repositories/staff_customers_repository.dart';

class GetCustomerDetailsResult {
  final UserModel customer;
  final List<OrderModel> orders;

  GetCustomerDetailsResult({required this.customer, required this.orders});
}

class GetCustomerDetailsUseCase {
  final StaffCustomersRepository _repository;

  GetCustomerDetailsUseCase(this._repository);

  Future<Either<Failure, GetCustomerDetailsResult>> call({
    required String customerId,
  }) async {
    final detailResult = await _repository.getCustomerById(
      customerId: customerId,
    );
    final ordersResult = await _repository.getCustomerOrders(
      customerId: customerId,
    );

    return detailResult.fold((failure) => Left(failure), (customer) async {
      return ordersResult.fold(
        (failure) => Left(failure),
        (orders) =>
            Right(GetCustomerDetailsResult(customer: customer, orders: orders)),
      );
    });
  }
}
