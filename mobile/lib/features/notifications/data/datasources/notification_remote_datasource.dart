import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for notification API calls.
class NotificationRemoteDataSource {
  final Dio _dio;

  NotificationRemoteDataSource() : _dio = ApiClient().dio;

  /// Get list of notifications.
  Future<List<Map<String, dynamic>>> getNotifications() async {
    final response = await _dio.get(ApiEndpoints.notifications);
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  /// Get unread notification count.
  Future<int> getUnreadCount() async {
    final response = await _dio.get(ApiEndpoints.notificationsUnreadCount);
    final data = response.data as Map<String, dynamic>;
    final countData = data['data'];
    if (countData is Map<String, dynamic>) {
      return (countData['count'] as num?)?.toInt() ?? 0;
    }
    return (countData as num?)?.toInt() ?? 0;
  }

  /// Mark a single notification as read.
  Future<void> markAsRead(String id) async {
    await _dio.patch(ApiEndpoints.notificationRead(id));
  }

  /// Mark all notifications as read.
  Future<void> markAllAsRead() async {
    await _dio.patch(ApiEndpoints.notificationsReadAll);
  }
}
