import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// Conversation item model for support chat.
class _Conversation {
  final String id;
  final String topic;
  final String? orderCode;
  final String? orderId;
  final String lastMessage;
  final String? lastMessageTime;
  final String status; // 'active', 'closed'
  final int unreadCount;

  const _Conversation({
    required this.id,
    required this.topic,
    this.orderCode,
    this.orderId,
    required this.lastMessage,
    this.lastMessageTime,
    required this.status,
    this.unreadCount = 0,
  });

  factory _Conversation.fromJson(Map<String, dynamic> json) {
    final lastMsg = json['lastMessage'] as Map<String, dynamic>?;
    final rawStatus = json['status'] as String? ?? 'open';
    return _Conversation(
      id: (json['_id'] ?? json['id']) as String? ?? '',
      topic:
          (json['topic'] ?? json['subject']) as String? ??
          (json['orderCode'] != null
              ? 'Hỗ trợ đơn #${json['orderCode']}'
              : 'Hỗ trợ'),
      orderCode: json['orderCode'] as String?,
      orderId: json['orderId'] as String?,
      lastMessage:
          lastMsg?['content'] as String? ?? lastMsg?['text'] as String? ?? '',
      lastMessageTime:
          lastMsg?['createdAt'] as String? ?? json['updatedAt'] as String?,
      status: rawStatus == 'open' ? 'active' : rawStatus,
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }
}

/// Support chat list page showing customer conversations.
class ChatListPage extends StatefulWidget {
  final String? initialOrderId;

  const ChatListPage({super.key, this.initialOrderId});

  @override
  State<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends State<ChatListPage> {
  final Dio _dio = ApiClient().dio;
  List<_Conversation> _conversations = [];
  bool _isLoading = true;
  String? _error;
  bool _isDirectOpening = false; // True when jumping directly to order chat

  @override
  void initState() {
    super.initState();
    if (widget.initialOrderId != null && widget.initialOrderId!.isNotEmpty) {
      _openDirectChat(widget.initialOrderId!);
    } else {
      _loadConversations();
    }
  }

  /// Open chat for an order — create/get conversation and jump straight to detail.
  /// Replaces this list page in the stack so back goes to Order Detail, not here.
  Future<void> _openDirectChat(String orderId) async {
    setState(() => _isDirectOpening = true);
    try {
      // Try to find existing conversation first
      final existingResponse = await _dio.get(
        ApiEndpoints.supportConversations,
      );
      final body = existingResponse.data as Map<String, dynamic>;
      final existingList =
          (body['conversations'] ?? body['data'] ?? []) as List<dynamic>;
      final existing = existingList.firstWhere((c) {
        final m = c as Map<String, dynamic>;
        return (m['orderId'] ?? m['orderCode'])?.toString() == orderId;
      }, orElse: () => null as Map<String, dynamic>?);
      if (existing != null && mounted) {
        final convId = (existing['id'] ?? existing['_id']) as String? ?? '';
        if (convId.isNotEmpty) {
          context.pushReplacement('/chat/$convId', extra: 'Hỗ trợ đơn hàng');
          return;
        }
      }

      // No existing conversation — create one
      final createResponse = await _dio.post(
        ApiEndpoints.supportConversations,
        data: {'orderId': orderId},
      );
      final conversation =
          ((createResponse.data as Map?) ?? {})['conversation'] as Map?;
      final convId = (conversation?['id'] ?? conversation?['_id']) as String?;
      if (convId != null && convId.isNotEmpty && mounted) {
        context.pushReplacement('/chat/$convId', extra: 'Hỗ trợ đơn hàng');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isDirectOpening = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể mở hội thoại hỗ trợ'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        // Fall back to showing empty list (fire-and-forget)
        unawaited(_loadConversations());
      }
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _loadConversations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _dio.get(ApiEndpoints.supportConversations);
      final body = response.data as Map<String, dynamic>;
      final data =
          (body['conversations'] ?? body['data'] ?? []) as List<dynamic>;

      setState(() {
        _conversations = data
            .map((e) => _Conversation.fromJson(e as Map<String, dynamic>))
            .toList();
        _conversations.sort((a, b) {
          if (a.status != b.status) {
            return a.status == 'active' ? -1 : 1;
          }
          return (b.lastMessageTime ?? '').compareTo(a.lastMessageTime ?? '');
        });
        _isLoading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.type == DioExceptionType.connectionError
            ? 'Không có kết nối mạng. Vui lòng kiểm tra lại.'
            : 'Không thể tải danh sách hỗ trợ. Vui lòng thử lại sau.';
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
      });
    }
  }

  void _openChat(_Conversation conv) {
    context.push('/chat/${conv.id}', extra: conv.topic);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Hỗ trợ'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isDirectOpening
          ? const Center(child: CircularProgressIndicator())
          : _isLoading
          ? _buildShimmer()
          : _error != null
          ? AppErrorWidget(message: _error!, onRetry: _loadConversations)
          : _conversations.isEmpty
          ? _buildEmpty()
          : _buildList(),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 4,
        itemBuilder: (_, i) => Container(
          height: 88,
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.chat_bubble_outline_rounded,
              size: 80,
              color: Colors.grey[300],
            ),
            const SizedBox(height: 16),
            const Text(
              'Bạn chưa có hội thoại hỗ trợ nào',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Khi bạn cần hỗ trợ, hội thoại sẽ xuất hiện tại đây',
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildList() {
    final activeConvs = _conversations
        .where((c) => c.status == 'active')
        .toList();
    final closedConvs = _conversations
        .where((c) => c.status == 'closed')
        .toList();

    return RefreshIndicator(
      onRefresh: _loadConversations,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (activeConvs.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.only(bottom: 8, left: 4),
              child: Text(
                'Đang hoạt động',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            ...activeConvs.map((c) => _buildConversationItem(c)),
            if (closedConvs.isNotEmpty) const SizedBox(height: 16),
          ],
          if (closedConvs.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.only(bottom: 8, left: 4),
              child: Text(
                'Đã đóng',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            ...closedConvs.map((c) => _buildConversationItem(c)),
          ],
        ],
      ),
    );
  }

  Widget _buildConversationItem(_Conversation conv) {
    final lastTime = conv.lastMessageTime != null
        ? Formatters.timeAgo(
            DateTime.tryParse(conv.lastMessageTime!) ?? DateTime.now(),
          )
        : '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => _openChat(conv),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: conv.status == 'active'
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : AppColors.divider,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: conv.status == 'active'
                        ? AppColors.primary.withValues(alpha: 0.1)
                        : Colors.grey[100],
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    Icons.support_agent_rounded,
                    color: conv.status == 'active'
                        ? AppColors.primary
                        : Colors.grey[400],
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
                              conv.topic,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: conv.status == 'active'
                                    ? FontWeight.w700
                                    : FontWeight.w600,
                                color: conv.status == 'active'
                                    ? AppColors.textPrimary
                                    : AppColors.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (conv.unreadCount > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${conv.unreadCount}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      if (conv.orderCode != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            'Đơn #${conv.orderCode!}',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.primary.withValues(alpha: 0.7),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              conv.lastMessage.isNotEmpty
                                  ? conv.lastMessage
                                  : 'Chưa có tin nhắn',
                              style: TextStyle(
                                fontSize: 13,
                                color: conv.lastMessage.isNotEmpty
                                    ? AppColors.textSecondary
                                    : AppColors.textHint,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            lastTime,
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[400],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.textHint,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
