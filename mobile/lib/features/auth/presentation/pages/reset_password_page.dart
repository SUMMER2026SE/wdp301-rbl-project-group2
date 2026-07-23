import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/utils/validators.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';

/// Redesigned ResetPasswordPage.
class ResetPasswordPage extends StatefulWidget {
  final String? email;

  const ResetPasswordPage({super.key, this.email});

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _otpVerified = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _onVerifyOtp() {
    if (!_formKey.currentState!.validate()) return;
    final email = widget.email;
    if (email == null || email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không tìm thấy email. Vui lòng gửi lại mã OTP.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    context.read<AuthBloc>().add(
          AuthVerifyPasswordOtpRequested(email: email, code: _otpController.text.trim()),
        );
  }

  void _onResetPassword() {
    if (!_formKey.currentState!.validate()) return;
    final email = widget.email;
    if (email == null || email.isEmpty) return;

    context.read<AuthBloc>().add(
          AuthResetPasswordRequested(
            email: email,
            code: _otpController.text.trim(),
            password: _passwordController.text,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthLoading) {
          setState(() => _isLoading = true);
        } else {
          setState(() => _isLoading = false);
        }

        if (state is AuthSuccessMessage) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );

          if (state.message.contains('OTP chính xác') || state.message.contains('Mã OTP chính xác')) {
            setState(() => _otpVerified = true);
          } else {
            context.go('/login');
          }
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('Đặt lại Mật khẩu'),
            elevation: 0,
            backgroundColor: Colors.white,
          ),
          body: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Header Icon
                      Center(
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.orange[50],
                          ),
                          child: const Icon(
                            Icons.vpn_key_outlined,
                            size: 40,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Tạo mật khẩu mới',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _otpVerified
                            ? 'Vui lòng thiết lập mật khẩu bảo mật mới cho tài khoản của bạn.'
                            : 'Nhập mã OTP gửi tới email của bạn để xác thực.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Form Container
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: AppColors.divider),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (state is AuthError) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.red[50],
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.red[200]!),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        state.message,
                                        style: TextStyle(
                                          color: Colors.red[900],
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // OTP Field
                            const Text(
                              'Nhập mã OTP 6 số',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                            ),
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _otpController,
                              keyboardType: TextInputType.number,
                              textInputAction: _otpVerified ? TextInputAction.next : TextInputAction.done,
                              maxLength: 6,
                              textAlign: TextAlign.center,
                              readOnly: _otpVerified,
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 4,
                                color: _otpVerified ? AppColors.textSecondary : AppColors.primary,
                              ),
                              decoration: InputDecoration(
                                hintText: '000000',
                                hintStyle: const TextStyle(fontSize: 20, letterSpacing: 4, color: AppColors.textHint),
                                prefixIcon: const Icon(Icons.pin_outlined),
                                counterText: '',
                                filled: _otpVerified,
                                fillColor: _otpVerified ? AppColors.surfaceVariant : Colors.white,
                              ),
                              validator: Validators.otp,
                            ),
                            const SizedBox(height: 16),

                            if (_otpVerified) ...[
                              // New Password
                              const Text(
                                'Mật khẩu mới',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                textInputAction: TextInputAction.next,
                                onChanged: (_) => setState(() {}),
                                decoration: InputDecoration(
                                  hintText: '••••••••',
                                  prefixIcon: const Icon(Icons.lock_outlined),
                                  suffixIcon: IconButton(
                                    icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                  ),
                                ),
                                validator: Validators.password,
                              ),
                              const SizedBox(height: 6),

                              // Password strength checker
                              _PasswordStrengthIndicator(password: _passwordController.text),
                              const SizedBox(height: 14),

                              // Confirm Password
                              const Text(
                                'Xác nhận mật khẩu mới',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 6),
                              TextFormField(
                                controller: _confirmPasswordController,
                                obscureText: _obscureConfirm,
                                textInputAction: TextInputAction.done,
                                onFieldSubmitted: (_) => _onResetPassword(),
                                decoration: InputDecoration(
                                  hintText: '••••••••',
                                  prefixIcon: const Icon(Icons.lock_outlined),
                                  suffixIcon: IconButton(
                                    icon: Icon(_obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                                    onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                                  ),
                                ),
                                validator: (value) => Validators.confirmPassword(value, _passwordController.text),
                              ),
                              const SizedBox(height: 24),
                            ],

                            ElevatedButton(
                              onPressed: _isLoading
                                  ? null
                                  : (_otpVerified ? _onResetPassword : _onVerifyOtp),
                              child: _isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(_otpVerified ? 'Đặt lại mật khẩu' : 'Xác thực mã OTP'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      TextButton(
                        onPressed: () => context.go('/login'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.textSecondary,
                        ),
                        child: const Text('Quay lại Đăng nhập'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Password strength indicator matching RegisterPage/LoginPage.
class _PasswordStrengthIndicator extends StatelessWidget {
  final String password;

  const _PasswordStrengthIndicator({required this.password});

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    final checks = [
      _Check('Tối thiểu 8 ký tự', password.length >= 8),
      _Check('Ít nhất 1 chữ viết hoa', RegExp(r'[A-Z]').hasMatch(password)),
      _Check('Ít nhất 1 chữ số', RegExp(r'[0-9]').hasMatch(password)),
      _Check('Ít nhất 1 ký tự đặc biệt', RegExp(r'[^a-zA-Z0-9]').hasMatch(password)),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 6),
        const Text(
          'Yêu cầu mật khẩu:',
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textHint),
        ),
        const SizedBox(height: 4),
        ...checks.map((c) => Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Row(
                children: [
                  Icon(
                    c.passed ? Icons.check_circle : Icons.circle_outlined,
                    size: 13,
                    color: c.passed ? AppColors.success : AppColors.textHint,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    c.label,
                    style: TextStyle(
                      fontSize: 10.5,
                      color: c.passed ? AppColors.success : AppColors.textHint,
                      fontWeight: c.passed ? FontWeight.w600 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            )),
      ],
    );
  }
}

class _Check {
  final String label;
  final bool passed;
  const _Check(this.label, this.passed);
}
