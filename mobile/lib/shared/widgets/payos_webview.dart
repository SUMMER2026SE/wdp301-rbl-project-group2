import 'dart:async';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// PayOS payment WebView widget.
/// Loads a PayOS payment URL and listens for redirect URLs to determine
/// payment success or failure.
class PayOSWebView extends StatefulWidget {
  final String paymentUrl;
  final VoidCallback onSuccess;
  final VoidCallback onFailed;
  final String? successRedirectPattern;
  final String? failedRedirectPattern;

  const PayOSWebView({
    super.key,
    required this.paymentUrl,
    required this.onSuccess,
    required this.onFailed,
    this.successRedirectPattern,
    this.failedRedirectPattern,
  });

  @override
  State<PayOSWebView> createState() => _PayOSWebViewState();
}

class _PayOSWebViewState extends State<PayOSWebView> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  bool _isClosed = false;
  Timer? _timeoutTimer;

  static const Duration _timeout = Duration(minutes: 5);

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            if (mounted) {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
            }
            _checkUrl(url);
          },
          onPageFinished: (url) {
            if (mounted) {
              setState(() => _isLoading = false);
            }
            _checkUrl(url);
          },
          onWebResourceError: (error) {
            // Only show error for main frame navigation failures
            if (error.isForMainFrame == true && mounted) {
              setState(() {
                _isLoading = false;
                _hasError = true;
                _errorMessage = 'Không thể tải trang thanh toán. '
                    'Vui lòng kiểm tra kết nối mạng và thử lại.';
              });
            }
          },
          onNavigationRequest: (request) {
            _checkUrl(request.url);
            return NavigationDecision.navigate;
          },
          onUrlChange: (change) {
            if (change.url != null) {
              _checkUrl(change.url!);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.paymentUrl));

    // Timeout auto-close after 5 minutes
    _timeoutTimer = Timer(_timeout, () {
      if (!_isClosed && mounted) {
        _isClosed = true;
        widget.onFailed.call();
      }
    });
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    super.dispose();
  }

  /// Check the URL for success/failure redirect patterns.
  void _checkUrl(String url) {
    if (_isClosed) return;

    final successPattern = widget.successRedirectPattern ?? '/order-success/';
    final failedPattern = widget.failedRedirectPattern ?? '/order-failed';

    if (url.contains(successPattern)) {
      _isClosed = true;
      _timeoutTimer?.cancel();
      widget.onSuccess.call();
    } else if (url.contains(failedPattern)) {
      _isClosed = true;
      _timeoutTimer?.cancel();
      widget.onFailed.call();
    }
  }

  void _retry() {
    setState(() {
      _hasError = false;
      _errorMessage = '';
      _isLoading = true;
    });
    _controller.loadRequest(Uri.parse(widget.paymentUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // WebView
        WebViewWidget(controller: _controller),

        // Close button
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          right: 12,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(24),
                onTap: () {
                  _isClosed = true;
                  _timeoutTimer?.cancel();
                  widget.onFailed.call();
                },
                child: const Padding(
                  padding: EdgeInsets.all(8),
                  child: Icon(Icons.close_rounded,
                      color: AppColors.textPrimary, size: 24),
                ),
              ),
            ),
          ),
        ),

        // Loading indicator
        if (_isLoading && !_hasError)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: LinearProgressIndicator(
              backgroundColor:
                  AppColors.primary.withValues(alpha: 0.1),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ),
        // Initial loading indicator (page not yet loaded)
        if (_isLoading && !_hasError)
          const Center(
            child: CircularProgressIndicator(
              color: AppColors.primary,
            ),
          ),

        // Error state
        if (_hasError)
          Positioned.fill(
            child: Container(
              color: Colors.white,
              child: AppErrorWidget(
                message: _errorMessage,
                onRetry: _retry,
              ),
            ),
          ),
      ],
    );
  }
}

/// Convenience wrapper that places [PayOSWebView] inside a full-screen Scaffold.
/// Use this directly in routes, e.g.:
/// ```dart
/// GoRoute(
///   path: '/payment-webview',
///   builder: (context, state) {
///     final paymentUrl = state.extra as String? ?? '';
///     return Scaffold(
///       body: WebViewPage(
///         paymentUrl: paymentUrl,
///         onSuccess: () => context.go('/order-success/:id'),
///         onFailed: () => context.go('/order-failed/:id'),
///       ),
///     );
///   },
/// )
/// ```
class WebViewPage extends StatelessWidget {
  final String paymentUrl;
  final VoidCallback onSuccess;
  final VoidCallback onFailed;

  const WebViewPage({
    super.key,
    required this.paymentUrl,
    required this.onSuccess,
    required this.onFailed,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: PayOSWebView(
          paymentUrl: paymentUrl,
          onSuccess: onSuccess,
          onFailed: onFailed,
        ),
      ),
    );
  }
}
