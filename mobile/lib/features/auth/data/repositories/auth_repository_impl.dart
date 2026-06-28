import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/core/storage/secure_storage.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/features/auth/domain/entities/user_entity.dart';
import 'package:foa_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:foa_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Implementation of [AuthRepository] using remote data source.
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;

  AuthRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
  }) async {
    try {
      final result = await _remoteDataSource.login(
        email: email,
        password: password,
      );

      // Persist tokens securely.
      await TokenStorage.saveTokens(
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      await TokenStorage.saveUserMeta(
        userId: result.user.id,
        role: result.user.role,
      );

      // Connect Socket.IO.
      SocketService().connect(result.accessToken);

      return Right(result.user.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> register({
    required String username,
    required String email,
    required String password,
  }) async {
    try {
      final user = await _remoteDataSource.register(
        username: username,
        email: email,
        password: password,
      );
      return Right(user.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> verifyEmail({
    required String email,
    required String code,
  }) async {
    try {
      await _remoteDataSource.verifyEmail(email: email, code: code);
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> resendVerifyEmail(String email) async {
    try {
      await _remoteDataSource.resendVerifyEmail(email);
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> forgotPassword(String email) async {
    try {
      await _remoteDataSource.forgotPassword(email);
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> verifyPasswordResetOtp({
    required String email,
    required String code,
  }) async {
    try {
      await _remoteDataSource.verifyPasswordResetOtp(email: email, code: code);
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> resetPassword({
    required String email,
    required String code,
    required String password,
  }) async {
    try {
      await _remoteDataSource.resetPassword(
        email: email,
        code: code,
        password: password,
      );
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> getCurrentUser() async {
    try {
      final user = await _remoteDataSource.getCurrentUser();
      return Right(user.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> loginWithGoogle(String credential) async {
    try {
      final result = await _remoteDataSource.loginWithGoogle(credential);

      await TokenStorage.saveTokens(
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      await TokenStorage.saveUserMeta(
        userId: result.user.id,
        role: result.user.role,
      );

      SocketService().connect(result.accessToken);

      return Right(result.user.toEntity());
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await _remoteDataSource.logout();
    } catch (_) {
      // Non-critical.
    }

    SocketService().disconnect();
    await TokenStorage.clearAll();
    ApiClient.reset();
    return const Right(null);
  }

  /// Map caught exceptions to typed [Failure] using typed exceptions
  /// from [ErrorInterceptor] instead of fragile string matching.
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

        // Validation errors — pass field-level details if present.
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

