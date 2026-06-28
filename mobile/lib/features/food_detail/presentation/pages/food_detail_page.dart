import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class FoodDetailPage extends StatelessWidget {
  final String id;
  const FoodDetailPage({super.key, required this.id});
  @override
  Widget build(BuildContext context) => ComingSoonPage(title: 'Chi tiết món', icon: Icons.restaurant, description: 'Món #$id — ảnh, giá, mô tả, variations');
}
