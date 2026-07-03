import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/product_model.dart';
import 'package:foa_mobile/features/staff_menu/domain/repositories/staff_menu_repository.dart';

class GetStoreProductsUseCase {
  final StaffMenuRepository _repository;

  GetStoreProductsUseCase(this._repository);

  Future<Either<Failure, List<ProductModel>>> call({
    required String storeId,
    bool showAll = true,
    int page = 1,
    int limit = 50,
  }) {
    return _repository.getStoreProducts(
      storeId: storeId,
      showAll: showAll,
      page: page,
      limit: limit,
    );
  }
}
