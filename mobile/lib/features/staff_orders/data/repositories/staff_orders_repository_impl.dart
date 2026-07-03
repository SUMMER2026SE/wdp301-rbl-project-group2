import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_orders/data/datasources/staff_orders_remote_datasource.dart';
import 'package:foa_mobile/features/staff_orders/domain/repositories/staff_orders_repository.dart';

class StaffOrdersRepositoryImpl implements StaffOrdersRepository {
  final StaffOrdersRemoteDataSource _remoteDataSource;

  StaffOrdersRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<OrderModel>>> getStaffOrders({
    required String storeId,
    String? status,
    int? page,
    int? limit,
  }) async {
    try {
      final orders = await _remoteDataSource.getStaffOrders(
        storeId: storeId,
        status: status,
        page: page,
        limit: limit,
      );
      return Right(orders);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, OrderModel>> getStaffOrderById({
    required String orderId,
    required String storeId,
  }) async {
    try {
      final order = await _remoteDataSource.getStaffOrderById(
        orderId: orderId,
        storeId: storeId,
      );
      return Right(order);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> confirmOrder({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _remoteDataSource.confirmOrder(orderId: orderId, storeId: storeId);
      return const Right(null);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> rejectOrder({
    required String orderId,
    required String storeId,
    required String reason,
  }) async {
    try {
      await _remoteDataSource.rejectOrder(
        orderId: orderId,
        storeId: storeId,
        reason: reason,
      );
      return const Right(null);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> readyOrder({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _remoteDataSource.readyOrder(orderId: orderId, storeId: storeId);
      return const Right(null);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }
}
