import 'package:foa_mobile/features/auth/domain/entities/user_entity.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:dartz/dartz.dart';

/// Abstract repository interface for authentication.
/// Implemented in the data layer.
abstract class AuthRepository {
  /// Login with email and password.
  Future<Either<Failure, UserEntity>> login({
    required String email,
    required String password,
  });

  /// Register a new account.
  Future<Either<Failure, UserEntity>> register({
    required String username,
    required String email,
    required String password,
  });

  /// Verify email with OTP.
  Future<Either<Failure, void>> verifyEmail({
    required String email,
    required String code,
  });

  /// Resend verification email.
  Future<Either<Failure, void>> resendVerifyEmail(String email);

  /// Send password reset OTP.
  Future<Either<Failure, void>> forgotPassword(String email);

  /// Verify password reset OTP.
  Future<Either<Failure, void>> verifyPasswordResetOtp({
    required String email,
    required String code,
  });

  /// Reset password with OTP.
  Future<Either<Failure, void>> resetPassword({
    required String email,
    required String code,
    required String password,
  });

  /// Get current authenticated user.
  Future<Either<Failure, UserEntity>> getCurrentUser();

  /// Login with Google credential.
  Future<Either<Failure, UserEntity>> loginWithGoogle(String credential);

  /// Logout — clears tokens and notifies backend.
  Future<Either<Failure, void>> logout();
}
