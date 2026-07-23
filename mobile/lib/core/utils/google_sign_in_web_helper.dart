// ignore_for_file: avoid_web_libraries_in_flutter, uri_does_not_exist

import 'dart:js_util' as js_util;

/// Web implementation of Google Sign-In helper that invokes the JS OAuth2 client.
Future<String?> getGoogleAccessToken(String clientId) async {
  try {
    final hasSdk = js_util.hasProperty(js_util.globalThis, 'initiateGoogleSignInWeb');
    if (!hasSdk) {
      throw Exception('Google Identity SDK (initiateGoogleSignInWeb) is not registered in index.html.');
    }
    
    // Call the global JavaScript method defined in index.html and convert its Promise to Dart Future
    final promise = js_util.callMethod(js_util.globalThis, 'initiateGoogleSignInWeb', [clientId]);
    final token = await js_util.promiseToFuture<String>(promise);
    return token;
  } catch (e) {
    rethrow;
  }
}
