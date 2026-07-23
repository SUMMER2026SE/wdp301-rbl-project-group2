import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class OrderRatingPage extends StatelessWidget {
  final String orderId;
  const OrderRatingPage({super.key, required this.orderId});
  @override
  Widget build(BuildContext context) => ComingSoonPage(title: 'Đánh giá', icon: Icons.star, description: 'Đánh giá đơn #$orderId');
}
