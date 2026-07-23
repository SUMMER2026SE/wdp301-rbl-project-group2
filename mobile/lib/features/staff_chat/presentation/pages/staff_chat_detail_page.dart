import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

/// Staff chat detail page — shows conversation with a customer.
class StaffChatDetailPage extends StatelessWidget {
  final String conversationId;

  const StaffChatDetailPage({super.key, required this.conversationId});

  @override
  Widget build(BuildContext context) => ComingSoonPage(
        title: 'Chi tiết hỗ trợ',
        icon: Icons.chat,
        description: 'Nội dung hội thoại #$conversationId',
      );
}
