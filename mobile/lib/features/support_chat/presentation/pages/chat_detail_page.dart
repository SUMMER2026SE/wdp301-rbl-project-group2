import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

/// Full‑screen chat detail page for customer support conversations.
class ChatDetailPage extends StatefulWidget {
  final String conversationId;
  final String title;

  const ChatDetailPage({
    super.key,
    required this.conversationId,
    this.title = 'Hỗ trợ',
  });

  @override
  State<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends State<ChatDetailPage>
    with TickerProviderStateMixin {
  final Dio _dio = ApiClient().dio;
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  bool _isUploadingImage = false;
  String? _error;
  bool _showScrollToBottom = false;

  late final AnimationController _sendBtnController;

  @override
  void initState() {
    super.initState();
    _sendBtnController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _msgController.addListener(() {
      final hasText = _msgController.text.trim().isNotEmpty;
      if (hasText) {
        _sendBtnController.forward();
      } else {
        _sendBtnController.reverse();
      }
    });
    _scrollController.addListener(() {
      final shouldShow =
          _scrollController.hasClients &&
          _scrollController.position.maxScrollExtent -
                  _scrollController.offset >
              200;
      if (shouldShow != _showScrollToBottom) {
        setState(() => _showScrollToBottom = shouldShow);
      }
    });
    _loadMessages();
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _sendBtnController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await _dio.get(
        ApiEndpoints.supportMessages(widget.conversationId),
      );
      final body = response.data as Map<String, dynamic>;
      final data = (body['messages'] ?? body['data'] ?? []) as List<dynamic>;
      if (mounted) {
        setState(() {
          _messages = data.map((e) => e as Map<String, dynamic>).toList();
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.type == DioExceptionType.connectionError
              ? 'Không có kết nối mạng'
              : 'Không thể tải tin nhắn';
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Có lỗi xảy ra';
        });
      }
    }
  }

  void _scrollToBottom({bool animated = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        if (animated) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOut,
          );
        } else {
          _scrollController.jumpTo(
            _scrollController.position.maxScrollExtent,
          );
        }
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;
    _msgController.clear();
    unawaited(HapticFeedback.lightImpact());

    final tempMsg = <String, dynamic>{
      'content': text,
      'senderType': 'USER',
      'createdAt': DateTime.now().toIso8601String(),
      '_isOptimistic': true,
    };
    setState(() => _messages.add(tempMsg));
    _scrollToBottom();

