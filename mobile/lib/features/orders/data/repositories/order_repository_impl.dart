import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/orders/data/datasources/order_remote_datasource.dart';
import 'package:foa_mobile/features/orders/domain/entities/order_entity.dart';
import 'package:foa_mobile/features/orders/domain/repositories/order_repository.dart';

/// Implementation of [OrderRepository] using remote data source.
class OrderRepositoryImpl implements OrderRepository {
  final OrderRemoteDataSource _remoteDataSource;

  OrderRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<OrderEntity>>> getMyOrders({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    try {
      final result = await _remoteDataSource.getMyOrders(
        page: page,
        limit: limit,
        status: status,
      );
      return Right(result.orders.map((o) => o.toEntity()).toList());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> getOrderById(String id) async {
    try {
      final order = await _remoteDataSource.getOrderById(id);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> cancelOrder(
    String id, {
    String? reason,
  }) async {
    try {
      final order = await _remoteDataSource.cancelOrder(id, reason: reason);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> customerConfirmReceived(
    String id,
  ) async {
    try {
      final order = await _remoteDataSource.customerConfirmReceived(id);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Map caught exceptions to typed [Failure].
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

        return ServerFailure(message: inner.message, statusCode: code);
      }
    }

    return ServerFailure(message: error.toString());
  }
}
