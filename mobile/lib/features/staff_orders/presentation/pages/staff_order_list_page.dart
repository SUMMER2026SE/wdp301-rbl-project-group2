import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/order_status.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/features/staff_orders/presentation/blocs/staff_orders_bloc.dart';
import 'package:foa_mobile/features/staff_delivery/presentation/blocs/staff_delivery_bloc.dart';
import 'package:foa_mobile/shared/widgets/order_status_badge.dart';
import 'package:foa_mobile/shared/widgets/empty_state_widget.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';

/// Tab filter definition.
class _StatusTab {
  final String label;
  final String? statusFilter; // null = all

  const _StatusTab({required this.label, this.statusFilter});
}

const _tabs = [
  _StatusTab(label: 'Chờ xác nhận', statusFilter: 'pending'),
  _StatusTab(
    label: 'Đang chuẩn bị',
    statusFilter: 'confirmed,processing,preparing',
  ),
  _StatusTab(label: 'Sẵn sàng giao', statusFilter: 'ready_for_delivery'),
  _StatusTab(label: 'Lịch sử', statusFilter: 'completed,cancelled,refunded'),
];

class StaffOrderListPage extends StatefulWidget {
  const StaffOrderListPage({super.key});

  @override
  State<StaffOrderListPage> createState() => _StaffOrderListPageState();
}

