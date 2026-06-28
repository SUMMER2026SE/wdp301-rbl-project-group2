import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class OrderHistoryPage extends StatelessWidget {
  const OrderHistoryPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Đơn hàng', icon: Icons.receipt_long, description: 'Lịch sử đơn hàng + theo dõi trạng thái');
}
