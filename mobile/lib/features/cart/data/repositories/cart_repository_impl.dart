import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/cart/data/datasources/cart_remote_datasource.dart';
import 'package:foa_mobile/features/cart/domain/repositories/cart_repository.dart';

/// Implementation of [CartRepository] using remote data source.
class CartRepositoryImpl implements CartRepository {
  final CartRemoteDataSource _remoteDataSource;

  CartRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, Map<String, dynamic>>> getCart() async {
    try {
      final cart = await _remoteDataSource.getCart();
      return Right(cart);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> addItem({
    required String productId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  }) async {
    try {
      final cart = await _remoteDataSource.addItem(
        productId: productId,
        quantity: quantity,
        variations: variations,
        note: note,
      );
      return Right(cart);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> updateItem({
    required String itemId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  }) async {
    try {
      final cart = await _remoteDataSource.updateItem(
        itemId: itemId,
        quantity: quantity,
        variations: variations,
        note: note,
      );
      return Right(cart);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> removeItem(String itemId) async {
    try {
      await _remoteDataSource.removeItem(itemId);
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> clearCart() async {
    try {
      await _remoteDataSource.clearCart();
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> mergeCart(
    List<Map<String, dynamic>> items,
  ) async {
    try {
      final cart = await _remoteDataSource.mergeCart(items);
      return Right(cart);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Map caught exceptions to typed [Failure] using typed exceptions
  /// from [ErrorInterceptor].
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
