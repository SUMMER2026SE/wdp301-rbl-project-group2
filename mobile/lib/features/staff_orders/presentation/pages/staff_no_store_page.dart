import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';

class StaffNoStorePage extends StatelessWidget {
  const StaffNoStorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.storefront_outlined,
                  size: 80,
                  color: Colors.orange.shade700,
                ),
              ),
              const SizedBox(height: 32),

              // Title
              const Text(
                'Chưa Được Gán Cửa Hàng',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Description
              const Text(
                'Tài khoản nhân viên của bạn hiện tại chưa được gán cho bất kỳ chi nhánh hoặc cửa hàng nào trong hệ thống.\n\nVui lòng liên hệ với Quản trị viên (Admin) để được gán chi nhánh trước khi sử dụng các tính năng điều phối đơn, giao hàng, quản lý thực đơn hay hỗ trợ chat.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),

              // Sign Out Button
              ElevatedButton(
                onPressed: () {
                  context.read<AuthBloc>().add(const AuthLogoutRequested());
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  backgroundColor: AppColors.primary,
                ),
                child: const Text('Đăng xuất tài khoản'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
