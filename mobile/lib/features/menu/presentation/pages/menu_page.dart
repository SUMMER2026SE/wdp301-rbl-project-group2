import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class MenuPage extends StatelessWidget {
  const MenuPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Thực đơn', icon: Icons.restaurant_menu, description: 'Danh sách sản phẩm, filter theo danh mục');
}
