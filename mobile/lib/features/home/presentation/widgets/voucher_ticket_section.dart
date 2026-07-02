import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class VoucherTicketSection extends StatelessWidget {
  final List<Map<String, dynamic>> vouchers;

  const VoucherTicketSection({
    super.key,
    required this.vouchers,
  });

  String _getDiscountLabel(Map<String, dynamic> v) {
    final discountType = v['discountType'] as String?;
    final discountValue = v['discountValue'];
    final discountPercent = v['discountPercent'];
    final discountAmount = v['discountAmount'];

    if (discountType == 'percentage' && discountValue is num && discountValue > 0) {
      return '-${discountValue.toStringAsFixed(discountValue % 1 == 0 ? 0 : 1)}%';
    }
    if ((discountType == 'fixed_amount' || discountType == 'freeship') && discountValue is num && discountValue > 0) {
      return '-${Formatters.compactCurrency(discountValue)}';
    }
    if (discountPercent != null && (discountPercent as num) > 0) {
      return '-$discountPercent%';
    }
    if (discountAmount != null && (discountAmount as num) > 0) {
      return '-${Formatters.compactCurrency(discountAmount)}';
    }
    return 'Ưu đãi';
  }

  IconData _getCategoryIcon(String? category) {
    if (category == 'freeship') return Icons.local_shipping_outlined;
    if (category == 'newuser') return Icons.card_giftcard;
    return Icons.local_offer;
  }

  List<Color> _getCategoryGradient(String? category) {
    if (category == 'freeship') {
      return [const Color(0xFFFF9800), const Color(0xFFFF6D00)];
    }
    if (category == 'newuser') {
      return [const Color(0xFF00BFA5), const Color(0xFF00897B)];
    }
    return [const Color(0xFFFF6B35), const Color(0xFFE55A2B)];
  }

  String _getCategoryLabel(String? category) {
    if (category == 'freeship') return 'Freeship';
    if (category == 'newuser') return 'Mới';
    if (category == 'special') return 'Đặc biệt';
    return 'Giảm giá';
  }

  @override
  Widget build(BuildContext context) {
    if (vouchers.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
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
                    child: const Icon(Icons.confirmation_number_outlined, color: AppColors.primary, size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Ví Voucher',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${vouchers.length > 5 ? "5+" : vouchers.length}',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: () => context.push('/vouchers'),
                child: const Text('Xem tất cả'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: vouchers.length > 5 ? 5 : vouchers.length,
            itemBuilder: (context, index) {
              final v = vouchers[index];
              final id = v['_id'] as String? ?? v['id'] as String? ?? '';
              final code = v['code'] as String? ?? '';
              final title = v['title'] as String? ?? 'Khuyến mãi';
              final category = v['category'] as String?;
              final validUntilRaw = (v['validUntil'] ?? v['endAt']) as String?;
              final validUntil = validUntilRaw != null ? DateTime.tryParse(validUntilRaw) : null;
              final minOrder = v['minOrderValue'] as num?;

              final gradientColors = _getCategoryGradient(category);
              final categoryIcon = _getCategoryIcon(category);

              return GestureDetector(
                onTap: () {
                  if (id.isNotEmpty) context.push('/vouchers/$id');
                },
                child: Container(
                  width: 280,
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.divider.withValues(alpha: 0.4)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Left: Discount badge with gradient
                      Container(
                        width: 88,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: gradientColors,
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: const BorderRadius.horizontal(left: Radius.circular(13)),
                        ),
                        child: Stack(
                          children: [
                            // Decorative circle
                            Positioned(
                              top: -10,
                              right: -10,
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white.withValues(alpha: 0.1),
                                ),
                              ),
                            ),
                            // Content
                            Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(categoryIcon, color: Colors.white.withValues(alpha: 0.8), size: 20),
                                  const SizedBox(height: 6),
                                  Text(
                                    _getDiscountLabel(v),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                      height: 1,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _getCategoryLabel(category),
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.7),
                                      fontSize: 9,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Notch circles (ticket effect)
                            Positioned(
                              right: -6,
                              top: 0,
                              bottom: 0,
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 12,
                                    height: 12,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Right: Details
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              if (minOrder != null && minOrder > 0)
                                Text(
                                  'Đơn tối thiểu ${Formatters.compactCurrency(minOrder)}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              const Spacer(),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  if (validUntil != null)
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.access_time, size: 10, color: AppColors.textHint.withValues(alpha: 0.7)),
                                        const SizedBox(width: 3),
                                        Text(
                                          Formatters.date(validUntil),
                                          style: TextStyle(
                                            fontSize: 9,
                                            color: AppColors.textHint.withValues(alpha: 0.8),
                                          ),
                                        ),
                                      ],
                                    ),
                                  GestureDetector(
                                    onTap: () {
                                      Clipboard.setData(ClipboardData(text: code));
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Đã sao chép mã $code!'),
                                          backgroundColor: AppColors.success,
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          duration: const Duration(seconds: 2),
                                        ),
                                      );
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: gradientColors[0].withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(
                                          color: gradientColors[0].withValues(alpha: 0.2),
                                          width: 1,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.content_copy, size: 10, color: gradientColors[0]),
                                          const SizedBox(width: 3),
                                          Text(
                                            code.length > 8 ? '${code.substring(0, 8)}…' : code,
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                              color: gradientColors[0],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
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
