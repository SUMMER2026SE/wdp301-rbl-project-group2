import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:foa_mobile/core/storage/secure_storage.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/features/auth/domain/repositories/auth_repository.dart';

// ── Events ──

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Check stored tokens on app start.
class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

/// Login with email and password.
class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

/// Register a new account.
class AuthRegisterRequested extends AuthEvent {
  final String username;
  final String email;
  final String password;

  const AuthRegisterRequested({
    required this.username,
    required this.email,
    required this.password,
  });

  @override
  List<Object?> get props => [username, email, password];
}

/// Verify email with OTP.
class AuthVerifyEmailRequested extends AuthEvent {
  final String email;
  final String code;

  const AuthVerifyEmailRequested({
    required this.email,
    required this.code,
  });

  @override
  List<Object?> get props => [email, code];
}

/// Resend verification email.
class AuthResendVerifyEmailRequested extends AuthEvent {
  final String email;

  const AuthResendVerifyEmailRequested(this.email);

  @override
  List<Object?> get props => [email];
}

/// Send forgot password OTP.
class AuthForgotPasswordRequested extends AuthEvent {
  final String email;

  const AuthForgotPasswordRequested(this.email);

  @override
  List<Object?> get props => [email];
}

/// Verify password reset OTP.
class AuthVerifyPasswordOtpRequested extends AuthEvent {
  final String email;
  final String code;

  const AuthVerifyPasswordOtpRequested({
    required this.email,
    required this.code,
  });

  @override
  List<Object?> get props => [email, code];
}

/// Reset password with OTP.
class AuthResetPasswordRequested extends AuthEvent {
  final String email;
  final String code;
  final String password;

  const AuthResetPasswordRequested({
    required this.email,
    required this.code,
    required this.password,
  });

  @override
  List<Object?> get props => [email, code, password];
}

/// Login with Google credential.
class AuthGoogleLoginRequested extends AuthEvent {
  final String credential;

  const AuthGoogleLoginRequested(this.credential);

  @override
  List<Object?> get props => [credential];
}

/// Logout and clear tokens.
class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

/// Update user data after profile edit.
class AuthUserUpdated extends AuthEvent {
  final Map<String, dynamic> userData;

  const AuthUserUpdated(this.userData);

  @override
  List<Object?> get props => [userData];
}

/// Clear error/message state (navigate away).
class AuthClearMessage extends AuthEvent {
  const AuthClearMessage();
}

// ── States ──

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  final Map<String, dynamic> user;
  final String role;

  const AuthAuthenticated({required this.user, required this.role});

  String get userId => user['_id'] as String? ?? '';
  String get username => user['username'] as String? ?? '';
  String get email => user['email'] as String? ?? '';
  String? get storeId => user['storeId'] as String?;
  bool get isStaff => role == 'STAFF';
  bool get isCustomer => role == 'CUSTOMER';
  bool get isAdmin => role == 'ADMIN';

  @override
  List<Object?> get props => [user, role];
}

class AuthUnauthenticated extends AuthState {
  final String? message;

  const AuthUnauthenticated({this.message});

  @override
  List<Object?> get props => [message];
}

/// Registration succeeded — user needs to verify email.
class AuthRegisterSuccess extends AuthState {
  final String email;

  const AuthRegisterSuccess(this.email);

  @override
  List<Object?> get props => [email];
}

/// General operation succeeded with a message.
class AuthSuccessMessage extends AuthState {
  final String message;
  final String? email;

  const AuthSuccessMessage(this.message, {this.email});

  @override
  List<Object?> get props => [message, email];
}

class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object?> get props => [message];
}

