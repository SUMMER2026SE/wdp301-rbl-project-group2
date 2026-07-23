import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class StaffOrderDetailPage extends StatelessWidget {
  final String id;
  const StaffOrderDetailPage({super.key, required this.id});
  @override
  Widget build(BuildContext context) => ComingSoonPage(title: 'Chi tiết Staff', icon: Icons.receipt, description: 'Đơn #$id — xác nhận, từ chối, giao hàng');
}
