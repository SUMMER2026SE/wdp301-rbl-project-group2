import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/membership/data/datasources/membership_remote_datasource.dart';
import 'package:foa_mobile/features/membership/domain/repositories/membership_repository.dart';

/// Implementation of [MembershipRepository] using remote data source.
class MembershipRepositoryImpl implements MembershipRepository {
  final MembershipRemoteDataSource _remoteDataSource;

  MembershipRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, Map<String, dynamic>>> getMembership() async {
    try {
      final membership = await _remoteDataSource.getMembership();
      return Right(membership);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> getPoints() async {
    try {
      final points = await _remoteDataSource.getPoints();
      return Right(points);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getPointsHistory() async {
    try {
      final history = await _remoteDataSource.getPointsHistory();
      return Right(history);
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
