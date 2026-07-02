import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/reviews/data/datasources/review_remote_datasource.dart';
import 'package:foa_mobile/features/reviews/domain/repositories/review_repository.dart';

/// Implementation of [ReviewRepository] using remote data source.
class ReviewRepositoryImpl implements ReviewRepository {
  final ReviewRemoteDataSource _remoteDataSource;

  ReviewRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, Map<String, dynamic>>> createReview({
    required String orderId,
    required String productId,
    required int rating,
    required String comment,
    List<String>? images,
  }) async {
    try {
      final review = await _remoteDataSource.createReview(
        orderId: orderId,
        productId: productId,
        rating: rating,
        comment: comment,
        images: images,
      );
      return Right(review);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getReviewsByOrder(
    String orderId,
  ) async {
    try {
      final reviews = await _remoteDataSource.getReviewsByOrder(orderId);
      return Right(reviews);
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
