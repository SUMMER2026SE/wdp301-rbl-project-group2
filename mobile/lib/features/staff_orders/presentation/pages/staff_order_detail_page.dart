import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/order_status.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/features/staff_orders/presentation/blocs/staff_orders_bloc.dart';
import 'package:foa_mobile/shared/widgets/order_status_badge.dart';
import 'package:foa_mobile/shared/widgets/price_text.dart';
import 'package:foa_mobile/shared/widgets/loading_indicator.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:url_launcher/url_launcher.dart';

class StaffOrderDetailPage extends StatefulWidget {
  final String id;

  const StaffOrderDetailPage({super.key, required this.id});

  @override
  State<StaffOrderDetailPage> createState() => _StaffOrderDetailPageState();
}

class _StaffOrderDetailPageState extends State<StaffOrderDetailPage> {
  OrderModel? _order;
  bool _loading = true;
  String? _error;
  bool _actioning = false;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthBloc>().state;
      if (auth is! AuthAuthenticated || auth.storeId == null) {
        setState(() => _error = 'Kh\xF4ng t\xECm thấy th\xF4ng tin cửa h\xE0ng');
        _loading = false;
        return;
      }
      final response = await ApiClient().dio.get(
        ApiEndpoints.staffOrderById(widget.id),
        queryParameters: {'storeId': auth.storeId},
      );
      final data = response.data;
      if (data != null && data['data'] != null) {
        setState(() {
          _order = OrderModel.fromJson(data['data'] as Map<String, dynamic>);
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Kh\xF4ng t\xECm thấy đơn h\xE0ng';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Kh\xF4ng thể tải chi tiết đơn h\xE0ng';
        _loading = false;
      });
    }
  }

  Future<void> _performAction(String action, {String? reason}) async {
    setState(() => _actioning = true);
    try {
      final auth = context.read<AuthBloc>().state as AuthAuthenticated;
      final api = ApiClient().dio;
      final storeId = auth.storeId;

      switch (action) {
        case 'confirm':
          await api.post(ApiEndpoints.staffConfirmOrder(widget.id), data: {'storeId': storeId});
        case 'reject':
          await api.post(ApiEndpoints.staffRejectOrder(widget.id), data: {
            'storeId': storeId,
            'reason': reason ?? '',
          });
        case 'ready':
          await api.post(ApiEndpoints.staffReadyOrder(widget.id), data: {'storeId': storeId});
        case 'deliver':
          await api.post(ApiEndpoints.staffDeliverOrder(widget.id), data: {'storeId': storeId});
        case 'complete':
          await api.post(ApiEndpoints.staffCompleteOrder(widget.id), data: {'storeId': storeId});
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_actionLabel(action)),
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
            content: Text('Thất bại: ${_actionLabel(action)}'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _actioning = false);
    }
  }

  String _actionLabel(String action) {
    switch (action) {
      case 'confirm':
        return 'Đ\xE3 x\xE1c nhận đơn h\xE0ng';
      case 'reject':
        return 'Đ\xE3 từ chối đơn h\xE0ng';
      case 'ready':
        return 'Đ\xE3 đ\xE1nh dấu sẵn s\xE0ng';
      case 'deliver':
        return 'Đ\xE3 bắt đầu giao h\xE0ng';
      case 'complete':
        return 'Đ\xE3 ho\xE0n tất giao h\xE0ng';
      default:
        return 'Thao t\xE1c th\xE0nh c\xF4ng';
    }
  }

  Future<void> _callPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: LoadingIndicator(message: 'Đang tải th\xF4ng tin đơn h\xE0ng...'));
    }
    if (_error != null || _order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đơn h\xE0ng')),
        body: AppErrorWidget(message: _error ?? 'Kh\xF4ng t\xECm thấy', onRetry: _fetch),
      );
    }

    final order = _order!;
    final name = order.customer?.fullName ?? order.customer?.username ?? 'Kh\xE1ch v\xE3ng lai';
    final phone = order.customer?.phone ?? order.deliveryAddress.phone;
    final address =
        '${order.deliveryAddress.detail}, ${order.deliveryAddress.ward}, ${order.deliveryAddress.city}';

    return Scaffold(
      appBar: AppBar(title: Text('Đơn #${order.code}')),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildOrderInfo(order, name, phone),
                  const SizedBox(height: 16),
                  _buildItems(order),
                  const SizedBox(height: 16),
                  _buildAddress(order, address, phone, name),
                  const SizedBox(height: 16),
                  _buildPayment(order),
                ],
              ),
            ),
          ),
          _buildStickyActions(order),
        ],
      ),
    );
  }

  Widget _buildOrderInfo(OrderModel order, String name, String phone) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('#${order.code}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                OrderStatusBadge(status: order.status),
              ],
            ),
            const SizedBox(height: 12),
            _infoRow(Icons.person_outline, name),
            if (phone.isNotEmpty) ...[
              const SizedBox(height: 6),
              _infoRow(Icons.phone_outlined, phone),
            ],
            const SizedBox(height: 6),
            _infoRow(Icons.access_time, Formatters.dateTime(order.createdAt)),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
      ],
    );
  }

  Widget _buildItems(OrderModel order) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: AppColors.surfaceVariant,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: const Row(
              children: [
                Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 20),
                SizedBox(width: 8),
                Text('M\xF3n ăn',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ),
          ),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: order.items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final item = order.items[i];
              final itemName = item.name ?? item.product?.name ?? 'Sản phẩm';
              return Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(itemName, style: const TextStyle(fontWeight: FontWeight.bold)),
                          if (item.variations.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                item.variations.map((v) => '${v.name}: ${v.choice}').join(', '),
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                            ),
                        ],
                      ),
                    ),
                    Text('x${item.quantity}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(width: 24),
                    PriceText(price: item.subTotal, fontSize: 14, fontWeight: FontWeight.bold),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAddress(OrderModel order, String address, String phone, String name) {
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
                Icon(Icons.location_on_outlined, color: AppColors.primary, size: 20),
                SizedBox(width: 8),
                Text('Giao đến', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(phone,
                          style: const TextStyle(
                              color: AppColors.primary, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(address,
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                ),
                if (phone.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.phone_in_talk, color: AppColors.primary),
                    onPressed: () => _callPhone(phone),
                  ),
              ],
            ),
            if (order.note != null && order.note!.isNotEmpty) ...[
              const Divider(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade100),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.notes, size: 16, color: Colors.amber.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(order.note!,
                          style: TextStyle(color: Colors.amber.shade900, fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPayment(OrderModel order) {
    final isCOD = order.payment.method == 'cash';
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
                Icon(Icons.payment_outlined, color: AppColors.primary, size: 20),
                SizedBox(width: 8),
                Text('Thanh to\xE1n', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              ],
            ),
            const SizedBox(height: 12),
            _paymentRow('Tạm t\xEDnh', Formatters.currency(order.subTotal)),
            const SizedBox(height: 6),
            _paymentRow('Ph\xED giao h\xE0ng', Formatters.currency(order.shippingFee)),
            if (order.discountAmount != null && order.discountAmount! > 0) ...[
              const SizedBox(height: 6),
              _paymentRow('Giảm gi\xE1', '-${Formatters.currency(order.discountAmount!)}',
                  color: AppColors.success),
            ],
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tổng cộng',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                PriceText(price: order.totalPrice, fontSize: 20, fontWeight: FontWeight.w700),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: isCOD ? Colors.orange.shade50 : Colors.green.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: isCOD ? Colors.orange.shade200 : Colors.green.shade200),
              ),
              child: Text(
                isCOD ? 'Thu tiền mặt (COD)' : 'Đ\xE3 thanh to\xE1n online',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                  color: isCOD ? Colors.orange.shade800 : Colors.green.shade800,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _paymentRow(String label, String value, {Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        Text(value, style: TextStyle(fontWeight: FontWeight.w600, color: color)),
      ],
    );
  }

  Widget _buildStickyActions(OrderModel order) {
    final transitions = order.status.staffTransitions;

    if (transitions.isEmpty || order.status.isTerminal) {
      return const SizedBox();
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: _actioning
          ? const Center(child: CircularProgressIndicator())
          : _actionButtons(order, transitions),
    );
  }

  Widget _actionButtons(OrderModel order, List<OrderStatus> transitions) {
    if (order.status == OrderStatus.pending) {
      return Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => _showRejectDialog(),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 52),
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
              ),
              child: const Text('Từ chối', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: () => _performAction('confirm'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(0, 52),
                backgroundColor: AppColors.success,
              ),
              child: const Text('X\xE1c nhận', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      );
    }

    if (transitions.contains(OrderStatus.readyForDelivery)) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () => _performAction('ready'),
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(double.infinity, 52),
            backgroundColor: AppColors.primary,
          ),
          child: const Text('Sẵn s\xE0ng giao', style: TextStyle(fontWeight: FontWeight.w600)),
        ),
      );
    }

    if (order.status == OrderStatus.readyForDelivery &&
        transitions.contains(OrderStatus.delivering)) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () => _performAction('deliver'),
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(double.infinity, 52),
            backgroundColor: AppColors.secondary,
          ),
          child: const Text('Bắt đầu giao h\xE0ng', style: TextStyle(fontWeight: FontWeight.w600)),
        ),
      );
    }

    if (order.status == OrderStatus.delivering &&
        transitions.contains(OrderStatus.completed)) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () => _performAction('complete'),
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(double.infinity, 52),
            backgroundColor: AppColors.success,
          ),
          child: const Text('Ho\xE0n tất giao h\xE0ng',
              style: TextStyle(fontWeight: FontWeight.w600)),
        ),
      );
    }

    return const SizedBox();
  }

  void _showRejectDialog() {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Từ chối đơn #${_order!.code}'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            hintText: 'Nhập l\xFD do từ chối...',
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = ctrl.text.trim();
              if (reason.isEmpty) return;
              Navigator.of(ctx).pop();
              _performAction('reject', reason: reason);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
  }
}
