import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/product_model.dart';
import 'package:foa_mobile/features/staff_menu/data/datasources/staff_menu_remote_datasource.dart';
import 'package:foa_mobile/features/staff_menu/domain/repositories/staff_menu_repository.dart';

class StaffMenuRepositoryImpl implements StaffMenuRepository {
  final StaffMenuRemoteDataSource _remoteDataSource;

  StaffMenuRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<ProductModel>>> getStoreProducts({
    required String storeId,
    bool showAll = true,
  }) async {
    try {
      final products = await _remoteDataSource.getStoreProducts(
        storeId: storeId,
        showAll: showAll,
      );
      return Right(products);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<String>>> getCategories() async {
    try {
      final categories = await _remoteDataSource.getCategories();
      return Right(categories);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, ProductModel>> updateProductAvailability({
    required String productId,
    required bool isAvailable,
    required String status,
  }) async {
    try {
      final product = await _remoteDataSource.updateProductAvailability(
        productId: productId,
        isAvailable: isAvailable,
        status: status,
      );
      return Right(product);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }
}