// ── BLoC ──

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  /// Tracks the last stable state so [AuthClearMessage] can restore it
  /// instead of force-logging out.
  AuthState? _lastStableState;

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(const AuthInitial()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthRegisterRequested>(_onRegisterRequested);
    on<AuthVerifyEmailRequested>(_onVerifyEmailRequested);
    on<AuthResendVerifyEmailRequested>(_onResendVerifyEmailRequested);
    on<AuthForgotPasswordRequested>(_onForgotPasswordRequested);
    on<AuthVerifyPasswordOtpRequested>(_onVerifyPasswordOtpRequested);
    on<AuthResetPasswordRequested>(_onResetPasswordRequested);
    on<AuthGoogleLoginRequested>(_onGoogleLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthUserUpdated>(_onUserUpdated);
    on<AuthClearMessage>(_onClearMessage);
  }

  Future<void> _onCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    try {
      final hasTokens = await TokenStorage.hasTokens();
      if (!hasTokens) {
        _lastStableState = const AuthUnauthenticated();
        emit(const AuthUnauthenticated());
        return;
      }

      final result = await _authRepository.getCurrentUser();
      await result.fold(
        (_) {
          // Token invalid/expired — clear and redirect to login.
          unawaited(TokenStorage.clearAll());
          _lastStableState = const AuthUnauthenticated();
          emit(const AuthUnauthenticated());
        },
        (user) async {
          await TokenStorage.saveUserMeta(
            userId: user.id,
            role: user.role,
          );
          final token = await TokenStorage.getAccessToken();
          if (token != null) {
            SocketService().connect(token);
          }
          _lastStableState = AuthAuthenticated(user: user.toMap(), role: user.role);
          emit(_lastStableState!);
        },
      );
    } catch (_) {
      await TokenStorage.clearAll();
      _lastStableState = const AuthUnauthenticated();
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.login(
      email: event.email,
      password: event.password,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) {
        _lastStableState = AuthAuthenticated(user: user.toMap(), role: user.role);
        emit(_lastStableState!);
      },
    );
  }

  Future<void> _onRegisterRequested(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.register(
      username: event.username,
      email: event.email,
      password: event.password,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(AuthRegisterSuccess(event.email)),
    );
  }

  Future<void> _onVerifyEmailRequested(
    AuthVerifyEmailRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.verifyEmail(
      email: event.email,
      code: event.code,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(const AuthSuccessMessage(
        'Xác thực email thành công! Bạn có thể đăng nhập ngay.',
      )),
    );
  }

  Future<void> _onResendVerifyEmailRequested(
    AuthResendVerifyEmailRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.resendVerifyEmail(event.email);

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(const AuthSuccessMessage('Mã xác thực đã được gửi lại!')),
    );
  }

  Future<void> _onForgotPasswordRequested(
    AuthForgotPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.forgotPassword(event.email);

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(AuthSuccessMessage(
        'Mã OTP đã được gửi đến email của bạn.',
        email: event.email,
      )),
    );
  }

  Future<void> _onVerifyPasswordOtpRequested(
    AuthVerifyPasswordOtpRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.verifyPasswordResetOtp(
      email: event.email,
      code: event.code,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(AuthSuccessMessage('Mã OTP chính xác', email: event.email)),
    );
  }

  Future<void> _onResetPasswordRequested(
    AuthResetPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.resetPassword(
      email: event.email,
      code: event.code,
      password: event.password,
    );

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(const AuthSuccessMessage('Đặt lại mật khẩu thành công!')),
    );
  }

  Future<void> _onGoogleLoginRequested(
    AuthGoogleLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());
    final result = await _authRepository.loginWithGoogle(event.credential);

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) {
        _lastStableState = AuthAuthenticated(user: user.toMap(), role: user.role);
        emit(_lastStableState!);
      },
    );
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    await _authRepository.logout();
    _lastStableState = const AuthUnauthenticated();
    emit(const AuthUnauthenticated());
  }

  void _onUserUpdated(
    AuthUserUpdated event,
    Emitter<AuthState> emit,
  ) {
    final currentState = state;
    if (currentState is AuthAuthenticated) {
      final updated = {...currentState.user, ...event.userData};
      emit(AuthAuthenticated(user: updated, role: currentState.role));
    }
  }

  void _onClearMessage(
    AuthClearMessage event,
    Emitter<AuthState> emit,
  ) {
    final currentState = state;
    if (currentState is AuthSuccessMessage || currentState is AuthError) {
      emit(_lastStableState ?? const AuthUnauthenticated());
    }
  }
}
