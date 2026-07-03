import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/features/auth/data/models/user_model.dart';

/// Remote data source for auth API calls.
class AuthRemoteDataSource {
  final Dio _dio;

  AuthRemoteDataSource() : _dio = ApiClient().dio;

  /// Login: returns { user: UserModel, accessToken, refreshToken } extracted from response.
  Future<LoginResponse> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      ApiEndpoints.login,
      data: {'email': email, 'password': password},
    );

    final data = response.data as Map<String, dynamic>;

    // Backend: { success: true, data: { ...user }, tokens: { accessToken, refreshToken, deviceId } }
    final userData = data['data'] as Map<String, dynamic>;
    final user = UserModel.fromJson(userData);

    final tokens = data['tokens'] as Map<String, dynamic>;
    final accessToken = tokens['accessToken'] as String;
    final refreshToken = tokens['refreshToken'] as String;

    return LoginResponse(
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  /// Register new account.
  Future<UserModel> register({
    required String username,
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      ApiEndpoints.register,
      data: {'username': username, 'email': email, 'password': password},
    );

    final data = response.data as Map<String, dynamic>;
    final userData = data['data'] as Map<String, dynamic>;
    return UserModel.fromJson(userData);
  }

  /// Verify email with 6-digit OTP.
  Future<void> verifyEmail({
    required String email,
    required String code,
  }) async {
    await _dio.post(
      ApiEndpoints.verifyEmail,
      data: {'email': email, 'code': code},
    );
  }

  /// Resend verification email.
  Future<void> resendVerifyEmail(String email) async {
    await _dio.post(ApiEndpoints.resendVerifyEmail, data: {'email': email});
  }

  /// Send password reset OTP.
  Future<void> forgotPassword(String email) async {
    await _dio.post(ApiEndpoints.forgotPassword, data: {'email': email});
  }

  /// Verify password reset OTP.
  Future<void> verifyPasswordResetOtp({
    required String email,
    required String code,
  }) async {
    await _dio.post(
      ApiEndpoints.verifyPasswordOtp,
      data: {'email': email, 'code': code},
    );
  }

  /// Reset password.
  Future<void> resetPassword({
    required String email,
    required String code,
    required String password,
  }) async {
    await _dio.post(
      ApiEndpoints.resetPassword,
      data: {
        'email': email,
        'code': code,
        'password': password,
        'confirmPassword': password,
      },
    );
  }

  /// Get current authenticated user.
  Future<UserModel> getCurrentUser() async {
    final response = await _dio.get(ApiEndpoints.me);
    final data = response.data as Map<String, dynamic>;
    final userData = data['data'] as Map<String, dynamic>;
    return UserModel.fromJson(userData);
  }

  /// Login with Google credential.
  Future<LoginResponse> loginWithGoogle(String credential) async {
    final response = await _dio.post(
      ApiEndpoints.googleLogin,
      data: {'credential': credential},
    );

    final data = response.data as Map<String, dynamic>;
    final userData = data['data'] as Map<String, dynamic>;
    final user = UserModel.fromJson(userData);

    final tokens = data['tokens'] as Map<String, dynamic>;
    final accessToken = tokens['accessToken'] as String;
    final refreshToken = tokens['refreshToken'] as String;

    return LoginResponse(
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  /// Logout.
  Future<void> logout() async {
    try {
      await _dio.post(ApiEndpoints.logout);
    } catch (_) {
      // Logout API failure is non-critical.
    }
  }
}

/// Response container for login operations.
class LoginResponse {
  final UserModel user;
  final String accessToken;
  final String refreshToken;

  const LoginResponse({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });
}
