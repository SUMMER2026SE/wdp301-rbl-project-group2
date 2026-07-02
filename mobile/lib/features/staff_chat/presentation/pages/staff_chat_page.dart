import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/features/staff_chat/domain/usecases/chat_actions.dart';
import 'package:foa_mobile/features/staff_chat/presentation/blocs/staff_chat_bloc.dart';
import 'package:foa_mobile/features/staff_orders/domain/usecases/get_staff_order_by_id.dart';
import 'package:foa_mobile/core/di/injection.dart';
import 'package:foa_mobile/shared/widgets/empty_state_widget.dart';
import 'package:foa_mobile/shared/widgets/loading_indicator.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:foa_mobile/shared/widgets/price_text.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class StaffChatPage extends StatefulWidget {
  final String conversationId;
  final ConversationModel? initialConversation;

  const StaffChatPage({
    super.key,
    required this.conversationId,
    this.initialConversation,
  });

  @override
  State<StaffChatPage> createState() => _StaffChatPageState();
}

class _StaffChatPageState extends State<StaffChatPage> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _imagePicker = ImagePicker();
  late final GetStaffOrderByIdUseCase _getStaffOrderByIdUseCase;
  OrderModel? _orderDetail;
  bool _loadingOrder = false;

  final List<String> _quickReplies = [
    'Chào bạn!',
    'Sản phẩm còn hàng ạ.',
    'Đơn hàng đang được đi giao.',
    'Cảm ơn bạn đã ủng hộ cửa hàng!',
    'Dạ vui lòng chờ chút bếp chuẩn bị nhé.',
  ];

  @override
  void initState() {
    super.initState();
    _fetchMessages();
    _setupSocketRoom();

    // Resolve Order Detail UseCase
    _getStaffOrderByIdUseCase = sl<GetStaffOrderByIdUseCase>();
  }

  void _fetchMessages() {
    context.read<StaffChatBloc>().add(FetchMessagesEvent(conversationId: widget.conversationId));
  }

  void _setupSocketRoom() {
    // Join conversation room in Socket.IO
    SocketService().joinSupportRoom(widget.conversationId);

    // Listen for realtime messages in room
    SocketService().on('support:message:received', (data) {
      if (data != null && data['data'] != null) {
        final newMsg = ChatMessageModel.fromJson(data['data'] as Map<String, dynamic>);
        if (mounted) {
          context.read<StaffChatBloc>().add(ReceiveRealtimeMessageEvent(newMsg));
          _scrollToBottom();
        }
      }
    });
  }

  void _fetchOrderDetail(String orderId) async {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated && authState.storeId != null) {
      setState(() {
        _loadingOrder = true;
      });
      final result = await _getStaffOrderByIdUseCase(orderId: orderId, storeId: authState.storeId!);
      result.fold(
        (failure) {
          if (mounted) setState(() => _loadingOrder = false);
        },
        (order) {
          if (mounted) {
            setState(() {
              _orderDetail = order;
              _loadingOrder = false;
            });
            _showOrderDetailsBottomSheet(order);
          }
        },
      );
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    SocketService().off('support:message:received');
    super.dispose();
  }

  void _sendMessage() {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    context.read<StaffChatBloc>().add(SendChatTextEvent(
          conversationId: widget.conversationId,
          content: content,
        ));
    _messageController.clear();
    _scrollToBottom();
  }

  void _sendQuickReply(String reply) {
    context.read<StaffChatBloc>().add(SendChatTextEvent(
          conversationId: widget.conversationId,
          content: reply,
        ));
    _scrollToBottom();
  }

  Future<void> _pickAndSendImage() async {
    final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (image == null) return;

    if (mounted) {
      context.read<StaffChatBloc>().add(SendChatImageEvent(
            conversationId: widget.conversationId,
            imageFile: File(image.path),
          ));
      _scrollToBottom();
    }
  }

  void _closeChat() {
    final authState = context.read<AuthBloc>().state as AuthAuthenticated;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Đóng cuộc trò chuyện'),
        content: const Text('Bạn có chắc chắn muốn đóng cuộc trò chuyện hỗ trợ này?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () {
              context.read<StaffChatBloc>().add(CloseChatEvent(
                    conversationId: widget.conversationId,
                    storeId: authState.storeId ?? '',
                  ));
              Navigator.of(ctx).pop();
              context.pop(); // Go back to list
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Đóng chat'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final chatState = context.watch<StaffChatBloc>().state;

    // Find current conversation metadata
    ConversationModel? currentConv = widget.initialConversation;
    final staffChatBloc = context.read<StaffChatBloc>();
    // Check if we came from list page and have it cached
    final currentState = staffChatBloc.state;
    if (currentState is ConversationsLoaded) {
      for (final conversation in currentState.conversations) {
        if (conversation.id == widget.conversationId) {
          currentConv = conversation;
          break;
        }
      }
    }

    final title = currentConv != null
        ? '${currentConv.customerName} (#${currentConv.orderCode})'
        : 'Hỗ trợ chat';

    return Scaffold(
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        actions: [
          // View linked order details sheet
          if (currentConv != null)
            IconButton(
              icon: _loadingOrder
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.receipt_long),
              onPressed: () => _fetchOrderDetail(currentConv!.orderId),
              tooltip: 'Xem đơn hàng',
            ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: _closeChat,
            tooltip: 'Đóng hội thoại',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: BlocConsumer<StaffChatBloc, StaffChatState>(
              listener: (context, state) {
                if (state is MessagesLoaded && state.error != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
                  );
                }
              },
              builder: (context, state) {
                if (state is MessagesLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is MessagesError) {
                  return AppErrorWidget(
                    message: state.message,
                    onRetry: _fetchMessages,
                  );
                }

                if (state is MessagesLoaded) {
                  final messages = state.messages;

                  if (messages.isEmpty) {
                    return const EmptyStateWidget(
                      icon: Icons.chat_bubble_outline,
                      title: 'Chưa có tin nhắn nào',
                      subtitle: 'Hãy gửi lời chào đầu tiên hỗ trợ khách hàng.',
                    );
                  }

                  // Auto scroll to bottom
                  WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[index];
                      final isStaff = msg.senderType == 'STAFF';

                      return _buildMessageBubble(msg, isStaff);
                    },
                  );
                }

                return const SizedBox();
              },
            ),
          ),

          // Sending Loader indicator
          if (chatState is MessagesLoaded && chatState.isSending)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),

          // Quick replies
          _buildQuickRepliesBar(),

          // Input Bar
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessageModel msg, bool isStaff) {
    return Align(
      alignment: isStaff ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isStaff ? AppColors.primary : Colors.grey.shade200,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isStaff ? 16 : 4),
            bottomRight: Radius.circular(isStaff ? 4 : 16),
          ),
        ),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (msg.imageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(msg.imageUrl!, fit: BoxFit.cover),
              ),
              const SizedBox(height: 6),
            ],
            Text(
              msg.content,
              style: TextStyle(
                color: isStaff ? Colors.white : AppColors.textPrimary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  Formatters.time(msg.createdAt),
                  style: TextStyle(
                    fontSize: 9,
                    color: isStaff ? Colors.white.withOpacity(0.7) : AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickRepliesBar() {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.divider)),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _quickReplies.length,
        itemBuilder: (context, index) {
          final reply = _quickReplies[index];
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ActionChip(
              label: Text(reply),
              backgroundColor: Colors.white,
              labelStyle: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
              side: const BorderSide(color: AppColors.primaryLight),
              onPressed: () => _sendQuickReply(reply),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 6, 8, 24),
      color: Colors.white,
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.image, color: AppColors.primary),
            onPressed: _pickAndSendImage,
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Nhập tin nhắn hỗ trợ...',
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                filled: true,
                fillColor: Colors.grey.shade100,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send, color: AppColors.primary),
            onPressed: _sendMessage,
          ),
        ],
      ),
    );
  }

  void _showOrderDetailsBottomSheet(OrderModel order) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Đơn hàng #${order.code}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(ctx).pop()),
                ],
              ),
              const Divider(),

              // Items
              Expanded(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: order.items.length,
                  separatorBuilder: (c, i) => const Divider(),
                  itemBuilder: (c, i) {
                    final item = order.items[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                            child: Text('x${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 12)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.name ?? item.product?.name ?? 'Sản phẩm', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                if (item.variations.isNotEmpty)
                                  Text(
                                    item.variations.map((v) => '${v.name}: ${v.choice}').join(' • '),
                                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 10),
                                  ),
                              ],
                            ),
                          ),
                          Text(Formatters.currency(item.subTotal), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const Divider(),

              // Delivery Info
              Row(
                children: [
                  const Icon(Icons.phone, size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 8),
                  Text(order.deliveryAddress.phone, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.map_outlined, size: 16, color: AppColors.textSecondary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${order.deliveryAddress.detail}, ${order.deliveryAddress.ward}, ${order.deliveryAddress.city}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                    ),
                  ),
                ],
              ),
              const Divider(),

              // Total price
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Tổng cộng cần thu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  PriceText(price: order.totalPrice, fontSize: 20, fontWeight: FontWeight.w900),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
