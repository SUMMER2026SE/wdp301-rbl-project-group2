import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_customers/data/datasources/staff_customers_remote_datasource.dart';
import 'package:foa_mobile/features/staff_customers/domain/repositories/staff_customers_repository.dart';

class StaffCustomersRepositoryImpl implements StaffCustomersRepository {
  final StaffCustomersRemoteDataSource _remoteDataSource;

  StaffCustomersRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<UserModel>>> getCustomers({
    int? page,
    int? limit,
    String? search,
  }) async {
    try {
      final customers = await _remoteDataSource.getCustomers(
        page: page,
        limit: limit,
        search: search,
      );
      return Right(customers);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, UserModel>> getCustomerById({
    required String customerId,
  }) async {
    try {
      final customer = await _remoteDataSource.getCustomerById(customerId: customerId);
      return Right(customer);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<OrderModel>>> getCustomerOrders({
    required String customerId,
  }) async {
    try {
      final orders = await _remoteDataSource.getCustomerOrders(customerId: customerId);
      return Right(orders);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }
}
