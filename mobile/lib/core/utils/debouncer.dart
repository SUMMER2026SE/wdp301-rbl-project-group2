import 'dart:async';
import 'package:flutter/foundation.dart';

/// Utility class to debounce rapid events (e.g. search input).
class Debouncer {
  final Duration delay;
  Timer? _timer;

  Debouncer({this.delay = const Duration(milliseconds: 500)});

  /// Run [callback] after [delay], cancelling any pending run.
  void run(VoidCallback callback) {
    _timer?.cancel();
    _timer = Timer(delay, callback);
  }

  /// Cancel any pending callback.
  void cancel() {
    _timer?.cancel();
  }

  /// Dispose the debouncer.
  void dispose() {
    _timer?.cancel();
    _timer = null;
  }
}
