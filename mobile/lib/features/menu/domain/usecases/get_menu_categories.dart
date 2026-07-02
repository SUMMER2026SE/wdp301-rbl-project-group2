import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/products/domain/entities/category_entity.dart';
import 'package:foa_mobile/features/products/domain/repositories/product_repository.dart';

class GetMenuCategoriesUseCase {
  final ProductRepository repository;

  GetMenuCategoriesUseCase(this.repository);

  Future<Either<Failure, List<CategoryEntity>>> call() {
    return repository.getCategories();
  }
}
