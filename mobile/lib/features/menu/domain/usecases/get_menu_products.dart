import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/products/domain/repositories/product_repository.dart';

class GetMenuProductsUseCase {
  final ProductRepository repository;

  GetMenuProductsUseCase(this.repository);

  Future<Either<Failure, ProductListResult>> call({
    String? category,
    String? search,
    double? minRating,
    String? sort,
    double? minPrice,
    double? maxPrice,
    bool? isAvailable,
    int page = 1,
    int limit = 12,
  }) {
    return repository.getProducts(
      category: category,
      search: search,
      minRating: minRating,
      sort: sort,
      minPrice: minPrice,
      maxPrice: maxPrice,
      isAvailable: isAvailable,
      page: page,
      limit: limit,
    );
  }
}
