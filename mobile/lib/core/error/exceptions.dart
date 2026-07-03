/// Base exception for server errors.
class ServerException implements Exception {
  final String message;
  final int? statusCode;

  /// Backend error code (e.g. VALIDATION_ERROR, INVALID_ACCESS_TOKEN).
  final String? errorCode;

  /// Zod/validation field-level error details from backend.
  final List<Map<String, dynamic>>? details;

  const ServerException({
    required this.message,
    this.statusCode,
    this.errorCode,
    this.details,
  });

  @override
  String toString() => 'ServerException($statusCode, $errorCode): $message';
}

/// Network unreachable.
class NetworkException implements Exception {
  final String message;

  const NetworkException({this.message = 'Không có kết nối mạng'});

  @override
  String toString() => 'NetworkException: $message';
}

/// Authentication token invalid / expired.
class AuthException implements Exception {
  final String message;

  const AuthException({this.message = 'Phiên đăng nhập đã hết hạn'});

  @override
  String toString() => 'AuthException: $message';
}

/// Cache read/write error.
class CacheException implements Exception {
  final String message;

  const CacheException({this.message = 'Lỗi bộ nhớ cục bộ'});

  @override
  String toString() => 'CacheException: $message';
}
