// ignore_for_file: avoid_web_libraries_in_flutter, uri_does_not_exist

import 'dart:js_util' as js_util;

/// Web implementation of Google Sign-In helper that invokes the JS OAuth2 client.
Future<String?> getGoogleAccessToken(String clientId) async {
  try {
    // The JS function window.initiateGoogleSignInWeb is defined inline in index.html.
    // It handles SDK-readiness polling internally before opening the popup.
    final promise = js_util.callMethod(
      js_util.globalThis,
      'initiateGoogleSignInWeb',
      [clientId],
    );
    final token = await js_util.promiseToFuture<String>(promise);
    return token;
  } catch (e) {
    rethrow;
  }
}
