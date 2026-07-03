import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';
import 'package:go_router/go_router.dart';

/// Voucher detail page with full info, terms, and how-to-use.
class VoucherDetailPage extends StatefulWidget {
  final String id;
  const VoucherDetailPage({super.key, required this.id});

  @override
  State<VoucherDetailPage> createState() => _VoucherDetailPageState();
}

class _VoucherDetailPageState extends State<VoucherDetailPage> {
  final Dio _dio = ApiClient().dio;
  Map<String, dynamic>? _voucher;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadVoucher();
  }

  Future<void> _loadVoucher() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _dio.get(ApiEndpoints.voucherById(widget.id));
      final data = res.data;
      setState(() {
        _voucher = data is Map<String, dynamic>
            ? (data['data'] as Map<String, dynamic>? ?? data)
            : <String, dynamic>{};
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _error =
            e.response?.data['message'] as String? ??
            'Không thể tải thông tin voucher';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Đã xảy ra lỗi';
        _loading = false;
      });
    }
  }

  bool _isExpired() {
    if (_voucher == null) return false;
    final exp = Formatters.parseDate(_voucher!['validUntil'] as String?);
    return exp != null && exp.isBefore(DateTime.now());
  }

  bool _isPercentage() {
    if (_voucher == null) return false;
    return _voucher!['discountPercent'] != null &&
        (_voucher!['discountPercent'] as num) > 0;
  }

  String _discountLabel() {
    if (_voucher == null) return 'Giảm';
    if (_voucher!['discountPercent'] != null &&
        (_voucher!['discountPercent'] as num) > 0) {
      return '-${_voucher!['discountPercent']}%';
    }
    if (_voucher!['discountAmount'] != null &&
        (_voucher!['discountAmount'] as num) > 0) {
      return '-${Formatters.compactCurrency(_voucher!['discountAmount'] as num)}';
    }
    return 'Giảm';
  }

  String _discountDescription() {
    if (_voucher == null) return '';
    if (_isPercentage()) {
      final pct = _voucher!['discountPercent'] as num;
      final maxAmt = _voucher!['maxDiscountAmount'];
      if (maxAmt != null && (maxAmt as num) > 0) {
        return 'Giảm $pct% (tối đa ${Formatters.compactCurrency(maxAmt)})';
      }
      return 'Giảm $pct%';
    }
    final amt = _voucher!['discountAmount'] as num?;
    if (amt != null && amt > 0) {
      return 'Giảm ${Formatters.currency(amt)}';
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _loading
          ? _buildLoading()
          : _error != null
          ? AppErrorWidget(message: _error!, onRetry: _loadVoucher)
          : _voucher != null
          ? _buildContent()
          : const SizedBox.shrink(),
    );
  }

  // ── Loading shimmer ──

  Widget _buildLoading() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: Column(
        children: [
          Container(height: 220, color: Colors.white),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(height: 24, width: 200, color: Colors.white),
                const SizedBox(height: 12),
                Container(height: 16, width: 120, color: Colors.white),
                const SizedBox(height: 12),
                Container(height: 14, color: Colors.white),
                const SizedBox(height: 8),
                Container(height: 14, width: 160, color: Colors.white),
                const SizedBox(height: 24),
                Container(height: 16, width: 100, color: Colors.white),
                const SizedBox(height: 8),
                Container(height: 14, color: Colors.white),
                const SizedBox(height: 8),
                Container(height: 14, color: Colors.white),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Main content ──

  Widget _buildContent() {
    final v = _voucher!;
    final expired = _isExpired();
    final isPct = _isPercentage();
    final heroColor = expired
        ? Colors.grey[400]!
        : (isPct ? AppColors.primary : AppColors.success);
    final validUntil = Formatters.parseDate(v['validUntil'] as String?);
    final usedCount = v['usedCount'] as num? ?? 0;
    final usageLimit = v['usageLimit'] as num?;
    final minOrder = v['minOrderAmount'] as num? ?? 0;

    return CustomScrollView(
      slivers: [
        // ── Gradient hero section ──
        SliverAppBar(
          expandedHeight: 220,
          pinned: true,
          backgroundColor: heroColor,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    heroColor,
                    heroColor.withValues(alpha: 0.85),
                    heroColor.withValues(alpha: 0.7),
                  ],
                ),
              ),
              child: Stack(
                children: [
                  // Decorative circles
                  Positioned(
                    top: -40,
                    right: -40,
                    child: _buildDecoCircle(
                      120,
                      Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  Positioned(
                    bottom: -30,
                    left: -30,
                    child: _buildDecoCircle(
                      100,
                      Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                  // Content
                  Positioned(
                    left: 16,
                    bottom: 60,
                    right: 16,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Discount badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.local_offer,
                                color: Colors.white.withValues(alpha: 0.9),
                                size: 22,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                _discountLabel(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          v['title'] as String? ?? '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Back button and code
                  Positioned(
                    top: MediaQuery.of(context).padding.top + 4,
                    left: 4,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => context.pop(),
                    ),
                  ),
                  Positioned(
                    top: MediaQuery.of(context).padding.top + 8,
                    right: 16,
                    child: expired
                        ? Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'Đã hết hạn',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ),
        ),

        // ── Body ──
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Code + copy
                if (v['code'] != null)
                  _buildCodeRow(v['code'] as String, expired),
                const SizedBox(height: 16),

                // Description
                if (v['description'] != null &&
                    (v['description'] as String).isNotEmpty)
                  _buildInfoCard(
                    icon: Icons.description_outlined,
                    title: 'Mô tả',
                    children: [
                      Text(
                        v['description'] as String,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 12),

                // Discount detail
                _buildInfoCard(
                  icon: Icons.sell_outlined,
                  title: 'Chi tiết ưu đãi',
                  children: [
                    _buildInfoRow('Giá trị giảm', _discountDescription()),
                    if (minOrder > 0)
                      _buildInfoRow(
                        'Đơn tối thiểu',
                        Formatters.compactCurrency(minOrder),
                      ),
                    if (validUntil != null)
                      _buildInfoRow(
                        'Hạn sử dụng',
                        Formatters.dateTime(validUntil),
                      ),
                    if (usageLimit != null)
                      _buildInfoRow('Đã dùng', '$usedCount / $usageLimit lượt'),
                  ],
                ),
                const SizedBox(height: 12),

                // How to use
                if (v['howToUse'] != null &&
                    (v['howToUse'] as String).isNotEmpty)
                  _buildInfoCard(
                    icon: Icons.lightbulb_outline,
                    title: 'Cách sử dụng',
                    children: [
                      Text(
                        v['howToUse'] as String,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 12),

                // Terms
                if (v['terms'] != null && (v['terms'] as String).isNotEmpty)
                  _buildInfoCard(
                    icon: Icons.gavel_outlined,
                    title: 'Điều khoản & điều kiện',
                    children: [
                      Text(
                        v['terms'] as String,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textHint,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),

                const SizedBox(height: 24),

                // Copy button at bottom
                if (!expired && v['code'] != null)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Clipboard.setData(
                          ClipboardData(text: v['code'] as String),
                        );
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Đã sao chép mã giảm giá!'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy),
                      label: const Text('Sao chép mã giảm giá'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 48),
                        textStyle: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDecoCircle(double size, Color color) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
    );
  }

  Widget _buildCodeRow(String code, bool expired) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: expired
            ? Colors.grey[100]
            : AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: expired
              ? Colors.grey[300]!
              : AppColors.primary.withValues(alpha: 0.25),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mã khuyến mãi',
                  style: TextStyle(
                    fontSize: 11,
                    color: expired ? Colors.grey[500] : AppColors.textHint,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  code,
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.5,
                    color: expired ? Colors.grey[500] : AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          if (!expired)
            TextButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: code));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Đã sao chép mã!'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
              icon: const Icon(Icons.copy, size: 16),
              label: const Text('Sao chép'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: AppColors.textHint),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
