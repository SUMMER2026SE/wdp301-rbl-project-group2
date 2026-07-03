import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/order_status.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/order_status_badge.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// Step definition for the order timeline.
class _TimelineStep {
  final OrderStatus status;
  final String label;
  final String? description;
  final String? actor;
  final DateTime? timestamp;

  const _TimelineStep({
    required this.status,
    required this.label,
    this.description,
    this.actor,
    this.timestamp,
  });
}

/// Lightweight status history entry parsed from raw API JSON.
class _RawStatusEntry {
  final String status;
  final String? changedBy;
  final String? actorRole;
  final DateTime createdAt;

  const _RawStatusEntry({
    required this.status,
    this.changedBy,
    this.actorRole,
    required this.createdAt,
  });

  factory _RawStatusEntry.fromJson(Map<String, dynamic> json) =>
      _RawStatusEntry(
        status: json['status'] as String? ?? '',
        changedBy: json['changedBy'] as String?,
        actorRole: json['actorRole'] as String?,
        createdAt:
            DateTime.tryParse(json['createdAt'] as String? ?? '') ??
            DateTime.now(),
      );
}

class TrackOrderPage extends StatefulWidget {
  final String id;

  const TrackOrderPage({super.key, required this.id});

  @override
  State<TrackOrderPage> createState() => _TrackOrderPageState();
}