class _StaffOrderListPageState extends State<StaffOrderListPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  Timer? _refreshTimer;
  Timer? _overdueTimer;
  List<OrderModel> _overdueOrders = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) _fetchOrders();
    });
    _fetchOrders();
    _setupSocketListener();
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _fetchOrders(showLoader: false);
    });
    _overdueTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _checkOverdue();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _refreshTimer?.cancel();
    _overdueTimer?.cancel();
    SocketService().off('order:new');
    SocketService().off('order:status_updated');
    super.dispose();
  }

  void _fetchOrders({bool showLoader = true}) {
    final auth = context.read<AuthBloc>().state;
    if (auth is AuthAuthenticated && auth.storeId != null) {
      final tab = _tabs[_tabController.index];
      context.read<StaffOrdersBloc>().add(
        FetchStaffOrdersEvent(
          storeId: auth.storeId!,
          status: tab.statusFilter,
          showLoader: showLoader,
        ),
      );
    }
  }

  void _setupSocketListener() {
    final auth = context.read<AuthBloc>().state;
    if (auth is AuthAuthenticated && auth.storeId != null) {
      SocketService().on('order:new', (_) {
        if (mounted) _fetchOrders(showLoader: false);
      });
      SocketService().on('order:status_updated', (_) {
        if (mounted) _fetchOrders(showLoader: false);
      });
    }
  }

  void _checkOverdue() {
    final state = context.read<StaffOrdersBloc>().state;
    if (state is StaffOrdersLoaded) {
      final fiveMinAgo = DateTime.now().subtract(const Duration(minutes: 5));
      setState(() {
        _overdueOrders = state.orders
            .where(
              (o) =>
                  o.status == OrderStatus.pending &&
                  o.createdAt.isBefore(fiveMinAgo),
            )
            .toList();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn h\xE0ng'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          tabs: _tabs.map((t) => Tab(text: t.label)).toList(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _fetchOrders(),
          ),
        ],
      ),
      body: BlocListener<StaffDeliveryBloc, StaffDeliveryState>(
        listener: (context, state) {
          if (state is StaffDeliveryError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        child: BlocConsumer<StaffOrdersBloc, StaffOrdersState>(
          listener: (context, state) {
            if (state is StaffOrdersLoaded && state.message != null) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message!),
                  backgroundColor: AppColors.primary,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
          builder: (context, state) {
            if (state is StaffOrdersLoading) {
              return _buildShimmer();
            }
            if (state is StaffOrdersError) {
              return AppErrorWidget(
                message: state.message,
                onRetry: () => _fetchOrders(),
              );
            }
            if (state is StaffOrdersLoaded) {
              final sorted = List<OrderModel>.from(state.orders)
                ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
              return Column(
                children: [
                  if (_overdueOrders.isNotEmpty)
                    Container(
                      width: double.infinity,
                      color: Colors.red.shade50,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.warning_amber_rounded,
                            color: Colors.red.shade700,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${_overdueOrders.length} đơn qu\xE1 5 ph\xFAt chưa x\xE1c nhận',
                            style: TextStyle(
                              color: Colors.red.shade800,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: () async => _fetchOrders(),
                      child: sorted.isEmpty
                          ? ListView(
                              children: const [
                                SizedBox(height: 120),
                                EmptyStateWidget(
                                  icon: Icons.receipt_long_outlined,
                                  title: 'Kh\xF4ng c\xF3 đơn h\xE0ng',
                                  subtitle:
                                      'C\xE1c đơn h\xE0ng sẽ xuất hiện tại đ\xE2y',
                                ),
                              ],
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              itemCount: sorted.length,
                              itemBuilder: (_, i) => _OrderCard(
                                order: sorted[i],
                                storeId:
                                    (context.read<AuthBloc>().state
                                            as AuthAuthenticated)
                                        .storeId ??
                                    '',
                                isActioning:
                                    state.actioningOrderId == sorted[i].id,
                              ),
                            ),
                    ),
                  ),
                ],
              );
            }
            return const SizedBox();
          },
        ),
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: 6,
        itemBuilder: (context, index) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 140,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}

class _OrderCard extends StatefulWidget {
  final OrderModel order;
  final String storeId;
  final bool isActioning;

  const _OrderCard({
    required this.order,
    required this.storeId,
    required this.isActioning,
  });

  @override
  State<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends State<_OrderCard> {
  late bool _isExpanded;

  @override
  void initState() {
    super.initState();
    final status = widget.order.status;
    _isExpanded =
        status == OrderStatus.pending ||
        status == OrderStatus.confirmed ||
        status == OrderStatus.processing ||
        status == OrderStatus.preparing;
  }

  @override
  void didUpdateWidget(covariant _OrderCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.order.id != widget.order.id) {
      final status = widget.order.status;
      _isExpanded =
          status == OrderStatus.pending ||
          status == OrderStatus.confirmed ||
          status == OrderStatus.processing ||
          status == OrderStatus.preparing;
    }
  }

  Color _statusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return AppColors.statusPending;
      case OrderStatus.confirmed:
      case OrderStatus.processing:
        return AppColors.statusConfirmed;
      case OrderStatus.preparing:
        return AppColors.statusPreparing;
      case OrderStatus.readyForDelivery:
        return AppColors.statusReady;
      case OrderStatus.shipping:
      case OrderStatus.delivering:
        return AppColors.statusDelivering;
      case OrderStatus.delivered:
      case OrderStatus.completed:
        return AppColors.statusCompleted;
      case OrderStatus.cancelled:
      case OrderStatus.refunded:
        return AppColors.statusCancelled;
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final isOverdue =
        order.status == OrderStatus.pending &&
        DateTime.now().difference(order.createdAt).inMinutes >= 5;

    return Dismissible(
      key: ValueKey('order_${order.id}'),
      background: _swipeBackground(Colors.green, Icons.check_circle_outline),
      secondaryBackground: _swipeBackground(Colors.red, Icons.cancel_outlined),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.endToStart) {
          _showRejectDialog(context);
          return false;
        }
        if (direction == DismissDirection.startToEnd &&
            order.status == OrderStatus.pending) {
          context.read<StaffOrdersBloc>().add(
            ConfirmOrderEvent(orderId: order.id, storeId: widget.storeId),
          );
        }
        return false;
      },
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: isOverdue ? Colors.red.shade50 : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isOverdue
                ? Colors.red.shade200
                : AppColors.divider.withValues(alpha: 0.6),
            width: isOverdue ? 1.5 : 1,
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
                Container(width: 6, color: _statusColor(order.status)),
                Expanded(
                  child: InkWell(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    onTap: () => context.push('/staff/orders/${order.id}'),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildHeader(context, isOverdue),
                          const Divider(height: 24, thickness: 0.8),
                          _buildCustomerInfo(order),
                          _buildItemsSection(order),
                          if (order.note != null && order.note!.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            _buildNoteSection(order.note!),
                          ],
                          if (isOverdue) ...[
                            const SizedBox(height: 10),
                            _buildOverdueBanner(order),
                          ],
                          const SizedBox(height: 14),
                          if (widget.isActioning)
                            const Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                ),
                              ),
                            )
                          else
                            _buildActions(context),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _swipeBackground(Color color, IconData icon) {
    return Container(
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.only(left: 24),
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, color: Colors.white, size: 32),
    );
  }

  Widget _buildHeader(BuildContext context, bool isOverdue) {
    final order = widget.order;
    return Row(
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
            Icon(
              Icons.access_time_rounded,
              size: 14,
              color: isOverdue ? Colors.red.shade700 : AppColors.textSecondary,
            ),
            const SizedBox(width: 4),
            Text(
              Formatters.timeAgo(order.createdAt),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isOverdue
                    ? Colors.red.shade700
                    : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCustomerInfo(OrderModel order) {
    final name =
        order.customer?.fullName ??
        order.customer?.username ??
        'Kh\xE1ch v\xE3ng lai';
    final phone = order.deliveryAddress.phone;

    return Row(
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
                Text(
                  phone,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 8),
        _buildPaymentBadge(),
      ],
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
        label = 'Đ\xE3 thanh to\xE1n';
        bgColor = Colors.green.shade50;
        textColor = Colors.green.shade800;
        borderColor = Colors.green.shade200;
      } else {
        label = 'Chờ thanh to\xE1n';
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
                      'Chi tiết m\xF3n ăn ($itemsCount m\xF3n)',
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
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
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

  Widget _buildOverdueBanner(OrderModel order) {
    final diff = DateTime.now().difference(order.createdAt).inMinutes;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade100),
      ),
      child: Row(
        children: [
          Icon(Icons.alarm_on_rounded, color: Colors.red.shade700, size: 16),
          const SizedBox(width: 6),
          Text(
            'Trễ $diff ph\xFAt chưa x\xE1c nhận!',
            style: TextStyle(
              color: Colors.red.shade700,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    final order = widget.order;
    final transitions = order.status.staffTransitions;

    if (order.status == OrderStatus.pending) {
      return Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.close_rounded, size: 18),
              label: const Text('Từ chối'),
              onPressed: () => _showRejectDialog(context),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 42),
                foregroundColor: Colors.red.shade700,
                side: BorderSide(color: Colors.red.shade300),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              icon: const Icon(Icons.check_rounded, size: 18),
              label: const Text('X\xE1c nhận'),
              onPressed: () {
                context.read<StaffOrdersBloc>().add(
                  ConfirmOrderEvent(orderId: order.id, storeId: widget.storeId),
                );
              },
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(0, 42),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      );
    }

    if (transitions.contains(OrderStatus.readyForDelivery)) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          icon: const Icon(Icons.restaurant_rounded, size: 18),
          label: const Text('Chuẩn bị xong'),
          onPressed: () {
            context.read<StaffOrdersBloc>().add(
              ReadyOrderEvent(orderId: order.id, storeId: widget.storeId),
            );
          },
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(0, 42),
            backgroundColor: AppColors.success,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    if (order.status == OrderStatus.readyForDelivery) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          icon: const Icon(Icons.local_shipping_rounded, size: 18),
          label: const Text('Tôi đi giao đơn'),
          onPressed: () {
            final authState =
                context.read<AuthBloc>().state as AuthAuthenticated;
            context.read<StaffDeliveryBloc>().add(
              AssignDeliveryEvent(
                orderId: order.id,
                storeId: widget.storeId,
                driverId: authState.userId,
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(0, 42),
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    return const SizedBox();
  }

  void _showRejectDialog(BuildContext context) {
    final ctrl = TextEditingController();
    final order = widget.order;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.cancel_outlined, color: Colors.red.shade700, size: 22),
            const SizedBox(width: 8),
            Text(
              'Từ chối đơn #${order.code}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: TextField(
          controller: ctrl,
          decoration: InputDecoration(
            hintText: 'Nhập l\xFD do từ chối...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.primary),
            ),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Hủy',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = ctrl.text.trim();
              if (reason.isEmpty) return;
              context.read<StaffOrdersBloc>().add(
                RejectOrderEvent(
                  orderId: order.id,
                  storeId: widget.storeId,
                  reason: reason,
                ),
              );
              Navigator.of(ctx).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
  }
}
