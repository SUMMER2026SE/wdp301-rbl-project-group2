import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class ChatListPage extends StatelessWidget {
  const ChatListPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Hỗ trợ', icon: Icons.chat, description: 'Danh sách cuộc hội thoại hỗ trợ');
}
