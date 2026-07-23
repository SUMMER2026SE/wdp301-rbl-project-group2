import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class StaffOrderListPage extends StatelessWidget {
  const StaffOrderListPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Đơn hàng (Staff)', icon: Icons.receipt_long, description: 'Quản lý đơn hàng, filter theo trạng thái');
}
