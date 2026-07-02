import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/product_model.dart';

abstract class StaffMenuRepository {
  Future<Either<Failure, List<ProductModel>>> getStoreProducts({
    required String storeId,
    bool showAll = true,
  });

  Future<Either<Failure, List<String>>> getCategories();

  Future<Either<Failure, ProductModel>> updateProductAvailability({
    required String productId,
    required bool isAvailable,
    required String status,
  });
}
