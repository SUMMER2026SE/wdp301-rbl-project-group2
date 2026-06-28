import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class CartPage extends StatelessWidget {
  const CartPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Giỏ hàng', icon: Icons.shopping_cart, description: 'Xem, cập nhật số lượng, tổng tiền');
}
