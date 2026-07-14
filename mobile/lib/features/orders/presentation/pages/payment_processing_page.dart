import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';

/// Payment processing page shown while waiting for PayOS payment.
/// Polls order status periodically; auto-cancels after 5-minute timeout.
class PaymentProcessingPage extends StatefulWidget {
  final String id;
  final int? payosOrderCode;
  const PaymentProcessingPage({
    super.key,
    required this.id,
    this.payosOrderCode,
  });

  @override
  State<PaymentProcessingPage> createState() => _PaymentProcessingPageState();
}

class _PaymentProcessingPageState extends State<PaymentProcessingPage>
    with WidgetsBindingObserver {
  final Dio _dio = ApiClient().dio;
  Timer? _pollTimer;
  Timer? _timeoutTimer;
  bool _isCancelling = false;

  static const _pollInterval = Duration(seconds: 3);
  static const _timeout = Duration(minutes: 5);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startPolling();
    _startTimeout();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    _timeoutTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // User returned to the app (possibly from PayOS tab). Check status immediately.
      _checkOrderStatus();
    }
  }

  void _startPolling() {
    _pollTimer = Timer.periodic(_pollInterval, (_) => _checkOrderStatus());
    _checkOrderStatus();
  }

  void _startTimeout() {
    _timeoutTimer = Timer(_timeout, () {
      if (mounted) _cancelPayment();
    });
  }

  Future<void> _checkOrderStatus() async {
    if (!mounted || _isCancelling) return;
    try {
      final response = await _dio.get(ApiEndpoints.orderById(widget.id));
      final body = response.data is Map<String, dynamic>
          ? (response.data['data'] as Map<String, dynamic>? ??
              response.data as Map<String, dynamic>)
          : <String, dynamic>{};
      final status = body['status'] as String? ?? '';
      final paid = body['paid'] as bool? ?? false;

      if (!mounted) return;

      if (paid || status == 'confirmed' || status == 'processing') {
        _cleanup();
        context.go('/order-success/${widget.id}');
      } else if (status == 'cancelled') {
        _cleanup();
        context.go('/order-failed/${widget.id}');
      }
    } catch (_) {}
  }

  void _cleanup() {
    _pollTimer?.cancel();
    _timeoutTimer?.cancel();
  }

  Future<void> _cancelPayment() async {
    if (_isCancelling) return;
    setState(() => _isCancelling = true);
    _cleanup();

    if (widget.payosOrderCode != null) {
      try {
        await _dio.get(
          ApiEndpoints.paymentsPayosCancel,
          queryParameters: {'orderCode': widget.payosOrderCode},
        );
      } catch (_) {}
    }

    if (!mounted) return;
    context.go('/order-failed/${widget.id}');
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _cancelPayment();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 80,
                    height: 80,
                    child: CircularProgressIndicator(
                      strokeWidth: 4,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'Đang chờ thanh toán',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Quét mã QR hoặc thanh toán qua PayOS.\n'
                    'Sau khi thanh toán thành công, hệ thống sẽ tự động xác nhận đơn hàng.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton.icon(
                      onPressed: _isCancelling ? null : _cancelPayment,
                      icon: _isCancelling
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.close, size: 20),
                      label:
                          Text(_isCancelling ? 'Đang hủy...' : 'Hủy thanh toán'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.error,
                        side: BorderSide(
                          color: AppColors.error.withValues(alpha: 0.5),
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
