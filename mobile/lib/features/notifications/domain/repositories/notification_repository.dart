import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Abstract repository interface for notification operations.
/// Implemented in the data layer.
abstract class NotificationRepository {
  /// Get list of notifications.
  Future<Either<Failure, List<Map<String, dynamic>>>> getNotifications();

  /// Get unread notification count.
  Future<Either<Failure, int>> getUnreadCount();

  /// Mark a single notification as read.
  Future<Either<Failure, void>> markAsRead(String id);

  /// Mark all notifications as read.
  Future<Either<Failure, void>> markAllAsRead();
}
