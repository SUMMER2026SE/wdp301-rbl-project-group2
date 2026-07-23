import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class StaffMenuPage extends StatelessWidget {
  const StaffMenuPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Thực đơn (Staff)', icon: Icons.menu_book, description: 'Quản lý sản phẩm, bật/tắt món');
}
