import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Token storage — uses FlutterSecureStorage on mobile,
/// falls back to SharedPreferences on web (which doesn't support flutter_secure_storage).
class TokenStorage {
  static final FlutterSecureStorage? _secureStorage =
      kIsWeb ? null : const FlutterSecureStorage();

  static const _accessTokenKey = 'foa_access_token';
  static const _refreshTokenKey = 'foa_refresh_token';
  static const _userRoleKey = 'foa_user_role';
  static const _userIdKey = 'foa_user_id';

  static Future<void> _write(String key, String value) async {
    if (_secureStorage != null) {
      await _secureStorage!.write(key: key, value: value);
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
    }
  }

  static Future<String?> _read(String key) async {
    if (_secureStorage != null) {
      return _secureStorage!.read(key: key);
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  static Future<void> _deleteAll() async {
    if (_secureStorage != null) {
      await _secureStorage!.deleteAll();
    } else {
      final prefs = await SharedPreferences.getInstance();
      await Future.wait([
        prefs.remove(_accessTokenKey),
        prefs.remove(_refreshTokenKey),
        prefs.remove(_userRoleKey),
        prefs.remove(_userIdKey),
      ]);
    }
  }

  /// Save tokens after login / refresh.
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _write(_accessTokenKey, accessToken),
      _write(_refreshTokenKey, refreshToken),
    ]);
  }

  /// Save user metadata for quick access without API call.
  static Future<void> saveUserMeta({
    required String userId,
    required String role,
  }) async {
    await Future.wait([
      _write(_userIdKey, userId),
      _write(_userRoleKey, role),
    ]);
  }

  static Future<String?> getAccessToken() => _read(_accessTokenKey);

  static Future<String?> getRefreshToken() => _read(_refreshTokenKey);

  static Future<String?> getUserRole() => _read(_userRoleKey);

  static Future<String?> getUserId() => _read(_userIdKey);

  /// Check if tokens exist (user might be logged in).
  static Future<bool> hasTokens() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Clear all stored credentials on logout.
  static Future<void> clearAll() => _deleteAll();
}
