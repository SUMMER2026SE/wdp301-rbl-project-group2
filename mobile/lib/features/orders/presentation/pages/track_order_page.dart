import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class TrackOrderPage extends StatelessWidget {
  final String id;
  const TrackOrderPage({super.key, required this.id});
  @override
  Widget build(BuildContext context) => ComingSoonPage(title: 'Theo dõi đơn', icon: Icons.timeline, description: 'Đơn #$id — cập nhật trạng thái realtime');
}
