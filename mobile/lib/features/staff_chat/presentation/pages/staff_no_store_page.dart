import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class StaffNoStorePage extends StatelessWidget {
  const StaffNoStorePage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Chưa gán cửa hàng', icon: Icons.storefront_outlined, description: 'Vui lòng liên hệ quản trị viên');
}
