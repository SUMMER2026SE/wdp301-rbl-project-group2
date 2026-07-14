import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';

/// Handles PayOS redirect callback on Flutter Web.
/// PayOS appends params BEFORE # in hash routing, e.g.:
///   /?code=00&id=...&cancel=true#/payos-callback
/// So we read from Uri.base which includes all pre-# params.
class PayosCallbackPage extends StatelessWidget {
  const PayosCallbackPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Uri.base captures all query params (even those before # in hash routing).
    final uri = Uri.base;
    final payosCode = uri.queryParameters['code'] ?? '';
    // PayOS uses cancel=true for cancelled payments.
    final cancelled = uri.queryParameters['cancel'] == 'true';
    final isPaid = payosCode == '00' && !cancelled;

    if (cancelled || !isPaid) {
      return _buildResult(
        context,
        icon: Icons.cancel_rounded,
        iconColor: AppColors.error,
        title: 'Thanh toán thất bại',
        subtitle: 'Đơn hàng đã bị hủy hoặc thanh toán không thành công.',
      );
    }

    return _buildResult(
      context,
      icon: Icons.check_circle_rounded,
      iconColor: AppColors.success,
      title: 'Thanh toán thành công!',
      subtitle: 'Cảm ơn bạn đã đặt hàng.\nĐơn hàng đang được xử lý.',
    );
  }

  Widget _buildResult(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 80, color: iconColor),
                const SizedBox(height: 24),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 40),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => context.go('/orders'),
                    child: const Text('Xem đơn hàng'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton(
                    onPressed: () => context.go('/home'),
                    child: const Text('Về trang chủ'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
