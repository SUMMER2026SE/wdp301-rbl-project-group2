import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:foa_mobile/core/constants/app_constants.dart';

/// Singleton Socket.IO client for realtime communication.
/// Foreground-only strategy for demo — no FCM background push.
class SocketService {
  io.Socket? _socket;
  String? _currentToken;

  static final SocketService _instance = SocketService._();
  factory SocketService() => _instance;
  SocketService._();

  /// Whether the socket is currently connected.
  bool get isConnected => _socket?.connected ?? false;

  /// Connect to Socket.IO server with access token.
  /// Backend reads token from [handshake.auth.accessToken].
  void connect(String accessToken) {
    // Avoid duplicate connections.
    if (_currentToken == accessToken && isConnected) return;

    disconnect();
    _currentToken = accessToken;

    _socket = io.io(
      AppConstants.socketBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'accessToken': accessToken})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setReconnectionDelayMax(10000)
          .setReconnectionAttempts(10)
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[Socket] ✅ Connected (id: ${_socket!.id})');
    });

    _socket!.onDisconnect((_) {
      debugPrint('[Socket] ❌ Disconnected');
    });

    _socket!.onReconnect((_) {
      debugPrint('[Socket] 🔄 Reconnected');
    });

    _socket!.onConnectError((err) {
      debugPrint('[Socket] ⚠️ Connect error: $err');
    });
  }

  /// Listen to a specific event.
  void on(String event, Function(dynamic) callback) {
    _socket?.on(event, callback);
  }

  /// Remove listener for a specific event.
  void off(String event) {
    _socket?.off(event);
  }

  /// Emit an event with optional data.
  void emit(String event, [dynamic data]) {
    _socket?.emit(event, data);
  }

  /// Join a support chat conversation room.
  void joinSupportRoom(String conversationId) {
    _socket?.emit('support:join', conversationId);
  }

  /// Reconnect if socket was disconnected (e.g. after app resume).
  void reconnectIfNeeded() {
    if (_socket != null && !_socket!.connected) {
      debugPrint('[Socket] 🔄 Attempting reconnect after resume...');
      _socket!.connect();
    }
  }

  /// Disconnect and clean up. Called on logout.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _currentToken = null;
  }
}
