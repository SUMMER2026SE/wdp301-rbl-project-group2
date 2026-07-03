import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/loading_indicator.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

class _Message {
  final String id;
  final String senderRole;
  final String content;
  final String createdAt;

  _Message({
    required this.id,
    required this.senderRole,
    required this.content,
    required this.createdAt,
  });

  factory _Message.fromJson(Map<String, dynamic> json) {
    return _Message(
      id: json['_id'] as String? ?? '',
      senderRole: json['senderRole'] as String? ?? 'customer',
      content: json['content'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}

/// Staff chat detail page — shows conversation with a customer.
class StaffChatDetailPage extends StatefulWidget {
  final String conversationId;

  const StaffChatDetailPage({super.key, required this.conversationId});

  @override
  State<StaffChatDetailPage> createState() => _StaffChatDetailPageState();
}

class _StaffChatDetailPageState extends State<StaffChatDetailPage> {
  List<_Message> _messages = [];
  bool _loading = true;
  String? _error;
  bool _sending = false;
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _fetch();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _refresh());
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    _pollTimer?.cancel();
    super.dispose();
  }

  bool _ensureStoreScope({bool setLoadingFalse = true}) {
    final auth = context.read<AuthBloc>().state;
    if (auth is AuthAuthenticated && auth.storeId != null) return true;
    if (mounted) {
      setState(() {
        _error = 'Tài khoản staff chưa được gán cửa hàng';
        if (setLoadingFalse) _loading = false;
      });
    }
    return false;
  }

  Future<void> _fetch() async {
    if (!_ensureStoreScope(setLoadingFalse: false)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await ApiClient().dio.get(
        ApiEndpoints.supportMessages(widget.conversationId),
      );
      final data = response.data;
      List<_Message> msgs;
      if (data != null && data['data'] != null) {
        msgs = (data['data'] as List)
            .map((e) => _Message.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is List) {
        msgs = data
            .map((e) => _Message.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        msgs = [];
      }
      if (mounted) {
        setState(() {
          _messages = msgs;
          _loading = false;
        });
        _scrollToBottom();
        // Mark as read
        await ApiClient().dio.patch(
          ApiEndpoints.supportMarkRead(widget.conversationId),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Kh\xF4ng thể tải tin nhắn';
          _loading = false;
        });
      }
    }
  }

  Future<void> _refresh() async {
    if (_sending) return;
    try {
      final response = await ApiClient().dio.get(
        ApiEndpoints.supportMessages(widget.conversationId),
      );
      final data = response.data;
      List<_Message> msgs;
      if (data != null && data['data'] != null) {
        msgs = (data['data'] as List)
            .map((e) => _Message.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is List) {
        msgs = data
            .map((e) => _Message.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        msgs = [];
      }
      if (mounted && msgs.length != _messages.length) {
        setState(() => _messages = msgs);
        _scrollToBottom();
      }
    } catch (_) {}
  }

  Future<void> _sendMessage() async {
    final content = _textCtrl.text.trim();
    if (content.isEmpty || !_ensureStoreScope(setLoadingFalse: false)) return;

    setState(() => _sending = true);
    _textCtrl.clear();

    // Optimistic add
    final temp = _Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      senderRole: 'staff',
      content: content,
      createdAt: DateTime.now().toIso8601String(),
    );
    setState(() => _messages.add(temp));
    _scrollToBottom();

    try {
      await ApiClient().dio.post(
        ApiEndpoints.supportMessages(widget.conversationId),
        data: {'content': content},
      );
      unawaited(_refresh());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Kh\xF4ng thể gửi tin nhắn'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _closeConversation() async {
    if (!_ensureStoreScope(setLoadingFalse: false)) return;
    try {
      await ApiClient().dio.patch(
        ApiEndpoints.supportClose(widget.conversationId),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Đ\xE3 đ\xF3ng hội thoại'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Kh\xF4ng thể đ\xF3ng hội thoại'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Hội thoại')),
        body: const LoadingIndicator(message: 'Đang tải tin nhắn...'),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Hội thoại')),
        body: AppErrorWidget(message: _error!, onRetry: _fetch),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hội thoại'),
        actions: [
          IconButton(
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Đ\xF3ng hội thoại',
            onPressed: _closeConversation,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_outlined,
                          size: 64,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Chưa c\xF3 tin nhắn',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _buildMessageBubble(_messages[i]),
                  ),
          ),
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(_Message msg) {
    final isStaff = msg.senderRole == 'staff' || msg.senderRole == 'admin';
    final time = Formatters.parseDate(msg.createdAt);

    return Align(
      alignment: isStaff ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isStaff ? AppColors.primary : Colors.grey.shade200,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: isStaff ? const Radius.circular(16) : Radius.zero,
            bottomRight: isStaff ? Radius.zero : const Radius.circular(16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              msg.content,
              style: TextStyle(
                fontSize: 14,
                color: isStaff ? Colors.white : AppColors.textPrimary,
              ),
            ),
            if (time != null) ...[
              const SizedBox(height: 4),
              Text(
                Formatters.time(time),
                style: TextStyle(
                  fontSize: 10,
                  color: isStaff ? Colors.white70 : AppColors.textHint,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 8, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textCtrl,
              decoration: InputDecoration(
                hintText: 'Nhập tin nhắn...',
                filled: true,
                fillColor: AppColors.surfaceVariant,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(),
              maxLines: 3,
              minLines: 1,
            ),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: AppColors.primary,
            radius: 22,
            child: IconButton(
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(
                      Icons.send_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
              onPressed: _sending ? null : _sendMessage,
            ),
          ),
        ],
      ),
    );
  }
}
