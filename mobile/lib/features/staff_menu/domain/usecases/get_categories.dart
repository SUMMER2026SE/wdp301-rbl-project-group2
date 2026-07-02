import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/staff_menu/domain/repositories/staff_menu_repository.dart';

class GetCategoriesUseCase {
  final StaffMenuRepository _repository;

  GetCategoriesUseCase(this._repository);

  Future<Either<Failure, List<String>>> call() {
    return _repository.getCategories();
  }
}
