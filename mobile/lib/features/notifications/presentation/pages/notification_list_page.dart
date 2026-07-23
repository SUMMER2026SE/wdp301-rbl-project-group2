import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class NotificationListPage extends StatelessWidget {
  const NotificationListPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Thông báo', icon: Icons.notifications, description: 'Danh sách thông báo');
}
