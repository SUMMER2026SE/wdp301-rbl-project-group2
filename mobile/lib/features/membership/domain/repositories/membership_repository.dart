import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Abstract repository interface for membership operations.
/// Implemented in the data layer.
abstract class MembershipRepository {
  /// Get user membership details.
  Future<Either<Failure, Map<String, dynamic>>> getMembership();

  /// Get user points balance and summary.
  Future<Either<Failure, Map<String, dynamic>>> getPoints();

  /// Get points transaction history.
  Future<Either<Failure, List<Map<String, dynamic>>>> getPointsHistory();
}
