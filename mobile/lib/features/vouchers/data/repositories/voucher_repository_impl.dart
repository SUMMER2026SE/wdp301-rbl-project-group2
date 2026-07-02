import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/vouchers/data/datasources/voucher_remote_datasource.dart';
import 'package:foa_mobile/features/vouchers/domain/repositories/voucher_repository.dart';

/// Implementation of [VoucherRepository] using remote data source.
class VoucherRepositoryImpl implements VoucherRepository {
  final VoucherRemoteDataSource _remoteDataSource;

  VoucherRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getVouchers() async {
    try {
      final vouchers = await _remoteDataSource.getVouchers();
      return Right(vouchers);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getWalletVouchers() async {
    try {
      final vouchers = await _remoteDataSource.getWalletVouchers();
      return Right(vouchers);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> getVoucherById(String id) async {
    try {
      final voucher = await _remoteDataSource.getVoucherById(id);
      return Right(voucher);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> redeemVoucher(String code) async {
    try {
      final voucher = await _remoteDataSource.redeemVoucher(code);
      return Right(voucher);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> validateVoucher({
    required String code,
    required double orderTotal,
  }) async {
    try {
      final result = await _remoteDataSource.validateVoucher(
        code: code,
        orderTotal: orderTotal,
      );
      return Right(result);
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

        return ServerFailure(
          message: inner.message,
          statusCode: code,
        );
      }
    }

    return ServerFailure(message: error.toString());
  }
}
