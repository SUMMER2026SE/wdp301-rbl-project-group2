import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class StaffChatListPage extends StatelessWidget {
  const StaffChatListPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Hỗ trợ KH', icon: Icons.support_agent, description: 'Quản lý hội thoại hỗ trợ khách hàng');
}
