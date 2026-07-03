import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/features/staff_customers/presentation/blocs/staff_customers_bloc.dart';
import 'package:foa_mobile/shared/widgets/loading_indicator.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:foa_mobile/shared/widgets/order_status_badge.dart';
import 'package:foa_mobile/shared/widgets/price_text.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class CustomerDetailPage extends StatefulWidget {
  final String customerId;

  const CustomerDetailPage({super.key, required this.customerId});

  @override
  State<CustomerDetailPage> createState() => _CustomerDetailPageState();
}

class _CustomerDetailPageState extends State<CustomerDetailPage> {
  List<Map<String, dynamic>> _conversations = [];
  bool _conversationsLoading = false;
  String? _conversationsError;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
    _fetchConversations();
  }

  void _fetchDetails() {
    context.read<StaffCustomersBloc>().add(
      LoadCustomerDetailsEvent(customerId: widget.customerId),
    );
  }

  Future<void> _fetchConversations() async {
    setState(() {
      _conversationsLoading = true;
      _conversationsError = null;
    });
    try {
      final response = await ApiClient().dio.get(
        '/support/conversations',
        queryParameters: {'userId': widget.customerId},
      );
      final data = response.data;
      final list =
          data['conversations'] as List<dynamic>? ??
          data['data'] as List<dynamic>? ??
          [];
      if (!mounted) return;
      setState(() {
        _conversations = list.map((e) => e as Map<String, dynamic>).toList();
        _conversationsLoading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _conversationsLoading = false;
        _conversationsError =
            e.response?.data?['message'] as String? ??
            'Không thể tải hội thoại';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _conversationsLoading = false;
        _conversationsError = 'Không thể tải hội thoại';
      });
    }
  }

  Future<void> _callCustomer(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  String _safeInitial(String? value) {
    final text = value?.trim() ?? '';
    return text.isEmpty ? '?' : text[0].toUpperCase();
  }

  // Tái hiện thuật toán AI Insights offline dựa trên thông số sức khỏe và lịch sử mua hàng
  List<Map<String, dynamic>> _generateOfflineAIInsights(
    UserModel customer,
    List<OrderModel> orders,
  ) {
    final insights = <Map<String, dynamic>>[];

    // VIP check
    final totalSuccessOrders = orders
        .where((o) => o.status.toApiString() == 'completed')
        .length;
    if (totalSuccessOrders > 20) {
      insights.add({
        'icon': '👑',
        'type': 'VIP',
        'message':
            'Khách hàng thân thiết VIP với $totalSuccessOrders đơn hàng thành công.',
        'color': Colors.amber.shade900,
      });
    } else if (totalSuccessOrders > 5) {
      insights.add({
        'icon': '⭐',
        'type': 'Thường xuyên',
        'message': 'Khách quen quán ($totalSuccessOrders đơn hàng hoàn tất).',
        'color': Colors.blue.shade900,
      });
    }

    // Cancellation check
    final cancelledCount = orders
        .where((o) => o.status.toApiString() == 'cancelled')
        .length;
    if (orders.isNotEmpty) {
      final cancelRate = (cancelledCount / orders.length) * 100;
      if (cancelRate > 30 && orders.length >= 3) {
        insights.add({
          'icon': '⚠️',
          'type': 'Tỷ lệ huỷ cao',
          'message':
              'Chú ý: Khách có tỷ lệ huỷ đơn khá cao (${cancelRate.toStringAsFixed(0)}%). Cần gọi điện xác nhận kỹ trước khi bếp nấu.',
          'color': Colors.orange.shade900,
        });
      }
    }

    // Allergies check
    final allergies =
        customer.health?.allergies ?? customer.preferences?.allergies ?? [];
    if (allergies.isNotEmpty) {
      insights.add({
        'icon': '🚨',
        'type': 'Dị ứng nghiêm trọng',
        'message':
            'CẢNH BÁO DỊ ỨNG: Dị ứng với [${allergies.join(', ')}]. Tuyệt đối tránh nhiễm chéo nguyên liệu.',
        'color': Colors.red.shade900,
      });
    }

    // Preferences check
    final dietary = customer.preferences?.dietary ?? [];
    if (dietary.isNotEmpty) {
      insights.add({
        'icon': '🥦',
        'type': 'Chế độ ăn',
        'message': 'Chế độ ăn yêu thích: ${dietary.join(', ')}.',
        'color': Colors.green.shade900,
      });
    }

    // Common requests check (extract from notes)
    final notes = orders
        .map((o) => o.note)
        .where((n) => n != null && n.isNotEmpty)
        .toList();
    if (notes.isNotEmpty) {
      final notesCount = <String, int>{};
      for (final n in notes) {
        final lower = n!.toLowerCase();
        if (lower.contains('không cay') || lower.contains('ko cay')) {
          notesCount['Không cay'] = (notesCount['Không cay'] ?? 0) + 1;
        }
        if (lower.contains('không hành') || lower.contains('ko hành')) {
          notesCount['Không hành'] = (notesCount['Không hành'] ?? 0) + 1;
        }
        if (lower.contains('ít dầu')) {
          notesCount['Ít dầu mỡ'] = (notesCount['Ít dầu mỡ'] ?? 0) + 1;
        }
      }

      notesCount.forEach((req, count) {
        if (count >= 2) {
          insights.add({
            'icon': '💡',
            'type': 'Thói quen ăn uống',
            'message':
                'Gần như luôn yêu cầu: "$req" (phát hiện trong $count đơn gần nhất).',
            'color': Colors.purple.shade900,
          });
        }
      });
    }

    if (insights.isEmpty) {
      insights.add({
        'icon': '🤖',
        'type': 'Bình thường',
        'message':
            'Chưa phát hiện hành vi ăn uống đặc thù. Đơn hàng có thể chuẩn bị bình thường.',
        'color': Colors.grey.shade800,
      });
    }

    return insights;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ khách hàng')),
      body: BlocBuilder<StaffCustomersBloc, StaffCustomersState>(
        builder: (context, state) {
          if (state is CustomerDetailsLoading) {
            return const LoadingIndicator(
              message: 'Đang tải hồ sơ khách hàng...',
            );
          }

          if (state is CustomerDetailsError) {
            return AppErrorWidget(
              message: state.message,
              onRetry: _fetchDetails,
            );
          }

          if (state is CustomerDetailsLoaded) {
            final customer = state.customer;
            final orders = state.orders;
            final name = customer.fullName ?? customer.username;

            // Generate Insights
            final aiInsights = _generateOfflineAIInsights(customer, orders);

            // Calc success rates
            final completedOrders = orders
                .where((o) => o.status.toApiString() == 'completed')
                .toList();
            final cancelledOrders = orders
                .where((o) => o.status.toApiString() == 'cancelled')
                .toList();
            final totalOrdersCount = orders.length;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Profile Details Card
                  _buildProfileHeader(customer, name),
                  const SizedBox(height: 16),

                  // Success and cancel rate KPI
                  _buildStatsBanner(
                    totalOrdersCount,
                    completedOrders.length,
                    cancelledOrders.length,
                  ),
                  const SizedBox(height: 16),

                  // Health profile / Allergies
                  _buildAllergiesSection(customer),
                  const SizedBox(height: 16),

                  // Premium AI Insights Card
                  _buildPremiumAIInsightsCard(aiInsights),
                  const SizedBox(height: 16),

                  // Purchase history
                  _buildPurchaseHistory(orders),
                  const SizedBox(height: 16),

                  // Support conversations
                  _buildSupportConversations(),
                ],
              ),
            );
          }

          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildProfileHeader(UserModel customer, String name) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: Text(
                _safeInitial(name),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    customer.email,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  if (customer.phone != null && customer.phone!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      customer.phone!,
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (customer.phone != null && customer.phone!.isNotEmpty)
              IconButton(
                icon: const Icon(Icons.phone, color: Colors.green),
                onPressed: () => _callCustomer(customer.phone!),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsBanner(int total, int success, int cancelled) {
    final double cancelRate = total > 0 ? (cancelled / total) * 100 : 0.0;

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildStatItem('$total', 'TỔNG ĐƠN'),
            _buildStatItem('$success', 'THÀNH CÔNG', color: Colors.green),
            _buildStatItem(
              '${cancelRate.toStringAsFixed(0)}%',
              'TỶ LỆ HUỶ',
              color: cancelRate > 30 ? Colors.red : AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String value, String label, {Color? color}) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: color ?? AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: AppColors.textSecondary,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildAllergiesSection(UserModel customer) {
    final allergies =
        customer.health?.allergies ?? customer.preferences?.allergies ?? [];

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(
                  Icons.health_and_safety_outlined,
                  color: AppColors.primary,
                  size: 22,
                ),
                SizedBox(width: 8),
                Text(
                  'SỨC KHỎE & DỊ ỨNG',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (allergies.isEmpty)
              const Row(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    color: Colors.green,
                    size: 18,
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Không ghi nhận dị ứng thực phẩm',
                    style: TextStyle(
                      color: Colors.green,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              )
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Khách hàng có dị ứng với các nguyên liệu sau:',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: allergies.map((al) {
                      return Chip(
                        avatar: const Icon(
                          Icons.warning,
                          color: Colors.white,
                          size: 12,
                        ),
                        label: Text(
                          al,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                        backgroundColor: Colors.red.shade700,
                        padding: const EdgeInsets.all(4),
                      );
                    }).toList(),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPremiumAIInsightsCard(List<Map<String, dynamic>> insights) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: LinearGradient(
          colors: [Colors.grey.shade900, Colors.grey.shade800],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.auto_awesome,
                      color: Colors.amber,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'AI CUSTOMER INSIGHTS',
                      style: TextStyle(
                        color: Colors.amber.shade200,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.amber.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: Colors.amber.withValues(alpha: 0.3),
                    ),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.shield, color: Colors.amber, size: 10),
                      SizedBox(width: 4),
                      Text(
                        'OFFLINE AI',
                        style: TextStyle(
                          color: Colors.amber,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(color: Colors.white24, height: 20),

            // Content Insights List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: insights.length,
              separatorBuilder: (c, i) => const SizedBox(height: 12),
              itemBuilder: (c, i) {
                final insight = insights[i];
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      insight['icon'] as String,
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (insight['type'] as String).toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white70,
                              fontWeight: FontWeight.w900,
                              fontSize: 10,
                              letterSpacing: 0.3,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            insight['message'] as String,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPurchaseHistory(List<OrderModel> orders) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.history_outlined,
                  color: AppColors.primary,
                  size: 20,
                ),
                SizedBox(width: 8),
                Text(
                  'LỊCH SỬ MUA HÀNG',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                ),
              ],
            ),
          ),
          if (orders.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'Không có lịch sử mua hàng.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: orders.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final order = orders[index];
                final itemsSummary = order.items
                    .map(
                      (i) =>
                          '${i.name ?? i.product?.name ?? "Món"} x${i.quantity}',
                    )
                    .join(', ');

                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  title: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Đơn #${order.code}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      OrderStatusBadge(status: order.status),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          itemsSummary,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          Formatters.dateTime(order.createdAt),
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.textHint,
                          ),
                        ),
                      ],
                    ),
                  ),
                  trailing: PriceText(
                    price: order.totalPrice,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                  onTap: () => context.push('/staff/orders/${order.id}'),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSupportConversations() {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: const Row(
              children: [
                Icon(
                  Icons.support_agent_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
                SizedBox(width: 8),
                Text(
                  'HỘI THOẠI HỖ TRỢ',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                ),
              ],
            ),
          ),
          if (_conversationsLoading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_conversationsError != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    _conversationsError!,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: _fetchConversations,
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Thử lại'),
                  ),
                ],
              ),
            )
          else if (_conversations.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'Không có hội thoại hỗ trợ.',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _conversations.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final conv = _conversations[index];
                final convId =
                    conv['_id'] as String? ?? conv['id'] as String? ?? '';
                final status = conv['status'] as String? ?? 'active';
                final lastMsg = conv['lastMessage'] as Map<String, dynamic>?;
                final lastContent =
                    lastMsg?['content'] as String? ??
                    lastMsg?['text'] as String? ??
                    '';
                final updatedAt =
                    conv['updatedAt'] as String? ??
                    conv['createdAt'] as String? ??
                    '';
                final timeStr = updatedAt.isNotEmpty
                    ? Formatters.timeAgo(
                        DateTime.tryParse(updatedAt) ?? DateTime.now(),
                      )
                    : '';

                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: status == 'active'
                          ? AppColors.primary.withValues(alpha: 0.1)
                          : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.chat_rounded,
                      color: status == 'active'
                          ? AppColors.primary
                          : Colors.grey[400],
                      size: 20,
                    ),
                  ),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Hội thoại hỗ trợ',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: status == 'active'
                                ? AppColors.textPrimary
                                : AppColors.textSecondary,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: status == 'active'
                              ? Colors.green.withValues(alpha: 0.1)
                              : Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          status == 'active' ? 'Đang hoạt động' : 'Đã đóng',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: status == 'active'
                                ? Colors.green
                                : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            lastContent.isNotEmpty
                                ? lastContent
                                : 'Chưa có tin nhắn',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (timeStr.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Text(
                            timeStr,
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey[400],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  trailing: const Icon(
                    Icons.chevron_right,
                    color: AppColors.textHint,
                    size: 20,
                  ),
                  onTap: () => context.push('/staff/chat/$convId'),
                );
              },
            ),
        ],
      ),
    );
  }
}
