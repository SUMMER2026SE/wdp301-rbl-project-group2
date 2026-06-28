import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class CheckoutPage extends StatelessWidget {
  const CheckoutPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Thanh toán', icon: Icons.payment, description: 'Chọn địa chỉ, voucher, phương thức thanh toán');
}
