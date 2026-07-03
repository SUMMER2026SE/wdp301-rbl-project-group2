import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/features/staff_delivery/presentation/blocs/staff_delivery_bloc.dart';
import 'package:foa_mobile/shared/widgets/price_text.dart';
import 'package:foa_mobile/shared/widgets/empty_state_widget.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class DeliveryModePage extends StatefulWidget {
  const DeliveryModePage({super.key});

  @override
  State<DeliveryModePage> createState() => _DeliveryModePageState();
}

class _DeliveryModePageState extends State<DeliveryModePage> {
  @override
  void initState() {
    super.initState();
    _fetchDeliveries();
    _setupSocketListener();
  }

  void _fetchDeliveries({bool showLoader = true}) {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated && authState.storeId != null) {
      context.read<StaffDeliveryBloc>().add(
        FetchAssignedDeliveriesEvent(
          storeId: authState.storeId!,
          driverId: authState.userId,
          showLoader: showLoader,
        ),
      );
    }
  }

  void _setupSocketListener() {
    // Socket listener to automatically reload on status updates
    SocketService().on('order:status_updated', (_) {
      if (mounted) {
        _fetchDeliveries(showLoader: false);
      }
    });
  }

  @override
  void dispose() {
    SocketService().off('order:status_updated');
    super.dispose();
  }

  Future<void> _callCustomer(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openMap(String address) async {
    final query = Uri.encodeComponent(address);
    final googleMapsUrl = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$query',
    );
    final appleMapsUrl = Uri.parse('maps://?q=$query');

    if (await canLaunchUrl(googleMapsUrl)) {
      await launchUrl(googleMapsUrl, mode: LaunchMode.externalApplication);
    } else if (await canLaunchUrl(appleMapsUrl)) {
      await launchUrl(appleMapsUrl);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state as AuthAuthenticated;
    final storeId = authState.storeId ?? '';
    final driverId = authState.userId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chuyến Giao Hàng'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _fetchDeliveries(showLoader: true),
          ),
        ],
      ),
      body: BlocConsumer<StaffDeliveryBloc, StaffDeliveryState>(
        listener: (context, state) {
          if (state is StaffDeliveryLoaded && state.message != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message!),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is StaffDeliveryLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is StaffDeliveryError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    state.message,
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => _fetchDeliveries(),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          if (state is StaffDeliveryLoaded) {
            final deliveries = state.deliveries;

            // KPI Calculations
            final codOrders = deliveries
                .where((o) => o.payment.method == 'cash')
                .toList();
            final totalCODAmount = codOrders.fold<int>(
              0,
              (sum, o) => sum + o.totalPrice,
            );

            return Column(
              children: [
                // KPI Metrics Banner
                _buildKpiBanner(
                  deliveries.length,
                  codOrders.length,
                  totalCODAmount,
                ),

                Expanded(
                  child: deliveries.isEmpty
                      ? const EmptyStateWidget(
                          icon: Icons.check_circle_outline,
                          title: 'Không có đơn cần giao',
                          subtitle:
                              'Bạn đã hoàn thành xuất sắc tất cả chuyến giao hàng!',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          itemCount: deliveries.length,
                          itemBuilder: (context, index) {
                            final order = deliveries[index];
                            final isActioning =
                                state.actioningOrderId == order.id;

                            return _buildDeliveryCard(
                              context,
                              order,
                              storeId,
                              driverId,
                              isActioning,
                            );
                          },
                        ),
                ),
              ],
            );
          }

          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildKpiBanner(int total, int codCount, int codAmount) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: _KpiBox(
              value: '$total',
              label: 'CẦN GIAO',
              color: Colors.blue.shade800,
              bgColor: Colors.blue.shade50,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _KpiBox(
              value: '$codCount',
              label: 'ĐƠN COD',
              color: Colors.orange.shade800,
              bgColor: Colors.orange.shade50,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _KpiBox(
              value: Formatters.currency(codAmount),
              label: 'TIỀN COD',
              color: Colors.red.shade800,
              bgColor: Colors.red.shade50,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryCard(
    BuildContext context,
    OrderModel order,
    String storeId,
    String driverId,
    bool isActioning,
  ) {
    final customerName =
        order.customer?.fullName ??
        order.customer?.username ??
        'Khách vãng lai';
    final customerPhone = order.customer?.phone ?? order.deliveryAddress.phone;
    final fullAddress =
        '${order.deliveryAddress.detail}, ${order.deliveryAddress.ward}, ${order.deliveryAddress.city}';
    final isCOD = order.payment.method == 'cash';
    final itemsCount = order.items.fold<int>(0, (sum, i) => sum + i.quantity);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.divider),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Code & Total Price Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    TextButton(
                      onPressed: () =>
                          _showOrderDetailsBottomSheet(context, order),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        minimumSize: Size.zero,
                        backgroundColor: Colors.grey.shade100,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Row(
                        children: [
                          Text(
                            'Đơn #${order.code}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.chevron_right,
                            size: 16,
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: isCOD
                            ? Colors.orange.shade50
                            : Colors.green.shade50,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isCOD
                              ? Colors.orange.shade100
                              : Colors.green.shade100,
                        ),
                      ),
                      child: Text(
                        isCOD ? 'COD' : 'ONLINE',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: isCOD
                              ? Colors.orange.shade800
                              : Colors.green.shade800,
                        ),
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    PriceText(
                      price: order.totalPrice,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: isCOD
                          ? Colors.orange.shade800
                          : Colors.green.shade800,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${Formatters.time(order.updatedAt)} • $itemsCount món',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const Divider(height: 20),

            // Customer Name & Call button
            Row(
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                  child: Text(
                    customerName.trim().isNotEmpty
                        ? customerName.trim()[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    customerName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                if (customerPhone.isNotEmpty)
                  GestureDetector(
                    onTap: () => _callCustomer(customerPhone),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        border: Border.all(color: Colors.green.shade100),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.phone,
                            size: 12,
                            color: Colors.green,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            customerPhone,
                            style: const TextStyle(
                              color: Colors.green,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Delivery Address with navigation link
            InkWell(
              onTap: () => _openMap(fullAddress),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.map_outlined,
                      color: AppColors.textSecondary,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            fullAddress,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
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
                              Icon(
                                Icons.navigation_outlined,
                                size: 10,
                                color: Colors.blue,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Delivery Action CTA Button
            isActioning
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: () => _showConfirmationModal(
                      context,
                      order,
                      storeId,
                      driverId,
                    ),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 46),
                      backgroundColor: isCOD
                          ? Colors.orange.shade700
                          : Colors.green.shade700,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle_outline, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          isCOD
                              ? 'ĐÃ THU COD & HOÀN THÀNH'
                              : 'XÁC NHẬN ĐÃ GIAO',
                        ),
                      ],
                    ),
                  ),
          ],
        ),
      ),
    );
  }

  void _showConfirmationModal(
    BuildContext context,
    OrderModel order,
    String storeId,
    String driverId,
  ) {
    final isCOD = order.payment.method == 'cash';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(
              Icons.local_shipping,
              color: isCOD ? Colors.orange : Colors.green,
            ),
            const SizedBox(width: 8),
            const Text('Xác nhận đã giao'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bạn xác nhận đã giao đơn hàng #${order.code} thành công?',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 16),
            if (isCOD)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.shade100),
                ),
                child: Column(
                  children: [
                    const Text(
                      'SỐ TIỀN CẦN THU COD',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Colors.orange,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      Formatters.currency(order.totalPrice),
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Colors.orange.shade900,
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: const Column(
                  children: [
                    Text(
                      'TRẠNG THÁI THANH TOÁN',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Colors.green,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'ĐÃ THANH TOÁN ONLINE',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Hủy bỏ'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<StaffDeliveryBloc>().add(
                CompleteDeliveryEvent(
                  orderId: order.id,
                  storeId: storeId,
                  driverId: driverId,
                ),
              );
              Navigator.of(ctx).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: isCOD
                  ? Colors.orange.shade700
                  : Colors.green.shade700,
            ),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
  }

  void _showOrderDetailsBottomSheet(BuildContext context, OrderModel order) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Chi tiết đơn #${order.code}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
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
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'x${item.quantity}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.name ?? item.product?.name ?? 'Sản phẩm',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                if (item.variations.isNotEmpty)
                                  Text(
                                    item.variations
                                        .map((v) => '${v.name}: ${v.choice}')
                                        .join(' • '),
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 11,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Text(
                            Formatters.currency(item.subTotal),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              // Note
              if (order.note != null && order.note!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    'Ghi chú của khách: "${order.note}"',
                    style: TextStyle(
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                      color: Colors.amber.shade900,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),

              // Total
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Tổng cộng cần thu',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  PriceText(
                    price: order.totalPrice,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
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

class _KpiBox extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  final Color bgColor;

  const _KpiBox({
    required this.value,
    required this.label,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: color,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w900,
              color: color.withValues(alpha: 0.7),
              letterSpacing: 0.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
