import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class OrderDetailPage extends StatelessWidget {
  final String id;
  const OrderDetailPage({super.key, required this.id});
  @override
  Widget build(BuildContext context) => ComingSoonPage(title: 'Chi tiết đơn', icon: Icons.receipt, description: 'Đơn #$id — items, status, timeline');
}
