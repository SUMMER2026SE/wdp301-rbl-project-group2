import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/order_status.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/order_status_badge.dart';
import 'package:foa_mobile/shared/widgets/empty_state_widget.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';
import 'package:url_launcher/url_launcher.dart';

class StaffDeliveryPage extends StatefulWidget {
  const StaffDeliveryPage({super.key});

  @override
  State<StaffDeliveryPage> createState() => _StaffDeliveryPageState();
}

class _StaffDeliveryPageState extends State<StaffDeliveryPage> {
  List<OrderModel> _orders = [];
  bool _loading = true;
  String? _error;
  String? _actioningId;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetch();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _fetch());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final auth = context.read<AuthBloc>().state;
      if (auth is! AuthAuthenticated || auth.storeId == null) return;
      final response = await ApiClient().dio.get(
        ApiEndpoints.staffOrders,
        queryParameters: {
          'storeId': auth.storeId,
          'status': 'delivering,shipping',
        },
      );
      final data = response.data;
      if (data != null && data['data'] != null) {
        final list = (data['data'] as List)
            .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
            .toList();
        final driverOrders = list.where((o) => o.deliveryInfo?.driverId == auth.userId).toList();
        if (mounted) {
          setState(() {
            _orders = driverOrders;
            _loading = false;
            _error = null;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Không thể tải danh sách giao hàng';
          _loading = false;
        });
      }
    }
  }

  Future<void> _completeDelivery(String orderId) async {
    setState(() => _actioningId = orderId);
    try {
      final auth = context.read<AuthBloc>().state as AuthAuthenticated;
      await ApiClient().dio.patch(
        ApiEndpoints.staffCompleteOrder(orderId),
        data: {'storeId': auth.storeId},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã giao hàng thành công!'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        unawaited(_fetch());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Không thể cập nhật trạng thái'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actioningId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Giao h\xE0ng'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetch,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return Shimmer.fromColors(
        baseColor: AppColors.shimmerBase,
        highlightColor: AppColors.shimmerHighlight,
        child: ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: 4,
          itemBuilder: (context, index) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            height: 160,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      );
    }

    if (_error != null) {
      return AppErrorWidget(message: _error!, onRetry: _fetch);
    }

    if (_orders.isEmpty) {
      return RefreshIndicator(
        onRefresh: _fetch,
        child: ListView(
          children: const [
            SizedBox(height: 120),
            EmptyStateWidget(
              icon: Icons.delivery_dining_outlined,
              title: 'Không có đơn giao hàng',
              subtitle: 'Bạn chưa nhận chuyến giao hàng nào. Hãy nhận đơn từ trang Đơn hàng!',
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _orders.length,
        itemBuilder: (context, index) => _DeliveryCard(
          order: _orders[index],
          isActioning: _actioningId == _orders[index].id,
          onComplete: () => _completeDelivery(_orders[index].id),
        ),
      ),
    );
  }
}

class _DeliveryCard extends StatefulWidget {
  final OrderModel order;
  final bool isActioning;
  final VoidCallback onComplete;

  const _DeliveryCard({
    required this.order,
    required this.isActioning,
    required this.onComplete,
  });

  @override
  State<_DeliveryCard> createState() => _DeliveryCardState();
}

class _DeliveryCardState extends State<_DeliveryCard> {
  late bool _isExpanded;

  @override
  void initState() {
    super.initState();
    _isExpanded = true;
  }

  @override
  void didUpdateWidget(covariant _DeliveryCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.order.id != widget.order.id) {
      _isExpanded = true;
    }
  }

  Future<void> _callCustomer(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openMap(String address) async {
    final query = Uri.encodeComponent(address);
    final googleMapsUrl = Uri.parse('https://www.google.com/maps/search/?api=1&query=$query');
    final appleMapsUrl = Uri.parse('maps://?q=$query');

    if (await canLaunchUrl(googleMapsUrl)) {
      await launchUrl(googleMapsUrl, mode: LaunchMode.externalApplication);
    } else if (await canLaunchUrl(appleMapsUrl)) {
      await launchUrl(appleMapsUrl);
    }
  }

  Color _statusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.readyForDelivery:
        return AppColors.statusReady;
      case OrderStatus.shipping:
      case OrderStatus.delivering:
        return AppColors.statusDelivering;
      case OrderStatus.delivered:
      case OrderStatus.completed:
        return AppColors.statusCompleted;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final name = order.customer?.fullName ?? order.customer?.username ?? 'Khách vãng lai';
    final phone = order.customer?.phone ?? order.deliveryAddress.phone;
    final address = '${order.deliveryAddress.detail}, ${order.deliveryAddress.ward}, ${order.deliveryAddress.city}';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.divider.withValues(alpha: 0.6),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left status colored strip
              Container(
                width: 6,
                color: _statusColor(order.status),
              ),
              // Content
              Expanded(
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
                              Text(
                                '#${order.code}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(width: 8),
                              OrderStatusBadge(status: order.status),
                            ],
                          ),
                          Row(
                            children: [
                              const Icon(Icons.access_time_rounded, size: 14, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                Formatters.timeAgo(order.createdAt),
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const Divider(height: 24, thickness: 0.8),

                      // Customer Info (Avatar + Name + Phone dial button + Payment Badge)
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (phone.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  InkWell(
                                    onTap: () => _callCustomer(phone),
                                    borderRadius: BorderRadius.circular(4),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.phone_in_talk_rounded, size: 12, color: Colors.green),
                                        const SizedBox(width: 4),
                                        Text(
                                          phone,
                                          style: const TextStyle(
                                            color: Colors.green,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          _buildPaymentBadge(),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Delivery Address Map box
                      InkWell(
                        onTap: () => _openMap(address),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.divider.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.map_rounded, color: AppColors.textSecondary, size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      address,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimary,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 3),
                                    const Row(
                                      children: [
                                        Text(
                                          'Mở bản đồ dẫn đường',
                                          style: TextStyle(
                                            color: Colors.blue,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        SizedBox(width: 4),
                                        Icon(Icons.navigation_outlined, size: 10, color: Colors.blue),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Expandable Items section
                      _buildItemsSection(order),

                      // Customer note if any
                      if (order.note != null && order.note!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        _buildNoteSection(order.note!),
                      ],

                      // CTA Actions Complete Delivery button
                      const SizedBox(height: 14),
                      if (widget.isActioning)
                        const Center(
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          ),
                        )
                      else
                        _buildActions(context),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentBadge() {
    final order = widget.order;
    final method = order.payment.method;
    final isPaid = order.payment.paidAt != null;
    final String label;
    final Color bgColor;
    final Color textColor;
    final Color borderColor;

    if (method == 'cash') {
      label = 'COD';
      bgColor = Colors.amber.shade50;
      textColor = Colors.amber.shade800;
      borderColor = Colors.amber.shade200;
    } else {
      if (isPaid) {
        label = 'Đã thanh toán';
        bgColor = Colors.green.shade50;
        textColor = Colors.green.shade800;
        borderColor = Colors.green.shade200;
      } else {
        label = 'Chờ thanh toán';
        bgColor = Colors.red.shade50;
        textColor = Colors.red.shade800;
        borderColor = Colors.red.shade200;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: borderColor, width: 0.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildItemsSection(OrderModel order) {
    final itemsCount = order.items.fold<int>(0, (s, item) => s + item.quantity);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        InkWell(
          onTap: () {
            setState(() {
              _isExpanded = !_isExpanded;
            });
          },
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.restaurant_menu_rounded,
                      size: 16,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Chi tiết món ăn ($itemsCount món)',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Text(
                      Formatters.compactCurrency(order.totalPrice),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      _isExpanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      size: 20,
                      color: AppColors.textSecondary,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (_isExpanded) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.surfaceVariant.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: List.generate(order.items.length * 2 - 1, (index) {
                if (index.isOdd) {
                  return const Divider(height: 12, thickness: 0.5);
                }
                final itemIndex = index ~/ 2;
                final item = order.items[itemIndex];
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${item.quantity}x',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.name ?? item.product?.name ?? 'Món ăn',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildNoteSection(String note) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.amber.shade100),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.info_outline_rounded,
            size: 16,
            color: Colors.amber.shade900,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              note,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.amber.shade900,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    final order = widget.order;
    final isCOD = order.payment.method == 'cash';

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
        label: Text(isCOD ? 'Đã thu COD & Hoàn thành' : 'Xác nhận đã giao'),
        onPressed: widget.onComplete,
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(0, 44),
          backgroundColor: isCOD ? Colors.orange.shade700 : AppColors.success,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
