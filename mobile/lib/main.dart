import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:foa_mobile/app/app.dart';
import 'package:foa_mobile/core/di/injection.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── Global error handling ──
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    // TODO: integrate crashlytics / error reporting service
    debugPrint('[FlutterError] ${details.exception}\n${details.stack}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    // TODO: integrate crashlytics / error reporting service
    debugPrint('[PlatformDispatcher] $error\n$stack');
    return true;
  };

  // Lock orientation to portrait for consistent food ordering UX.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Set system UI overlay style.
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  // Initialize dependency injection.
  await initDependencies();

  runApp(const App());
}