class _TrackOrderPageState extends State<TrackOrderPage>
    with SingleTickerProviderStateMixin {
  OrderModel? _order;
  List<_RawStatusEntry> _rawHistory = [];
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _error;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  // Timeline definition: all possible statuses in chronological order.
  static final List<_TimelineStep> _allTimelineSteps = [
    const _TimelineStep(
      status: OrderStatus.pending,
      label: 'Đặt hàng thành công',
      description: 'Đơn hàng đã được ghi nhận và đang chờ xác nhận',
    ),
    const _TimelineStep(
      status: OrderStatus.confirmed,
      label: 'Đã xác nhận',
      description: 'Cửa hàng đã xác nhận đơn hàng của bạn',
    ),
    const _TimelineStep(
      status: OrderStatus.preparing,
      label: 'Đang chuẩn bị',
      description: 'Cửa hàng đang chuẩn bị món ăn cho bạn',
    ),
    const _TimelineStep(
      status: OrderStatus.readyForDelivery,
      label: 'Sẵn sàng giao hàng',
      description: 'Đơn hàng đã sẵn sàng và chờ được giao',
    ),
    const _TimelineStep(
      status: OrderStatus.delivering,
      label: 'Đang giao hàng',
      description: 'Đơn hàng đang trên đường được giao đến bạn',
    ),
    const _TimelineStep(
      status: OrderStatus.delivered,
      label: 'Đã giao hàng',
      description: 'Đơn hàng đã được giao thành công',
    ),
    const _TimelineStep(
      status: OrderStatus.completed,
      label: 'Hoàn thành',
      description: 'Đơn hàng đã hoàn tất',
    ),
    const _TimelineStep(
      status: OrderStatus.cancelled,
      label: 'Đã hủy',
      description: 'Đơn hàng đã bị hủy',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _fetchOrder();
    _setupSocketListener();
  }

  void _setupSocketListener() {
    final socket = SocketService();
    // Socket is already connected via AuthBloc
    socket.on('order:status_updated', _onOrderUpdate);
  }

  void _onOrderUpdate(dynamic data) {
    if (data is Map && data['orderId'] == widget.id) {
      if (mounted) {
        _fetchOrder();
      }
    } else if (data is Map && data['orderId'] == null) {
      // Some events send just the status without orderId filter
      if (mounted) {
        _fetchOrder();
      }
    }
  }

  @override
  void dispose() {
    SocketService().off('order:status_updated');
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _fetchOrder() async {
    if (_order != null) {
      // Non-disruptive refresh: only show refreshing indicator, not full loading
      setState(() {
        _isRefreshing = true;
        _error = null;
      });
    } else {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }
    try {
      final response = await ApiClient().dio.get(
        ApiEndpoints.orderById(widget.id),
      );
      final data = response.data;
      Map<String, dynamic> json;
      if (data is Map<String, dynamic>) {
        json = (data['data'] as Map<String, dynamic>?) ?? data;
      } else {
        json = <String, dynamic>{};
      }
      if (mounted) {
        setState(() {
          _order = OrderModel.fromJson(json);
          _rawHistory =
              (json['statusHistory'] as List<dynamic>?)
                  ?.map(
                    (e) => _RawStatusEntry.fromJson(e as Map<String, dynamic>),
                  )
                  .toList() ??
              [];
          if (_rawHistory.isEmpty && _order != null) {
            _rawHistory = [
              _RawStatusEntry(
                status: _order!.status.toApiString(),
                createdAt: _order!.createdAt,
              ),
            ];
          }
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    } on DioException catch (e) {
      if (mounted) {
        if (e.response?.statusCode == 404) {
          _error = 'Không tìm thấy đơn hàng';
        } else if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.connectionError) {
          _error = 'Không có kết nối mạng';
        } else {
          _error = 'Đã có lỗi xảy ra';
        }
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Không thể tải thông tin đơn hàng';
          _isLoading = false;
          _isRefreshing = false;
        });
      }
    }
  }

  /// Returns the ordered steps for rendering, highlighting based on current status.
  List<_TimelineStep> _getDisplaySteps(OrderStatus currentStatus) {
    // If we have raw history from API, build steps from that.
    if (_rawHistory.length > 1) {
      return _rawHistory.map((h) {
        final status = OrderStatus.fromString(h.status);
        final stepDef = _allTimelineSteps.firstWhere(
          (s) => s.status == status,
          orElse: () =>
              const _TimelineStep(status: OrderStatus.pending, label: ''),
        );
        return _TimelineStep(
          status: status,
          label: stepDef.label.isNotEmpty ? stepDef.label : status.label,
          description: stepDef.description,
          actor: h.actorRole,
          timestamp: h.createdAt,
        );
      }).toList();
    }

    // No raw history — build from current status.
    if (currentStatus == OrderStatus.cancelled) {
      return _allTimelineSteps
          .where(
            (s) =>
                s.status == OrderStatus.pending ||
                s.status == OrderStatus.cancelled,
          )
          .toList();
    }

    final currentIdx = _allTimelineSteps.indexWhere(
      (s) =>
          s.status == currentStatus ||
          (currentStatus == OrderStatus.processing &&
              s.status == OrderStatus.confirmed),
    );

    if (currentIdx < 0) return [];
    return _allTimelineSteps.sublist(0, currentIdx + 1);
  }

  bool _isStepCompleted(List<_TimelineStep> steps, int index) {
    return index < steps.length - 1;
  }

  bool _isStepCurrent(List<_TimelineStep> steps, int index) {
    return index == steps.length - 1;
  }

  Color _dotColor(
    List<_TimelineStep> steps,
    int index,
    OrderStatus currentStatus,
  ) {
    if (currentStatus == OrderStatus.cancelled) {
      final s = steps[index];
      return s.status == OrderStatus.cancelled
          ? AppColors.statusCancelled
          : AppColors.statusCompleted;
    }
    if (index < steps.length - 1) {
      return AppColors.statusCompleted;
    }
    return AppColors.primary;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Theo dõi đơn hàng')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Theo dõi đơn hàng')),
        body: Center(
          child: AppErrorWidget(
            message: _error ?? 'Lỗi không xác định',
            onRetry: _fetchOrder,
          ),
        ),
      );
    }

    final order = _order!;
    final steps = _getDisplaySteps(order.status);

    return Scaffold(
      appBar: AppBar(title: Text('Đơn #${order.code}')),
      body: RefreshIndicator(
        onRefresh: _fetchOrder,
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildCurrentStatusHero(order),
              if (_isRefreshing) const LinearProgressIndicator(minHeight: 2),
              const SizedBox(height: 20),
              _buildTimeline(steps, order.status),
              const SizedBox(height: 24),
              if (order.deliveryInfo != null) ...[
                _buildDeliveryInfo(order.deliveryInfo!),
                const SizedBox(height: 20),
              ],
              _buildAutoUpdateHint(),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentStatusHero(OrderModel order) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _iconForStatus(order.status),
                color: AppColors.primary,
                size: 30,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.status.label,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      'Đơn #${order.code}',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              OrderStatusBadge(status: order.status),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Tổng tiền',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              Text(
                Formatters.currency(order.totalPrice.toDouble()),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 20,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.schedule, size: 14, color: AppColors.textHint),
              const SizedBox(width: 4),
              Text(
                Formatters.dateTime(order.createdAt),
                style: const TextStyle(fontSize: 12, color: AppColors.textHint),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _iconForStatus(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return Icons.receipt_long_outlined;
      case OrderStatus.confirmed:
      case OrderStatus.processing:
      case OrderStatus.preparing:
        return Icons.restaurant_outlined;
      case OrderStatus.readyForDelivery:
      case OrderStatus.shipping:
      case OrderStatus.delivering:
        return Icons.delivery_dining_outlined;
      case OrderStatus.delivered:
      case OrderStatus.completed:
        return Icons.check_circle_outline;
      case OrderStatus.cancelled:
      case OrderStatus.refunded:
        return Icons.cancel_outlined;
    }
  }

  Widget _buildTimeline(List<_TimelineStep> steps, OrderStatus currentStatus) {
    if (steps.isEmpty) return const SizedBox();

    final isCancelled = currentStatus == OrderStatus.cancelled;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.timeline, color: AppColors.primary, size: 20),
            SizedBox(width: 8),
            Text(
              'Tiến trình đơn hàng',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ],
        ),
        const SizedBox(height: 20),
        ...List.generate(steps.length, (index) {
          final step = steps[index];
          final isCompleted = _isStepCompleted(steps, index);
          final isCurrent = _isStepCurrent(steps, index);
          final dotColor = _dotColor(steps, index, currentStatus);

          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Dot + connector column
                SizedBox(
                  width: 32,
                  child: Column(
                    children: [
                      // Dot with optional pulse
                      _buildTimelineDot(
                        isCurrent: isCurrent,
                        isCompleted: isCompleted,
                        isCancelled: isCancelled,
                        dotColor: dotColor,
                        isPulsing: isCurrent && !isCancelled,
                      ),
                      // Connector line
                      if (index < steps.length - 1)
                        Expanded(
                          child: Container(
                            width: 2,
                            margin: const EdgeInsets.symmetric(vertical: 2),
                            color: dotColor.withValues(alpha: 0.4),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                // Content
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(
                      bottom: index < steps.length - 1 ? 28 : 0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          step.label,
                          style: TextStyle(
                            fontWeight: isCurrent
                                ? FontWeight.bold
                                : FontWeight.w500,
                            fontSize: 14,
                            color:
                                isCancelled &&
                                    step.status == OrderStatus.cancelled
                                ? AppColors.statusCancelled
                                : (isCurrent
                                      ? AppColors.primary
                                      : (isCompleted
                                            ? AppColors.textPrimary
                                            : AppColors.textHint)),
                          ),
                        ),
                        if (step.description != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            step.description!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                        if (step.timestamp != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            Formatters.dateTime(step.timestamp!),
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textHint,
                            ),
                          ),
                        ],
                        if (step.actor != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Bởi: ${step.actor}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.textHint,
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
      ],
    );
  }

  Widget _buildTimelineDot({
    required bool isCurrent,
    required bool isCompleted,
    required bool isCancelled,
    required Color dotColor,
    required bool isPulsing,
  }) {
    Widget dot = Container(
      width: isPulsing ? 18 : 14,
      height: isPulsing ? 18 : 14,
      margin: const EdgeInsets.only(top: 2),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: dotColor,
        boxShadow: isPulsing
            ? [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.4),
                  blurRadius: 8,
                  spreadRadius: 2,
                ),
              ]
            : null,
      ),
      child: isCompleted
          ? const Icon(Icons.check, size: 10, color: Colors.white)
          : null,
    );

    if (!isPulsing) return dot;

    return FadeTransition(opacity: _pulseAnimation, child: dot);
  }

  Widget _buildDeliveryInfo(OrderDeliveryInfoModel deliveryInfo) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.local_shipping_rounded,
                color: AppColors.primary,
                size: 20,
              ),
              SizedBox(width: 8),
              Text(
                'Thông tin giao hàng',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ],
          ),
          if (deliveryInfo.driverId != null &&
              deliveryInfo.driverId!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.person_outline,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Mã tài xế: ${deliveryInfo.driverId}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ],
          if (deliveryInfo.shippedAt != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(
                  Icons.schedule,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Đã giao cho tài xế: ${Formatters.dateTime(deliveryInfo.shippedAt!)}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ],
          if (deliveryInfo.deliveredAt != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(
                  Icons.check_circle_outline,
                  size: 16,
                  color: Colors.green,
                ),
                const SizedBox(width: 8),
                Text(
                  'Đã giao hàng: ${Formatters.dateTime(deliveryInfo.deliveredAt!)}',
                  style: const TextStyle(fontSize: 13, color: Colors.green),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAutoUpdateHint() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.sync, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(
            'Trạng thái được cập nhật tự động',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.primary.withValues(alpha: 0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
