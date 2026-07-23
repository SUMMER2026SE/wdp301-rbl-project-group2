import 'package:flutter/material.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/order_status.dart';

/// Colored badge for order status display.
class OrderStatusBadge extends StatelessWidget {
  final OrderStatus status;
  final double fontSize;

  const OrderStatusBadge({
    super.key,
    required this.status,
    this.fontSize = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: _textColor,
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color get _backgroundColor {
    switch (status) {
      case OrderStatus.pending:
        return AppColors.statusPending.withValues(alpha: 0.15);
      case OrderStatus.confirmed:
      case OrderStatus.processing:
        return AppColors.statusConfirmed.withValues(alpha: 0.15);
      case OrderStatus.preparing:
        return AppColors.statusPreparing.withValues(alpha: 0.15);
      case OrderStatus.readyForDelivery:
        return AppColors.statusReady.withValues(alpha: 0.15);
      case OrderStatus.shipping:
      case OrderStatus.delivering:
        return AppColors.statusDelivering.withValues(alpha: 0.15);
      case OrderStatus.delivered:
      case OrderStatus.completed:
        return AppColors.statusCompleted.withValues(alpha: 0.15);
      case OrderStatus.cancelled:
      case OrderStatus.refunded:
        return AppColors.statusCancelled.withValues(alpha: 0.15);
    }
  }

  Color get _textColor {
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
}
