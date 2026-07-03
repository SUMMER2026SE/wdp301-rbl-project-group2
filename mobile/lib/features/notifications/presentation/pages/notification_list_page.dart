import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';

class NotificationListPage extends StatefulWidget {
  const NotificationListPage({super.key});

  @override
  State<NotificationListPage> createState() => _NotificationListPageState();
}

class _NotificationListPageState extends State<NotificationListPage> {
  final Dio _dio = ApiClient().dio;
  List<dynamic> _notifications = [];
  int _unreadCount = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _loadUnreadCount();
  }

  Future<void> _loadUnreadCount() async {
    try {
      final res = await _dio.get(ApiEndpoints.notificationsUnreadCount);
      final data = res.data['data'] as Map<String, dynamic>?;
      if (mounted) {
        setState(() => _unreadCount = (data?['count'] as int? ?? 0));
      }
    } catch (_) {}
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _dio.get(ApiEndpoints.notifications);
      setState(() {
        _notifications =
            res.data['data'] as List<dynamic>? ?? res.data as List<dynamic>;
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _error =
            e.response?.data['message'] as String? ?? 'Không thể tải thông báo';
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Đã xảy ra lỗi';
        _loading = false;
      });
    }
  }

  Future<void> _markAllRead() async {
    try {
      await _dio.patch(ApiEndpoints.notificationsReadAll);
      setState(() {
        for (final n in _notifications) {
          (n as Map<String, dynamic>)['read'] = true;
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã đánh dấu tất cả đã đọc')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể đánh dấu đã đọc')),
        );
      }
    }
  }

  Future<void> _markRead(int index) async {
    final n = _notifications[index] as Map<String, dynamic>;
    final id = n['_id'] as String? ?? n['id'] as String?;
    if (id == null) return;
    try {
      await _dio.patch(ApiEndpoints.notificationRead(id));
      setState(() => n['read'] = true);
    } catch (_) {}
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'order_update':
        return Icons.receipt_long;
      case 'promotion':
        return Icons.local_offer;
      case 'system':
      default:
        return Icons.info_outline;
    }
  }

  Color _colorForType(String? type) {
    switch (type) {
      case 'order_update':
        return AppColors.primary;
      case 'promotion':
        return AppColors.warning;
      case 'system':
      default:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Thông báo'),
            if (_unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.error,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$_unreadCount',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (_notifications.any(
            (n) => (n as Map<String, dynamic>)['read'] != true,
          ))
            TextButton(
              onPressed: _markAllRead,
              child: const Text(
                'Đã đọc tất cả',
                style: TextStyle(fontSize: 13),
              ),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return _buildShimmer();
    if (_error != null) {
      return AppErrorWidget(message: _error!, onRetry: _loadNotifications);
    }
    if (_notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.notifications_none, size: 72, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Chưa có thông báo',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 4),
        itemCount: _notifications.length,
        itemBuilder: (_, i) => _buildItem(i),
      ),
    );
  }

  Widget _buildShimmer() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 6,
      itemBuilder: (_, _) => Shimmer.fromColors(
        baseColor: AppColors.shimmerBase,
        highlightColor: AppColors.shimmerHighlight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          height: 80,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Widget _buildItem(int index) {
    final n = _notifications[index] as Map<String, dynamic>;
    final isRead = n['read'] == true;
    final type = n['type'] as String?;
    final title = n['title'] as String? ?? '';
    final body = n['body'] as String? ?? n['message'] as String? ?? '';
    final timeAgo = Formatters.timeAgo(
      Formatters.parseDate(n['createdAt'] as String?) ?? DateTime.now(),
    );

    return Dismissible(
      key: ValueKey(n['_id'] ?? n['id'] ?? index),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        color: AppColors.info,
        child: const Icon(Icons.check, color: Colors.white),
      ),
      onDismissed: (_) => _markRead(index),
      child: InkWell(
        onTap: () => _markRead(index),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isRead
                ? Colors.transparent
                : AppColors.primary.withValues(alpha: 0.04),
            border: Border(
              bottom: BorderSide(
                color: AppColors.divider.withValues(alpha: 0.5),
              ),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _colorForType(type).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _iconForType(type),
                  color: _colorForType(type),
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontWeight: isRead
                                  ? FontWeight.w500
                                  : FontWeight.w700,
                              fontSize: 14,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          timeAgo,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textHint,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      body,
                      style: TextStyle(
                        fontSize: 13,
                        color: isRead
                            ? AppColors.textSecondary
                            : AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (!isRead)
                Container(
                  margin: const EdgeInsets.only(left: 8, top: 4),
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.info,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
