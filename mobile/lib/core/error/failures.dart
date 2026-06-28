import 'package:equatable/equatable.dart';

/// Base failure class for the Either pattern.
abstract class Failure extends Equatable {
  final String message;
  final int? statusCode;

  const Failure({required this.message, this.statusCode});

  @override
  List<Object?> get props => [message, statusCode];
}

/// Network is unreachable.
class NetworkFailure extends Failure {
  const NetworkFailure({super.message = 'Không có kết nối mạng'});
}

/// Server returned an error response.
class ServerFailure extends Failure {
  /// Backend error code (e.g. VALIDATION_ERROR, INVALID_ACCESS_TOKEN).
  final String? errorCode;

  const ServerFailure({
    required super.message,
    super.statusCode,
    this.errorCode,
  });

  @override
  List<Object?> get props => [message, statusCode, errorCode];
}

/// Request timed out.
class TimeoutFailure extends Failure {
  const TimeoutFailure({super.message = 'Yêu cầu hết thời gian chờ'});
}

/// Authentication failure (401 / token expired).
class AuthFailure extends Failure {
  const AuthFailure({super.message = 'Phiên đăng nhập đã hết hạn'});
}

/// Forbidden (403).
class ForbiddenFailure extends Failure {
  const ForbiddenFailure({super.message = 'Bạn không có quyền truy cập'});
}

/// Resource not found (404).
class NotFoundFailure extends Failure {
  const NotFoundFailure({super.message = 'Không tìm thấy dữ liệu'});
}

/// Validation failure (422 / bad input).
class ValidationFailure extends Failure {
  final Map<String, String>? fieldErrors;

  const ValidationFailure({
    super.message = 'Dữ liệu không hợp lệ',
    this.fieldErrors,
  });

  @override
  List<Object?> get props => [message, fieldErrors];
}

/// Unexpected / catch-all failure.
class UnexpectedFailure extends Failure {
  const UnexpectedFailure({super.message = 'Đã xảy ra lỗi không mong muốn'});
}

/// Cache / local storage failure.
class CacheFailure extends Failure {
  const CacheFailure({super.message = 'Lỗi bộ nhớ cục bộ'});
}
