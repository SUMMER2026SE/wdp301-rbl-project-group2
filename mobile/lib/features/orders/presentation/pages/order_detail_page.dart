import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/order_status.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/order_status_badge.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// Inline model for status timeline entries parsed from API JSON.
class _StatusStep {
  final OrderStatus status;
  final String? changedBy;
  final String? actorRole;
  final String? reason;
  final DateTime createdAt;

  const _StatusStep({
    required this.status,
    this.changedBy,
    this.actorRole,
    this.reason,
    required this.createdAt,
  });

  factory _StatusStep.fromJson(Map<String, dynamic> json) => _StatusStep(
    status: OrderStatus.fromString(json['status'] as String? ?? ''),
    changedBy: json['changedBy'] as String?,
    actorRole: json['actorRole'] as String?,
    reason: json['reason'] as String?,
    createdAt:
        DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );
}

class OrderDetailPage extends StatefulWidget {
  final String id;

  const OrderDetailPage({super.key, required this.id});

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  OrderModel? _order;
  List<_StatusStep> _statusHistory = [];
  bool _isLoading = true;
  String? _error;
  bool _isCancelling = false;
  bool _isConfirming = false;

  @override
  void initState() {
    super.initState();
    _fetchOrderDetail();
  }

  Future<void> _fetchOrderDetail() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await ApiClient().dio.get(
        ApiEndpoints.orderById(widget.id),
      );
      final data = response.data;
      Map<String, dynamic> json;
      if (data is Map<String, dynamic>) {
        // Handle wrapped response: { data: { ... } }
        json = (data['data'] as Map<String, dynamic>?) ?? data;
      } else {
        json = <String, dynamic>{};
      }
      if (mounted) {
        setState(() {
          _order = OrderModel.fromJson(json);
          _statusHistory =
              (json['statusHistory'] as List<dynamic>?)
                  ?.map((e) => _StatusStep.fromJson(e as Map<String, dynamic>))
                  .toList() ??
              [];
          if (_statusHistory.isEmpty) {
            _statusHistory = _buildDefaultHistory();
          }
          _isLoading = false;
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          if (e.response?.statusCode == 404) {
            _error = 'Không tìm thấy đơn hàng';
          } else if (e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.receiveTimeout ||
              e.type == DioExceptionType.connectionError) {
            _error = 'Không có kết nối mạng';
          } else {
            _error = 'Đã có lỗi xảy ra';
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Không thể tải thông tin đơn hàng';
          _isLoading = false;
        });
      }
    }
  }

  List<_StatusStep> _buildDefaultHistory() {
    if (_order == null) return [];
    return [
      _StatusStep(status: OrderStatus.pending, createdAt: _order!.createdAt),
    ];
  }

  Future<void> _cancelOrder(String reason) async {
    setState(() => _isCancelling = true);
    try {
      await ApiClient().dio.patch(
        ApiEndpoints.cancelOrder(widget.id),
        data: {'reason': reason},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã hủy đơn hàng thành công'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _fetchOrderDetail();
      }
    } on DioException catch (e) {
      if (mounted) {
        final msg =
            e.response?.data?['message'] as String? ?? 'Không thể hủy đơn hàng';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  Future<void> _confirmDelivery() async {
    setState(() => _isConfirming = true);
    try {
      await ApiClient().dio.patch(ApiEndpoints.customerConfirm(widget.id));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Xác nhận đã nhận hàng thành công'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _fetchOrderDetail();
      }
    } on DioException catch (e) {
      if (mounted) {
        final msg =
            e.response?.data?['message'] as String? ?? 'Không thể xác nhận';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isConfirming = false);
    }
  }

  void _showCancelSheet() {
    final reasonController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        bool canSubmit = false;
        return StatefulBuilder(
          builder: (ctx, setSheetState) => Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 14,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Hủy đơn hàng',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Bạn có chắc muốn hủy đơn hàng này?',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: reasonController,
                  decoration: const InputDecoration(
                    hintText: 'Nhập lý do hủy (bắt buộc)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                  onChanged: (v) =>
                      setSheetState(() => canSubmit = v.trim().isNotEmpty),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: canSubmit
                        ? () {
                            final reason = reasonController.text.trim();
                            reasonController.dispose();
                            Navigator.of(ctx).pop();
                            _cancelOrder(reason);
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Xác nhận hủy'),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đơn hàng')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đơn hàng')),
        body: Center(
          child: AppErrorWidget(message: _error!, onRetry: _fetchOrderDetail),
        ),
      );
    }

    final order = _order!;
    return Scaffold(
      appBar: AppBar(
        title: Text('Đơn #${order.code}'),
        actions: [
          TextButton.icon(
            onPressed: () => context.push('/track-order/${widget.id}'),
            icon: const Icon(Icons.timeline, size: 18),
            label: const Text('Theo dõi'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoHeader(order),
                  const SizedBox(height: 16),
                  _buildSupportCard(),
                  const SizedBox(height: 16),
                  _expandableCard(
                    icon: Icons.shopping_bag_outlined,
                    title: 'Món ăn (${order.items.length})',
                    initiallyExpanded: true,
                    children: [_buildItemsContent(order)],
                  ),
                  const SizedBox(height: 12),
                  if (order.voucher != null)
                    _expandableCard(
                      icon: Icons.discount_outlined,
                      title: 'Voucher',
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(
                                    alpha: 0.1,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  order.voucher!,
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  if (order.voucher != null) const SizedBox(height: 12),
                  _expandableCard(
                    icon: Icons.location_on_outlined,
                    title: 'Địa chỉ giao hàng',
                    children: [_buildAddressContent(order)],
                  ),
                  const SizedBox(height: 12),
                  _expandableCard(
                    icon: Icons.payment_outlined,
                    title: 'Thanh toán',
                    children: [_buildPaymentContent(order)],
                  ),
                  const SizedBox(height: 12),
                  _expandableCard(
                    icon: Icons.receipt_long_outlined,
                    title: 'Chi tiết giá',
                    initiallyExpanded: true,
                    children: [_buildPriceContent(order)],
                  ),
                  const SizedBox(height: 12),
                  _expandableCard(
                    icon: Icons.timeline,
                    title: 'Trạng thái đơn hàng',
                    children: [_buildStatusContent()],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          _buildBottomActions(order),
        ],
      ),
    );
  }

  Widget _buildInfoHeader(OrderModel order) {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Mã đơn: #${order.code}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    Formatters.dateTime(order.createdAt),
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  if (order.storeName != null &&
                      order.storeName!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.store_outlined,
                          size: 14,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          order.storeName!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (order.note != null && order.note!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Ghi chú: ${order.note}',
                        style: TextStyle(
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                          color: Colors.amber.shade900,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            OrderStatusBadge(status: order.status),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomActions(OrderModel order) {
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              // Cancel button (only on pending)
              if (order.status == OrderStatus.pending) ...[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isCancelling ? null : _showCancelSheet,
                    icon: _isCancelling
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.cancel_outlined, size: 18),
                    label: const Text('Hủy đơn'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      minimumSize: const Size(0, 44),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              // "Đã nhận hàng" button when delivering
              if (order.status == OrderStatus.delivering) ...[
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isConfirming ? null : _confirmDelivery,
                    icon: _isConfirming
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.check_circle_outline, size: 18),
                    label: const Text('Đã nhận hàng'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 44),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              // Track Order button
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/track-order/${widget.id}'),
                  icon: const Icon(Icons.timeline, size: 18),
                  label: const Text('Theo dõi đơn'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 44),
                  ),
                ),
              ),
              // Review button (delivered/completed, no review check)
              if (order.status == OrderStatus.delivered ||
                  order.status == OrderStatus.completed) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/rating/${widget.id}'),
                    icon: const Icon(Icons.star_outline, size: 18),
                    label: const Text('Đánh giá'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 44),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          // Support button
          SizedBox(
            width: double.infinity,
            child: TextButton.icon(
              onPressed: () => context.push('/chat?orderId=${widget.id}'),
              icon: const Icon(Icons.headset_mic_outlined, size: 18),
              label: const Text('Hỗ trợ'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.textSecondary,
                minimumSize: const Size(0, 40),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Support card ──

  Widget _buildSupportCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.headset_mic_outlined, color: Colors.green),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Hỗ trợ trực tuyến',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                Text(
                  'Cần thay đổi món? Nhắn ngay cho cửa hàng.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => context.push('/chat?orderId=${widget.id}'),
            icon: const Icon(Icons.chat_bubble_outline_rounded, size: 22),
            color: AppColors.primary,
            tooltip: 'Nhắn tin hỗ trợ',
          ),
        ],
      ),
    );
  }

  // ── Expandable card wrapper ──

  Widget _expandableCard({
    required IconData icon,
    required String title,
    List<Widget> children = const [],
    bool initiallyExpanded = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ExpansionTile(
        initiallyExpanded: initiallyExpanded,
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        childrenPadding: const EdgeInsets.only(bottom: 4),
        leading: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 17, color: AppColors.primary),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        ),
        children: children,
      ),
    );
  }

  // ── Expandable card content builders ──

  Widget _buildItemsContent(OrderModel order) {
    return Column(
      children: order.items.map((item) {
        final itemName = item.name ?? item.product?.name ?? 'Món ăn';
        final itemTotal = item.subTotal;
        final unitPrice = item.quantity > 0 ? itemTotal / item.quantity : 0;

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      itemName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    if (item.variations.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.variations
                            .map((v) => '${v.name}: ${v.choice}')
                            .join(', '),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      '${Formatters.currency(unitPrice.toDouble())} x${item.quantity}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                Formatters.currency(itemTotal.toDouble()),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAddressContent(OrderModel order) {
    final addr = order.deliveryAddress;
    final fullAddress =
        '${addr.detail}, ${addr.ward}${addr.district != null ? ", ${addr.district}" : ""}, ${addr.city}';
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            addr.receiverName,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
          const SizedBox(height: 2),
          Text(
            Formatters.phone(addr.phone),
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            fullAddress,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentContent(OrderModel order) {
    final payment = order.payment;
    final isCOD = payment.method == 'cash';
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _priceRow('Phương thức', isCOD ? 'Tiền mặt (COD)' : 'Chuyển khoản'),
          const SizedBox(height: 8),
          _priceRow(
            'Trạng thái',
            order.payment.paidAt != null ? 'Đã thanh toán' : 'Chưa thanh toán',
            valueColor: order.payment.paidAt != null
                ? AppColors.success
                : AppColors.warning,
          ),
        ],
      ),
    );
  }

  Widget _buildPriceContent(OrderModel order) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _priceRow('Tạm tính', Formatters.currency(order.subTotal.toDouble())),
          const SizedBox(height: 8),
          _priceRow(
            'Phí giao hàng',
            Formatters.currency(order.shippingFee.toDouble()),
          ),
          if (order.discountAmount != null && order.discountAmount! > 0) ...[
            const SizedBox(height: 8),
            _priceRow(
              'Giảm giá',
              '-${Formatters.currency(order.discountAmount!.toDouble())}',
              valueColor: AppColors.success,
            ),
          ],
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Tổng cộng',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                Formatters.currency(order.totalPrice.toDouble()),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusContent() {
    if (_statusHistory.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Text('Chưa có thông tin trạng thái'),
      );
    }
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: List.generate(_statusHistory.length, (index) {
          final step = _statusHistory[index];
          final isLast = index == _statusHistory.length - 1;
          final isCancelled = step.status == OrderStatus.cancelled;
          final isCompleted =
              step.status == OrderStatus.completed ||
              step.status == OrderStatus.delivered;

          Color dotColor;
          if (isCancelled) {
            dotColor = AppColors.statusCancelled;
          } else if (isCompleted || index < _statusHistory.length - 1) {
            dotColor = AppColors.statusCompleted;
          } else {
            dotColor = AppColors.primary;
          }

          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 24,
                  child: Column(
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        margin: const EdgeInsets.only(top: 4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: dotColor,
                        ),
                      ),
                      if (!isLast)
                        Expanded(
                          child: Container(
                            width: 2,
                            color: dotColor.withValues(alpha: 0.4),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          step.status.label,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: isCancelled
                                ? AppColors.statusCancelled
                                : AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          Formatters.dateTime(step.createdAt),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textHint,
                          ),
                        ),
                        if (step.reason != null && step.reason!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Lý do: ${step.reason}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _priceRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
