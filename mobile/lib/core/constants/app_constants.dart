/// Application-wide constants and environment configuration.
class AppConstants {
  AppConstants._();

  /// API base URL.
  /// - Android emulator: 10.0.2.2 maps to host machine localhost.
  /// - Physical device via USB: use LAN IP (e.g. 192.168.1.x).
  /// - Override at runtime: flutter run --dart-define=API_BASE_URL=http://...
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8005/api',
  );

  /// Socket.IO base URL (without /api path).
  static const String socketBaseUrl = String.fromEnvironment(
    'SOCKET_BASE_URL',
    defaultValue: 'http://localhost:8005',
  );

  /// Application name.
  static const String appName = 'FoodieDash';

  /// Pagination defaults.
  static const int defaultPageSize = 10;

  /// Network timeouts.
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
