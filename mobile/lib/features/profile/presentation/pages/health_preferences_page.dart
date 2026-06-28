import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class HealthPreferencesPage extends StatelessWidget {
  const HealthPreferencesPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Sức khỏe & Dị ứng', icon: Icons.favorite, description: 'Cài đặt dị ứng, chế độ ăn, mục tiêu sức khỏe');
}
