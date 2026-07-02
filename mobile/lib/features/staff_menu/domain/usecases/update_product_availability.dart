import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/product_model.dart';
import 'package:foa_mobile/features/staff_menu/domain/repositories/staff_menu_repository.dart';

class UpdateProductAvailabilityUseCase {
  final StaffMenuRepository _repository;

  UpdateProductAvailabilityUseCase(this._repository);

  Future<Either<Failure, ProductModel>> call({
    required String productId,
    required bool isAvailable,
    required String status,
  }) {
    return _repository.updateProductAvailability(
      productId: productId,
      isAvailable: isAvailable,
      status: status,
    );
  }
}
