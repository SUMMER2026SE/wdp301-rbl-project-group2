import 'google_sign_in_stub.dart'
    if (dart.library.js_util) 'google_sign_in_web_helper.dart'
    if (dart.library.io) 'google_sign_in_mobile_helper.dart' as platform_impl;

/// Helper class to handle Google Sign-In authentications (compatible with both Web and Mobile).
class GoogleSignInHelper {
  GoogleSignInHelper._();

  // Google client ID matching the system configuration
  static const String _clientId = '798057503920-v2lumj24in5mt9t0j4n4v83q49f7dadh.apps.googleusercontent.com';

  /// Initiates Google Sign-In process and returns the accessToken.
  /// Returns null if user cancelled the sign-in.
  static Future<String?> getAccessToken() async {
    try {
      return await platform_impl.getGoogleAccessToken(_clientId);
    } catch (e) {
      // Propagate exception to handle gracefully in UI
      rethrow;
    }
  }
}
