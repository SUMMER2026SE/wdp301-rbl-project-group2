import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/products/data/datasources/product_remote_datasource.dart';
import 'package:foa_mobile/features/products/domain/entities/category_entity.dart';
import 'package:foa_mobile/features/products/domain/entities/product_entity.dart';
import 'package:foa_mobile/features/products/domain/repositories/product_repository.dart';

/// Implementation of [ProductRepository] using remote data source.
class ProductRepositoryImpl implements ProductRepository {
  final ProductRemoteDataSource _remoteDataSource;

  ProductRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, ProductListResult>> getProducts({
    String? category,
    String? search,
    double? minRating,
    String? sort,
    double? minPrice,
    double? maxPrice,
    bool? isAvailable,
    int page = 1,
    int limit = 12,
  }) async {
    try {
      final result = await _remoteDataSource.getProducts(
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

      final productEntities = result.products.map((p) => p.toEntity()).toList();

      return Right(
        ProductListResult(
          products: productEntities,
          currentPage: result.pagination?.page ?? page,
          totalPages: result.pagination?.totalPages ?? 1,
          total: result.pagination?.total ?? productEntities.length,
        ),
      );
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, ProductEntity>> getProductById(String id) async {
    try {
      final product = await _remoteDataSource.getProductById(id);
      return Right(product.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, List<CategoryEntity>>> getCategories() async {
    try {
      final categories = await _remoteDataSource.getCategories();
      return Right(categories.map((c) => c.toEntity()).toList());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> getSafeFoods(
    List<String> allergies,
  ) async {
    try {
      final result = await _remoteDataSource.getSafeFoods(allergies);
      return Right(result);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> getRecommendations() async {
    try {
      final result = await _remoteDataSource.getRecommendations();
      return Right(result);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, List<dynamic>>> getAllergens() async {
    try {
      final allergens = await _remoteDataSource.getAllergens();
      return Right(allergens);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Map caught exceptions to typed [Failure] using the same error
  /// mapping pattern from [AuthRepositoryImpl].
  Failure _mapErrorToFailure(dynamic error) {
    if (error is DioException) {
      final inner = error.error;

      if (inner is NetworkException) {
        return const NetworkFailure();
      }
      if (inner is TimeoutFailureException) {
        return const TimeoutFailure();
      }
      if (inner is ServerException) {
        final code = inner.statusCode;

        if (code == 401) return const AuthFailure();
        if (code == 403) return const ForbiddenFailure();
        if (code == 404) return const NotFoundFailure();

        if (inner.errorCode == 'VALIDATION_ERROR') {
          Map<String, String>? fieldErrors;
          if (inner.details != null && inner.details!.isNotEmpty) {
            fieldErrors = {
              for (final d in inner.details!)
                (d['path'] as String? ?? ''): (d['message'] as String? ?? ''),
            };
          }
          return ValidationFailure(
            message: inner.message,
            fieldErrors: fieldErrors,
          );
        }

        return ServerFailure(message: inner.message, statusCode: code);
      }
    }

    return ServerFailure(message: error.toString());
  }
}
