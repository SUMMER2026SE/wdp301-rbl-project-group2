import 'dart:async';

import 'package:dio/dio.dart';
import 'package:foa_mobile/core/storage/secure_storage.dart';
import 'package:foa_mobile/core/error/exceptions.dart';

/// Injects [Authorization: Bearer <token>] header into every request.
class TokenInterceptor extends Interceptor {
  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await TokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

/// Handles 401 responses by refreshing the token and retrying the request.
class RefreshInterceptor extends Interceptor {
  final Dio _dio;
  bool _isRefreshing = false;

  /// Queue of (requestOptions, handler) pairs waiting for a token refresh.
  final _pendingQueue = <_PendingRequest>[];

  RefreshInterceptor(this._dio);

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    final refreshTokenVal = await TokenStorage.getRefreshToken();
    if (refreshTokenVal == null || refreshTokenVal.isEmpty) {
      await TokenStorage.clearAll();
      return handler.reject(err);
    }

    if (_isRefreshing) {
      // Queue this request — it will retry after refresh completes.
      _pendingQueue.add(_PendingRequest(
        requestOptions: err.requestOptions,
        handler: handler,
      ));
      return;
    }

    _isRefreshing = true;
    try {
      final refreshDio = Dio(BaseOptions(
        baseUrl: _dio.options.baseUrl,
        contentType: 'application/json',
      ));

      // Backend reads refreshToken from request body (mobile has no httpOnly cookie).
      final response = await refreshDio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshTokenVal},
      );

      final data = response.data as Map<String, dynamic>;

      // Backend wraps tokens in root-level "tokens" key:
      // { success: true, data: null, tokens: { accessToken, refreshToken, deviceId } }
      final tokens = data['tokens'] as Map<String, dynamic>?;
      final newAccessToken = tokens?['accessToken'] as String?;

      if (newAccessToken != null) {
        final newRefreshToken = tokens?['refreshToken'] as String?;
        await TokenStorage.saveTokens(
          accessToken: newAccessToken,
          refreshToken: newRefreshToken ?? refreshTokenVal,
        );

        // Retry the original request that triggered the refresh.
        err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final retryResponse = await _dio.fetch(err.requestOptions);
        _isRefreshing = false;
        unawaited(_flushPendingQueue(newAccessToken));
        return handler.resolve(retryResponse);
      }
    } catch (_) {
      await TokenStorage.clearAll();
    }

    _isRefreshing = false;
    _rejectPendingQueue();
    handler.reject(err);
  }

  /// Retry all queued requests with the new access token.
  Future<void> _flushPendingQueue(String token) async {
    final queue = List<_PendingRequest>.from(_pendingQueue);
    _pendingQueue.clear();
    for (final item in queue) {
      item.requestOptions.headers['Authorization'] = 'Bearer $token';
      try {
        final response = await _dio.fetch(item.requestOptions);
        item.handler.resolve(response);
      } catch (_) {
        item.handler.reject(
          DioException(
            requestOptions: item.requestOptions,
            error: const ServerException(message: 'Retry after refresh failed'),
          ),
        );
      }
    }
  }

  /// Reject all queued requests when refresh fails.
  void _rejectPendingQueue() {
    final queue = List<_PendingRequest>.from(_pendingQueue);
    _pendingQueue.clear();
    for (final item in queue) {
      item.handler.reject(
        DioException(
          requestOptions: item.requestOptions,
          error: const ServerException(message: 'Token refresh failed'),
        ),
      );
    }
  }
}

/// Internal record for a pending request during token refresh.
class _PendingRequest {
  final RequestOptions requestOptions;
  final ErrorInterceptorHandler handler;

  const _PendingRequest({
    required this.requestOptions,
    required this.handler,
  });
}

/// Maps DioException to typed application exceptions.
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        handler.reject(
          DioException(
            requestOptions: err.requestOptions,
            error: const TimeoutFailureException(),
            type: err.type,
          ),
        );
        return;
      case DioExceptionType.connectionError:
        handler.reject(
          DioException(
            requestOptions: err.requestOptions,
            error: const NetworkException(),
            type: err.type,
          ),
        );
        return;
      default:
        break;
    }

    final response = err.response;
    if (response != null) {
      final data = response.data;
      String message = 'Lỗi máy chủ';
      String? errorCode;
      List<Map<String, dynamic>>? details;

      if (data is Map<String, dynamic>) {
        // Extract message from root level.
        message = data['message'] as String? ?? message;

        // Extract error.code and error.details from backend response.
        // Backend format: { success: false, message, error: { code, details } }
        final errorObj = data['error'];
        if (errorObj is Map<String, dynamic>) {
          errorCode = errorObj['code'] as String?;
          final rawDetails = errorObj['details'];
          if (rawDetails is List) {
            details = rawDetails
                .whereType<Map<String, dynamic>>()
                .toList();
          }
        }

        // Backend Zod handler sends top-level "errors" array:
        // { message, code, errors: [{ path, message }] }
        final errorsArr = data['errors'];
        if (errorsArr is List && details == null) {
          details = errorsArr
              .whereType<Map<String, dynamic>>()
              .toList();
        }
      }

      handler.reject(
        DioException(
          requestOptions: err.requestOptions,
          error: ServerException(
            message: message,
            statusCode: response.statusCode,
            errorCode: errorCode,
            details: details,
          ),
          response: err.response,
          type: err.type,
        ),
      );
      return;
    }

    handler.next(err);
  }
}

/// Helper exception for timeout mapping.
class TimeoutFailureException implements Exception {
  const TimeoutFailureException();
}
