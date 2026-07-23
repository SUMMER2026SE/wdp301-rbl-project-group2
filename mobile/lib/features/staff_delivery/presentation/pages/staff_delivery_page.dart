import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class StaffDeliveryPage extends StatelessWidget {
  const StaffDeliveryPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Giao hàng', icon: Icons.delivery_dining, description: 'Danh sách đơn đang giao + GPS tracking');
}