    setState(() => _isSending = true);
    try {
      await _dio.post(
        ApiEndpoints.supportMessages(widget.conversationId),
        data: {'content': text},
      );
      final response = await _dio.get(
        ApiEndpoints.supportMessages(widget.conversationId),
      );
      final body = response.data as Map<String, dynamic>;
      final data = (body['messages'] ?? body['data'] ?? []) as List<dynamic>;
      if (mounted) {
        setState(() {
          _messages = data.map((e) => e as Map<String, dynamic>).toList();
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) {
        setState(() => _messages.remove(tempMsg));
        _showSnack('Không thể gửi tin nhắn', AppColors.error);
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _pickAndSendImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 80);
    if (picked == null) return;
    if (mounted) setState(() => _isUploadingImage = true);

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(picked.path, filename: 'chat.jpg'),
      });
      final uploadRes = await _dio.post(
        ApiEndpoints.fileUpload,
        data: formData,
        queryParameters: {'ownerType': 'chat'},
      );
      final uploadData = uploadRes.data;
      final imageUrl =
          uploadData['data']?['url'] as String? ??
          uploadData['url'] as String? ??
          '';
      if (imageUrl.isEmpty) throw Exception('No image URL');

      await _dio.post(
        ApiEndpoints.supportMessages(widget.conversationId),
        data: {'content': '', 'imageUrl': imageUrl},
      );
      await _loadMessages();
    } catch (_) {
      if (mounted) _showSnack('Không thể gửi ảnh', AppColors.error);
    } finally {
      if (mounted) setState(() => _isUploadingImage = false);
    }
  }

  void _showImagePickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ImagePickerSheet(
        onCamera: () {
          Navigator.pop(ctx);
          _pickAndSendImage(ImageSource.camera);
        },
        onGallery: () {
          Navigator.pop(ctx);
          _pickAndSendImage(ImageSource.gallery);
        },
      ),
    );
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6FB),
      appBar: _buildAppBar(),
      body: Stack(
        children: [
          _buildBody(),
          // Scroll-to-bottom FAB
          if (_showScrollToBottom)
            Positioned(
              bottom: 90,
              right: 16,
              child: AnimatedOpacity(
                opacity: _showScrollToBottom ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 200),
                child: GestureDetector(
                  onTap: () => _scrollToBottom(),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      scrolledUnderElevation: 1,
      surfaceTintColor: Colors.white,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        onPressed: () => Navigator.of(context).pop(),
      ),
      titleSpacing: 0,
      title: Row(
        children: [
          // Support agent avatar
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary,
                  AppColors.primary.withValues(alpha: 0.7),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.support_agent_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Đang hoạt động',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[500],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh_rounded, size: 20),
          tooltip: 'Tải lại',
          onPressed: _loadMessages,
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_isLoading) return _buildLoadingState();
    if (_error != null) return _buildErrorState();

    return Column(
      children: [
        Expanded(
          child: _messages.isEmpty
              ? _buildEmptyState()
              : _buildMessageList(),
        ),
        if (_isUploadingImage) _buildUploadingBanner(),
        _buildInputBar(),
      ],
    );
  }

  Widget _buildLoadingState() {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: 6,
      itemBuilder: (_, i) {
        final isLeft = i.isEven;
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Align(
            alignment: isLeft ? Alignment.centerLeft : Alignment.centerRight,
            child: _ShimmerBox(
              width: 140 + (i % 3) * 50.0,
              height: 44,
              radius: 16,
            ),
          ),
        );
      },
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.wifi_off_rounded,
                color: AppColors.error,
                size: 34,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                fontSize: 15,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Kiểm tra kết nối và thử lại',
              style: TextStyle(fontSize: 13, color: Colors.grey[500]),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadMessages,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.forum_outlined,
                size: 42,
                color: AppColors.primary.withValues(alpha: 0.7),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Bắt đầu cuộc trò chuyện',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Mô tả vấn đề bạn cần hỗ trợ,\nnhân viên sẽ phản hồi sớm nhất.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey[500], height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      itemCount: _messages.length,
      itemBuilder: (_, i) {
        final msg = _messages[i];
        final isStaff =
            (msg['senderType'] as String?)?.toUpperCase() == 'STAFF' ||
            msg['isStaff'] == true;
        final content = (msg['content'] as String?) ?? '';
        final imageUrl = (msg['imageUrl'] as String?) ?? '';
        final time = msg['createdAt'] as String? ?? '';
        final isOptimistic = msg['_isOptimistic'] == true;

        // Date separator
        final showDate = i == 0 || _shouldShowDateSeparator(
          _messages[i - 1]['createdAt'] as String? ?? '',
          time,
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (showDate && time.isNotEmpty)
              _DateSeparator(dateStr: time),
            _MessageBubble(
              content: content,
              imageUrl: imageUrl,
              time: time,
              isStaff: isStaff,
              isOptimistic: isOptimistic,
            ),
          ],
        );
      },
    );
  }

  bool _shouldShowDateSeparator(String prev, String curr) {
    final p = DateTime.tryParse(prev);
    final c = DateTime.tryParse(curr);
    if (p == null || c == null) return false;
    return p.day != c.day || p.month != c.month || p.year != c.year;
  }

  Widget _buildUploadingBanner() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Đang tải ảnh lên...',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        12,
        10,
        12,
        MediaQuery.of(context).padding.bottom + 10,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Image attachment button
          _AttachButton(
            onTap: _isUploadingImage ? null : _showImagePickerSheet,
          ),
          const SizedBox(width: 8),
          // Text field
          Expanded(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 120),
              decoration: BoxDecoration(
                color: const Color(0xFFF4F6FB),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: AppColors.divider.withValues(alpha: 0.6),
                ),
              ),
              child: TextField(
                controller: _msgController,
                focusNode: _focusNode,
                textInputAction: TextInputAction.send,
                minLines: 1,
                maxLines: 5,
                onSubmitted: (_) => _sendMessage(),
                style: const TextStyle(fontSize: 14, height: 1.4),
                decoration: const InputDecoration(
                  hintText: 'Nhập tin nhắn...',
                  hintStyle: TextStyle(
                    color: AppColors.textHint,
                    fontSize: 14,
                  ),
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  border: InputBorder.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Send button with animation
          AnimatedBuilder(
            animation: _sendBtnController,
            builder: (_, child) {
              final hasText = _msgController.text.trim().isNotEmpty;
              return GestureDetector(
                onTap: (_isSending || _isUploadingImage || !hasText)
                    ? null
                    : _sendMessage,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: hasText
                        ? AppColors.primary
                        : AppColors.primary.withValues(alpha: 0.35),
                    shape: BoxShape.circle,
                    boxShadow: hasText
                        ? [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.35),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ]
                        : null,
                  ),
                  child: _isSending
                      ? const Padding(
                          padding: EdgeInsets.all(12),
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
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// Sub-widgets
// ─────────────────────────────────────────────

class _AttachButton extends StatelessWidget {
  const _AttachButton({this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.08),
          shape: BoxShape.circle,
        ),
        child: Icon(
          Icons.image_outlined,
          color: onTap == null
              ? AppColors.textHint
              : AppColors.primary,
          size: 22,
        ),
      ),
    );
  }
}

class _ImagePickerSheet extends StatelessWidget {
  const _ImagePickerSheet({required this.onCamera, required this.onGallery});

  final VoidCallback onCamera;
  final VoidCallback onGallery;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.divider,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Gửi ảnh',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 8),
          _SheetOption(
            icon: Icons.camera_alt_rounded,
            label: 'Chụp ảnh',
            color: AppColors.primary,
            onTap: onCamera,
          ),
          _SheetOption(
            icon: Icons.photo_library_rounded,
            label: 'Chọn từ thư viện',
            color: const Color(0xFF7C3AED),
            onTap: onGallery,
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _SheetOption extends StatelessWidget {
  const _SheetOption({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(icon, color: color, size: 22),
      ),
      title: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textHint,
      ),
    );
  }
}

class _DateSeparator extends StatelessWidget {
  const _DateSeparator({required this.dateStr});
  final String dateStr;

  String _formatDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final now = DateTime.now();
    if (dt.day == now.day && dt.month == now.month && dt.year == now.year) {
      return 'Hôm nay';
    }
    final yesterday = now.subtract(const Duration(days: 1));
    if (dt.day == yesterday.day &&
        dt.month == yesterday.month &&
        dt.year == yesterday.year) {
      return 'Hôm qua';
    }
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final label = _formatDate(dateStr);
    if (label.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Divider(color: Colors.grey[300], thickness: 1),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          Expanded(
            child: Divider(color: Colors.grey[300], thickness: 1),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.content,
    required this.imageUrl,
    required this.time,
    required this.isStaff,
    this.isOptimistic = false,
  });

  final String content;
  final String imageUrl;
  final String time;
  final bool isStaff;
  final bool isOptimistic;

  @override
  Widget build(BuildContext context) {
    final timeStr = time.isNotEmpty
        ? Formatters.timeAgo(DateTime.tryParse(time) ?? DateTime.now())
        : '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment:
            isStaff ? MainAxisAlignment.start : MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (isStaff) ...[
            // Staff avatar dot
            Container(
              width: 28,
              height: 28,
              margin: const EdgeInsets.only(right: 6, bottom: 2),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primary, Color(0xFF6366F1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.support_agent_rounded,
                color: Colors.white,
                size: 14,
              ),
            ),
          ],
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              child: Column(
                crossAxisAlignment: isStaff
                    ? CrossAxisAlignment.start
                    : CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: isStaff
                          ? Colors.white
                          : AppColors.primary,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(18),
                        topRight: const Radius.circular(18),
                        bottomLeft: isStaff
                            ? const Radius.circular(4)
                            : const Radius.circular(18),
                        bottomRight: isStaff
                            ? const Radius.circular(18)
                            : const Radius.circular(4),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: isStaff
                              ? Colors.black.withValues(alpha: 0.06)
                              : AppColors.primary.withValues(alpha: 0.25),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (imageUrl.isNotEmpty) ...[
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.network(
                              imageUrl,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              loadingBuilder: (ctx, child, progress) {
                                if (progress == null) return child;
                                return Container(
                                  height: 150,
                                  color: Colors.grey[200],
                                  child: const Center(
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                );
                              },
                              errorBuilder: (_, a, b) => Container(
                                height: 100,
                                color: Colors.grey[200],
                                child: const Center(
                                  child: Icon(
                                    Icons.broken_image_outlined,
                                    color: AppColors.textHint,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          if (content.isNotEmpty) const SizedBox(height: 8),
                        ],
                        if (content.isNotEmpty)
                          Text(
                            content,
                            style: TextStyle(
                              fontSize: 14,
                              color: isStaff
                                  ? AppColors.textPrimary
                                  : Colors.white,
                              height: 1.4,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 3),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (timeStr.isNotEmpty)
                        Text(
                          timeStr,
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey[400],
                          ),
                        ),
                      if (!isStaff && isOptimistic) ...[
                        const SizedBox(width: 4),
                        Icon(
                          Icons.access_time_rounded,
                          size: 10,
                          color: Colors.grey[400],
                        ),
                      ] else if (!isStaff && !isOptimistic) ...[
                        const SizedBox(width: 4),
                        Icon(
                          Icons.done_all_rounded,
                          size: 11,
                          color: AppColors.primary.withValues(alpha: 0.7),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Shimmer placeholder box for loading state
class _ShimmerBox extends StatefulWidget {
  const _ShimmerBox({
    required this.width,
    required this.height,
    required this.radius,
  });

  final double width;
  final double height;
  final double radius;

  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _anim = Tween<double>(begin: -1.5, end: 1.5).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, child) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.radius),
          gradient: LinearGradient(
            begin: Alignment(_anim.value - 1, 0),
            end: Alignment(_anim.value, 0),
            colors: const [
              Color(0xFFE8ECF0),
              Color(0xFFF5F6F8),
              Color(0xFFE8ECF0),
            ],
          ),
        ),
      ),
    );
  }
}
