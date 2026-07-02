import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';

/// Shown when a staff user has no store assigned.
class StaffNoStorePage extends StatelessWidget {
  const StaffNoStorePage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Nh\xE2n vi\xEAn'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.storefront_outlined,
                  size: 50,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Chưa được g\xE1n cửa h\xE0ng',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Vui l\xF2ng li\xEAn hệ quản trị vi\xEAn để được g\xE1n cửa h\xE0ng.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.read<AuthBloc>().add(const AuthCheckRequested());
                      },
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Thử lại'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 48),
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        context.read<AuthBloc>().add(const AuthLogoutRequested());
                      },
                      icon: const Icon(Icons.logout_rounded, size: 18),
                      label: const Text('Đăng xuất'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(0, 48),
                        backgroundColor: AppColors.error,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
