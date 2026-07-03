import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// Order failed page shown when an order placement fails.
class OrderFailedPage extends StatefulWidget {
  final String id;
  const OrderFailedPage({super.key, required this.id});

  @override
  State<OrderFailedPage> createState() => _OrderFailedPageState();
}

class _OrderFailedPageState extends State<OrderFailedPage>
    with SingleTickerProviderStateMixin {
  final Dio _dio = ApiClient().dio;
  bool _isLoading = true;
  String? _error;
  String? _orderCode;
  String? _failureReason;

  late AnimationController _animController;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scaleAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.elasticIn,
    );
    _loadOrder();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _loadOrder() async {
    if (widget.id == 'unknown' || widget.id.trim().isEmpty) {
      setState(() {
        _isLoading = false;
        _failureReason = 'Không thể tạo đơn hàng. Vui lòng thử lại.';
      });
      unawaited(_animController.forward());
      return;
    }
    try {
      final response = await _dio.get(ApiEndpoints.orderById(widget.id));
      final body = response.data is Map<String, dynamic>
          ? (response.data as Map<String, dynamic>)
          : <String, dynamic>{};
      final data = body['data'] is Map<String, dynamic>
          ? (body['data'] as Map<String, dynamic>)
          : body;

      setState(() {
        _orderCode = data['code'] as String? ?? '';
        _failureReason =
            data['failureReason'] as String? ??
            data['cancellation']?['reason'] as String?;
        _isLoading = false;
      });
      unawaited(_animController.forward());
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        if (e.type == DioExceptionType.connectionError) {
          _error = 'Không có kết nối mạng.';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
            ? AppErrorWidget(message: _error!, onRetry: _loadOrder)
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
            const SizedBox(height: 60),

            // Failed icon with animation
            AnimatedBuilder(
              animation: _scaleAnim,
              builder: (context, child) =>
                  Transform.scale(scale: _scaleAnim.value, child: child),
              child: const Icon(
                Icons.cancel_rounded,
                size: 100,
                color: AppColors.error,
              ),
            ),

            const SizedBox(height: 24),

            // Failure text
            const Text(
              'Đặt hàng thất bại!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 12),

            Text(
              'Rất tiếc, đã có lỗi xảy ra trong quá trình xử lý đơn hàng của bạn. Vui lòng thử lại sau.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 24),

            // Order code & error card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.divider),
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
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (_failureReason != null && _failureReason!.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red[100]!),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.error_outline,
                            color: Colors.red[400],
                            size: 18,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _failureReason!,
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.red[800],
                                fontWeight: FontWeight.w600,
                                height: 1.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 40),

            // Action buttons
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                onPressed: () {
                  context.go('/checkout');
                },
                icon: const Icon(Icons.refresh_rounded, size: 20),
                label: const Text('Thử lại'),
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
                label: const Text('Về trang chủ'),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
