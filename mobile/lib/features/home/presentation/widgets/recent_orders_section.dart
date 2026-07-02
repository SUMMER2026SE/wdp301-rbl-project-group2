import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class RecentOrdersSection extends StatelessWidget {
  final List<Map<String, dynamic>> recentOrders;
  final bool isError;
  final VoidCallback onRetry;
  final Function(Map<String, dynamic>) onAddToCart;

  const RecentOrdersSection({
    super.key,
    required this.recentOrders,
    this.isError = false,
    required this.onRetry,
    required this.onAddToCart,
  });

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending': return AppColors.statusPending;
      case 'confirmed': return AppColors.statusConfirmed;
      case 'preparing': return AppColors.statusPreparing;
      case 'ready': return AppColors.statusReady;
      case 'delivering': return AppColors.statusDelivering;
      case 'delivered':
      case 'completed': return AppColors.statusCompleted;
      case 'cancelled': return AppColors.statusCancelled;
      default: return AppColors.textSecondary;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'preparing': return 'Đang chuẩn bị';
      case 'ready': return 'Chờ giao/Lấy';
      case 'delivering': return 'Đang giao';
      case 'delivered':
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'pending': return Icons.schedule;
      case 'confirmed': return Icons.check_circle_outline;
      case 'preparing': return Icons.restaurant;
      case 'ready': return Icons.takeout_dining;
      case 'delivering': return Icons.delivery_dining;
      case 'delivered':
      case 'completed': return Icons.task_alt;
      case 'cancelled': return Icons.cancel_outlined;
      default: return Icons.receipt_long;
    }
  }

  void _handleReorder(BuildContext context, List<dynamic> items) {
    for (final item in items) {
      if (item is Map<String, dynamic> && item['productId'] != null) {
        final productPayload = {
          '_id': item['productId'],
          'name': item['name'] ?? 'Món ăn',
        };
        onAddToCart(productPayload);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isError) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.red[50],
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.red[100]!),
          ),
          child: Row(
            children: [
              Icon(Icons.error_outline, color: Colors.red[400], size: 20),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Không thể tải đơn hàng gần đây',
                  style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ),
              TextButton(
                onPressed: onRetry,
                style: TextButton.styleFrom(
                  minimumSize: const Size(40, 28),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
                child: const Text('Thử lại', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        ),
      );
    }

    if (recentOrders.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.receipt_long, color: AppColors.primary, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Text('Đơn hàng gần đây',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                ],
              ),
              TextButton(
                onPressed: () => context.push('/orders'),
                child: const Text('Xem tất cả'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 155,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: recentOrders.length,
            itemBuilder: (context, index) {
              final order = recentOrders[index];
              final id = order['_id'] as String? ?? '';
              final status = order['status'] as String? ?? 'pending';
              final totalPrice = (order['totalPrice'] as num?)?.toDouble() ?? 0;
              final createdAt = DateTime.tryParse(order['createdAt'] as String? ?? '');
              final items = order['items'] as List<dynamic>? ?? [];
              final firstItem = items.isNotEmpty ? items.first as Map<String, dynamic>? : null;
              final firstItemName = firstItem?['name'] as String? ?? 'Món ăn';
              // Backend populates items.productId -> { _id, name, image, price }
              final populatedProduct = firstItem?['productId'];
              final firstItemImage = (populatedProduct is Map<String, dynamic>
                  ? populatedProduct['image'] as String?
                  : null) ?? firstItem?['image'] as String? ?? '';
              final itemCount = items.length;
              final statusColor = _getStatusColor(status);
              final statusIcon = _getStatusIcon(status);

              return GestureDetector(
                onTap: () => context.push('/orders/$id'),
                child: Container(
                  width: 280,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.divider.withValues(alpha: 0.5)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        // Product image thumbnail
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            color: AppColors.surfaceVariant,
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: firstItemImage.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: firstItemImage,
                                    fit: BoxFit.cover,
                                    placeholder: (_, _) => Container(
                                      color: AppColors.shimmerBase,
                                      child: const Icon(Icons.restaurant, color: AppColors.textHint, size: 24),
                                    ),
                                    errorWidget: (_, _, _) => Container(
                                      color: AppColors.surfaceVariant,
                                      child: const Icon(Icons.restaurant, color: AppColors.primary, size: 24),
                                    ),
                                  )
                                : Container(
                                    color: AppColors.surfaceVariant,
                                    child: const Icon(Icons.restaurant, color: AppColors.primary, size: 24),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Order info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // Status badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(statusIcon, size: 11, color: statusColor),
                                    const SizedBox(width: 4),
                                    Text(
                                      _getStatusText(status),
                                      style: TextStyle(
                                        color: statusColor,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 6),
                              // Item summary
                              Text(
                                firstItemName,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (itemCount > 1)
                                Text(
                                  '+${itemCount - 1} món khác',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              const SizedBox(height: 6),
                              // Price + time row
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    Formatters.currency(totalPrice),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  if (createdAt != null)
                                    Text(
                                      Formatters.timeAgo(createdAt),
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: AppColors.textHint,
                                      ),
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
              );
            },
          ),
        ),
      ],
    );
  }
}
