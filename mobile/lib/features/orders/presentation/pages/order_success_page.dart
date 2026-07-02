import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// Order success page shown after a successful order placement.
class OrderSuccessPage extends StatefulWidget {
  final String id;
  const OrderSuccessPage({super.key, required this.id});

  @override
  State<OrderSuccessPage> createState() => _OrderSuccessPageState();
}

class _OrderSuccessPageState extends State<OrderSuccessPage>
    with SingleTickerProviderStateMixin {
  final Dio _dio = ApiClient().dio;
  bool _isLoading = true;
  String? _error;
  String? _orderCode;
  String? _paymentMethod;
  num? _totalPrice;
  String? _status;

  late AnimationController _animController;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _scaleAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.elasticOut,
    );
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
      ),
    );
    _loadOrder();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _extractOrderJson(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      return (responseData['data'] as Map<String, dynamic>?) ?? responseData;
    }
    return <String, dynamic>{};
  }

  Future<void> _loadOrder() async {
    try {
      final response =
          await _dio.get(ApiEndpoints.orderById(widget.id));
      final json = _extractOrderJson(response.data);

      setState(() {
        _orderCode = json['code'] as String? ?? '';
        _paymentMethod = _formatPaymentMethod(
            json['paymentMethod'] as String? ?? 'cash');
        _totalPrice = json['totalPrice'] as num?;
        _status = json['status'] as String?;
        _isLoading = false;
      });
      _animController.forward();
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        if (e.type == DioExceptionType.connectionError) {
          _error = 'Không có kết nối mạng.';
        } else if (e.response?.statusCode == 404) {
          _error = 'Không tìm thấy đơn hàng.';
        } else {
          _error = 'Không thể tải thông tin đơn hàng.';
        }
      });
    } catch (_) {
      setState(() {
        _isLoading = false;
        _error = 'Đã xảy ra lỗi.';
      });
    }
  }

  String _formatPaymentMethod(String method) {
    switch (method.toLowerCase()) {
      case 'cash':
      case 'cod':
        return 'Thanh toán khi nhận hàng (COD)';
      case 'payos':
      case 'bank_transfer':
        return 'Chuyển khoản ngân hàng (PayOS)';
      case 'momo':
        return 'Ví MoMo';
      case 'vnpay':
        return 'VNPay';
      case 'zalopay':
        return 'ZaloPay';
      default:
        return method;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? AppErrorWidget(
                    message: _error!, onRetry: _loadOrder)
                : _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 40),

            // Success icon with animation
            AnimatedBuilder(
              animation: _scaleAnim,
              builder: (context, child) => Transform.scale(
                scale: _scaleAnim.value,
                child: child,
              ),
              child: AnimatedBuilder(
                animation: _fadeAnim,
                builder: (context, child) => Opacity(
                  opacity: _fadeAnim.value,
                  child: child,
                ),
                child: const Column(
                  children: [
                    Icon(
                      Icons.check_circle_rounded,
                      size: 100,
                      color: AppColors.success,
                    ),
                  ],
                ),
              ),
            ),

            // Sparkle decorations
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.star_rounded,
                    size: 20,
                    color: Colors.amber[300], shadows: const [
                  BoxShadow(
                      color: Colors.amber, blurRadius: 8, spreadRadius: 0)
                ]),
                const SizedBox(width: 40),
                Icon(Icons.auto_awesome,
                    size: 24,
                    color: AppColors.primary, shadows: const [
                  BoxShadow(
                      color: AppColors.primary, blurRadius: 8, spreadRadius: 0)
                ]),
                const SizedBox(width: 40),
                Icon(Icons.star_rounded,
                    size: 20,
                    color: Colors.amber[300], shadows: const [
                  BoxShadow(
                      color: Colors.amber, blurRadius: 8, spreadRadius: 0)
                ]),
              ],
            ),

            const SizedBox(height: 24),

            // Success text
            FadeTransition(
              opacity: _fadeAnim,
              child: const Column(
                children: [
                  Text(
                    'Đặt hàng thành công!',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ xác nhận đơn hàng sớm nhất.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Order details card
            FadeTransition(
              opacity: _fadeAnim,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.divider),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.success.withValues(alpha: 0.08),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    if (_orderCode != null && _orderCode!.isNotEmpty) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'Mã đơn hàng: ',
                            style: TextStyle(
                              fontSize: 15,
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            '#$_orderCode',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: AppColors.textPrimary,
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Container(
                        width: 40,
                        height: 3,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                    if (_paymentMethod != null) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.payment_rounded,
                              color: AppColors.primary, size: 18),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _paymentMethod!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w600,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (_totalPrice != null || _status != null) ...[
                      const SizedBox(height: 12),
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      if (_totalPrice != null)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('Tổng tiền: ',
                                style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                            Text(
                              Formatters.currency(_totalPrice!.toDouble()),
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      if (_status != null && _status!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('Trạng thái: ',
                                style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _status!.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.success,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),

            const SizedBox(height: 40),

            // Action buttons
            FadeTransition(
              opacity: _fadeAnim,
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        context.go('/track-order/${widget.id}');
                      },
                      icon: const Icon(Icons.timeline_rounded, size: 20),
                      label: const Text('Theo dõi đơn hàng'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.go('/orders/${widget.id}');
                      },
                      icon: const Icon(Icons.receipt_long_rounded, size: 20),
                      label: const Text('Xem chi tiết'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.go('/home');
                      },
                      icon: const Icon(Icons.home_rounded, size: 20),
                      label: const Text('Tiếp tục mua món'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
