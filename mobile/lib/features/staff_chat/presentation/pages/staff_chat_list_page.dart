import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/features/staff_chat/presentation/blocs/staff_chat_bloc.dart';
import 'package:foa_mobile/shared/widgets/empty_state_widget.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class StaffChatListPage extends StatefulWidget {
  const StaffChatListPage({super.key});

  @override
  State<StaffChatListPage> createState() => _StaffChatListPageState();
}

class _StaffChatListPageState extends State<StaffChatListPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  final Set<String> _expandedCustomers = {};

  @override
  void initState() {
    super.initState();
    _fetchConversations();
    _setupSocketListener();
  }

  void _fetchConversations() {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated && authState.storeId != null) {
      context.read<StaffChatBloc>().add(FetchConversationsEvent(storeId: authState.storeId!));
    }
  }

  void _setupSocketListener() {
    // Listen to Support global events to refresh list
    SocketService().on('support:message', (_) {
      if (mounted) {
        _fetchConversations();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    SocketService().off('support:message');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hỗ trợ khách hàng'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchConversations,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search box
          _buildSearchBox(),

          Expanded(
            child: BlocBuilder<StaffChatBloc, StaffChatState>(
              builder: (context, state) {
                if (state is ConversationsLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is ConversationsError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(state.message, style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchConversations,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  );
                }

                if (state is ConversationsLoaded) {
                  final conversations = state.conversations;

                  // Filter locally
                  final filtered = conversations.where((c) {
                    final term = _searchQuery.toLowerCase();
                    return c.customerName.toLowerCase().contains(term) ||
                        c.orderCode.toLowerCase().contains(term);
                  }).toList();

                  if (filtered.isEmpty) {
                    return const EmptyStateWidget(
                      icon: Icons.chat_bubble_outline,
                      title: 'Chưa có cuộc hội thoại nào',
                      subtitle: 'Khi khách hàng gửi tin nhắn từ đơn hàng, nó sẽ xuất hiện ở đây.',
                    );
                  }

                  // Group conversations by stable customer identity.
                  final grouped = <String, List<ConversationModel>>{};
                  for (final c in filtered) {
                    final customerKey = c.customerId.isNotEmpty ? c.customerId : c.customerName;
                    grouped.putIfAbsent(customerKey, () => []).add(c);
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: grouped.length,
                    itemBuilder: (context, index) {
                      final customerKey = grouped.keys.elementAt(index);
                      final convs = grouped[customerKey]!;
                      final customerName = convs.first.customerName;
                      final isExpanded = _expandedCustomers.contains(customerKey);

                      // Summary statistics for customer group
                      final totalUnread = convs.fold<int>(0, (sum, c) => sum + c.unreadCount);
                      final hasOpen = convs.any((c) => c.status == 'open');

                      // Find the latest active conversation to display preview
                      final latestConv = convs.reduce((a, b) =>
                          a.createdAt.isAfter(b.createdAt) ? a : b);

                      return _buildCustomerGroupTile(
                        customerKey,
                        customerName,
                        convs,
                        isExpanded,
                        totalUnread,
                        hasOpen,
                        latestConv,
                      );
                    },
                  );
                }

                return const SizedBox();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBox() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        onChanged: (val) {
          setState(() {
            _searchQuery = val.trim();
          });
        },
        decoration: InputDecoration(
          hintText: 'Tìm kiếm khách hàng, mã đơn...',
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {
                      _searchQuery = '';
                    });
                  },
                )
              : null,
          filled: true,
          fillColor: Colors.grey.shade100,
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Widget _buildCustomerGroupTile(
    String customerKey,
    String customerName,
    List<ConversationModel> convs,
    bool isExpanded,
    int totalUnread,
    bool hasOpen,
    ConversationModel latestConv,
  ) {
    final previewMsg = latestConv.lastMessage;

    return Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: Stack(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.primary.withOpacity(0.1),
                child: Text(
                  customerName.substring(0, 1).toUpperCase(),
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16),
                ),
              ),
              if (hasOpen)
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
            ],
          ),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  customerName,
                  style: TextStyle(
                    fontWeight: totalUnread > 0 ? FontWeight.w900 : FontWeight.bold,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (previewMsg != null)
                Text(
                  Formatters.time(previewMsg.createdAt),
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  convs.length > 1 ? '${convs.length} đơn hàng cần hỗ trợ' : 'Đơn #${latestConv.orderCode}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
                const SizedBox(height: 2),
                Text(
                  previewMsg != null
                      ? (previewMsg.senderType == 'STAFF' ? 'Bạn: ' : '') + previewMsg.content
                      : 'Chưa có tin nhắn',
                  style: TextStyle(
                    fontSize: 13,
                    color: totalUnread > 0 ? AppColors.textPrimary : AppColors.textSecondary,
                    fontWeight: totalUnread > 0 ? FontWeight.w600 : FontWeight.normal,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (totalUnread > 0)
                Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$totalUnread',
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              Icon(
                isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                color: AppColors.textSecondary,
              ),
            ],
          ),
          onTap: () {
            setState(() {
              if (isExpanded) {
                _expandedCustomers.remove(customerKey);
              } else {
                _expandedCustomers.add(customerKey);
              }
            });
          },
        ),

        // Sublist of orders if expanded
        if (isExpanded)
          Container(
            color: Colors.grey.shade50,
            child: Column(
              children: convs.map((conv) {
                return ListTile(
                  contentPadding: const EdgeInsets.only(left: 64, right: 16),
                  title: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Đơn #${conv.orderCode}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      if (conv.lastMessage != null)
                        Text(
                          Formatters.time(conv.lastMessage!.createdAt),
                          style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                        ),
                    ],
                  ),
                  subtitle: Text(
                    conv.lastMessage != null
                        ? (conv.lastMessage!.senderType == 'STAFF' ? 'Bạn: ' : '') + conv.lastMessage!.content
                        : 'Mới nhận',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: conv.unreadCount > 0
                      ? Container(
                          padding: const EdgeInsets.all(5),
                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        )
                      : const Icon(Icons.chevron_right, color: AppColors.textHint, size: 16),
                  onTap: () {
                    context.push('/staff/chat/${conv.id}', extra: conv);
                  },
                );
              }).toList(),
            ),
          ),
        const Divider(height: 1),
      ],
    );
  }
}
