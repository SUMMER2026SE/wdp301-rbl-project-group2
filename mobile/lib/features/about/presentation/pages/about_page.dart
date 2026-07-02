import 'package:flutter/material.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Về chúng tôi'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 20),
            // ── App Icon ──
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.restaurant_menu,
                  color: Colors.white, size: 44),
            ),
            const SizedBox(height: 16),
            const Text(
              'FOA',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'v1.0.0',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Food Ordering App - Đặt ăn trực tuyến',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 32),

            // ── Về chúng tôi ──
            _buildSection(
              icon: Icons.info_outline,
              title: 'Về chúng tôi',
              children: [
                _buildParagraph(
                  'FOA là ứng dụng đặt đồ ăn trực tuyến, giúp bạn dễ dàng khám phá '
                  'và đặt món từ các nhà hàng yêu thích. Với giao diện thân thiện và '
                  'nhiều tính năng thông minh, chúng tôi mang đến trải nghiệm ẩm thực '
                  'tuyệt vời cho bạn.',
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Liên hệ ──
            _buildSection(
              icon: Icons.mail_outline,
              title: 'Liên hệ',
              children: [
                _buildContactRow(Icons.email_outlined, 'support@foa.app'),
                const SizedBox(height: 8),
                _buildContactRow(Icons.phone_outlined, '1900 1234'),
                const SizedBox(height: 8),
                _buildContactRow(Icons.location_on_outlined, 'Hồ Chí Minh, Việt Nam'),
              ],
            ),
            const SizedBox(height: 16),

            // ── Điều khoản sử dụng ──
            _buildSection(
              icon: Icons.description_outlined,
              title: 'Điều khoản sử dụng',
              children: [
                _buildParagraph(
                  'Việc sử dụng ứng dụng này tuân theo các điều khoản và điều kiện '
                  'của chúng tôi. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.',
                ),
                const SizedBox(height: 8),
                _buildParagraph(
                  'Mọi thông tin cá nhân của bạn được bảo vệ theo chính sách '
                  'bảo mật của chúng tôi.',
                ),
              ],
            ),
            const SizedBox(height: 32),

            // ── Footer ──
            Text(
              '© 2026 FOA. All rights reserved.',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textHint,
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _buildParagraph(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        color: AppColors.textSecondary,
        height: 1.5,
      ),
    );
  }

  Widget _buildContactRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
