import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_constants.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';

/// Singleton Dio HTTP client for all API calls.
class ApiClient {
  static ApiClient? _instance;
  late final Dio dio;

  ApiClient._() {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        contentType: 'application/json',
        responseType: ResponseType.json,
        // Mobile does NOT use cookies — Bearer token only.
      ),
    );

    dio.interceptors.addAll([
      TokenInterceptor(),
      RefreshInterceptor(dio),
      ErrorInterceptor(),
      // Debug logging — disable in release builds.
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (obj) => print('[Dio] $obj'), // ignore: avoid_print
      ),
    ]);
  }

  /// Get the singleton instance.
  factory ApiClient() {
    _instance ??= ApiClient._();
    return _instance!;
  }

  /// Reset client (e.g. after logout to clear interceptor state).
  static void reset() {
    _instance = null;
  }
}
