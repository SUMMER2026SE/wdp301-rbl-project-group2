import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/orders/domain/entities/order_entity.dart';
import 'package:foa_mobile/features/staff_orders/data/datasources/staff_order_remote_datasource.dart';
import 'package:foa_mobile/features/staff_orders/domain/repositories/staff_order_repository.dart';

/// Implementation of [StaffOrderRepository] using remote data source.
class StaffOrderRepositoryImpl implements StaffOrderRepository {
  final StaffOrderRemoteDataSource _remoteDataSource;

  StaffOrderRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<OrderEntity>>> getStaffOrders({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    try {
      final result = await _remoteDataSource.getStaffOrders(
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
  Future<Either<Failure, OrderEntity>> getStaffOrderById(String id) async {
    try {
      final order = await _remoteDataSource.getStaffOrderById(id);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> confirmOrder(String id) async {
    try {
      final order = await _remoteDataSource.confirmOrder(id);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> rejectOrder(
    String id, {
    String? reason,
  }) async {
    try {
      final order = await _remoteDataSource.rejectOrder(id, reason: reason);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> readyOrder(String id) async {
    try {
      final order = await _remoteDataSource.readyOrder(id);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> deliverOrder(String id) async {
    try {
      final order = await _remoteDataSource.deliverOrder(id);
      return Right(order.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> completeOrder(String id) async {
    try {
      final order = await _remoteDataSource.completeOrder(id);
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
