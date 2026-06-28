import 'package:dartz/dartz.dart';
import 'package:foa_mobile/features/auth/domain/entities/user_entity.dart';
import 'package:foa_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Single-responsibility use case for registration.
class RegisterUseCase {
  final AuthRepository repository;

  RegisterUseCase(this.repository);

  Future<Either<Failure, UserEntity>> call({
    required String username,
    required String email,
    required String password,
  }) {
    return repository.register(
      username: username,
      email: email,
      password: password,
    );
  }
}
