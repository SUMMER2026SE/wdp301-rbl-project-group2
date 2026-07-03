import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/features/staff_customers/domain/repositories/staff_customers_repository.dart';

class GetCustomersUseCase {
  final StaffCustomersRepository _repository;

  GetCustomersUseCase(this._repository);

  Future<Either<Failure, List<UserModel>>> call({
    int page = 1,
    int limit = 20,
    String? search,
    String? storeId,
  }) {
    return _repository.getCustomers(
      page: page,
      limit: limit,
      search: search,
      storeId: storeId,
    );
  }
}
