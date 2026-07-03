import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/models/order_model.dart';

abstract class StaffCustomersRepository {
  Future<Either<Failure, List<UserModel>>> getCustomers({
    int page = 1,
    int limit = 20,
    String? search,
    String? storeId,
  });

  Future<Either<Failure, UserModel>> getCustomerById({
    required String customerId,
  });

  Future<Either<Failure, List<OrderModel>>> getCustomerOrders({
    required String customerId,
  });
}
