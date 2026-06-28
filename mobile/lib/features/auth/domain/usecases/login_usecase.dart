import 'package:dartz/dartz.dart';
import 'package:foa_mobile/features/auth/domain/entities/user_entity.dart';
import 'package:foa_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Single-responsibility use case for login.
class LoginUseCase {
  final AuthRepository repository;

  LoginUseCase(this.repository);

  /// Login with email/password and return user entity on success.
  Future<Either<Failure, UserEntity>> call({
    required String email,
    required String password,
  }) {
    return repository.login(email: email, password: password);
  }
}
