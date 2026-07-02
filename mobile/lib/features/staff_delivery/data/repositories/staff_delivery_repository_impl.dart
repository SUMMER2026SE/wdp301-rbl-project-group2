import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_delivery/data/datasources/staff_delivery_remote_datasource.dart';
import 'package:foa_mobile/features/staff_delivery/domain/repositories/staff_delivery_repository.dart';

class StaffDeliveryRepositoryImpl implements StaffDeliveryRepository {
  final StaffDeliveryRemoteDataSource _remoteDataSource;

  StaffDeliveryRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<OrderModel>>> getAssignedDeliveries({
    required String storeId,
    required String driverId,
  }) async {
    try {
      final deliveries = await _remoteDataSource.getAssignedDeliveries(
        storeId: storeId,
        driverId: driverId,
      );
      return Right(deliveries);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> assignDelivery({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _remoteDataSource.assignDelivery(
        orderId: orderId,
        storeId: storeId,
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
  Future<Either<Failure, void>> completeDelivery({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _remoteDataSource.completeDelivery(
        orderId: orderId,
        storeId: storeId,
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
}
