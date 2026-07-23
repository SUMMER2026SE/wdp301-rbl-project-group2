import 'package:google_sign_in/google_sign_in.dart';

bool _isInitialized = false;

/// Mobile/Desktop implementation of Google Sign-In helper using google_sign_in plugin.
Future<String?> getGoogleAccessToken(String clientId) async {
  try {
    // 1. Initialize the plugin with Google Client ID (Only once)
    if (!_isInitialized) {
      await GoogleSignIn.instance.initialize(
        clientId: clientId,
      );
      _isInitialized = true;
    }

    // 2. Authenticate
    final googleUser = await GoogleSignIn.instance.authenticate();

    // 3. Request authorization to get the accessToken
    final authorization = await googleUser.authorizationClient.authorizationForScopes([
      'email',
      'profile',
      'https://www.googleapis.com/auth/userinfo.profile',
    ]);
    
    final token = authorization?.accessToken;
    if (token == null || token.isEmpty) {
      throw Exception('Google Sign-in succeeded but accessToken is missing or empty.');
    }
    
    return token;
  } catch (e) {
    rethrow;
  }
}
