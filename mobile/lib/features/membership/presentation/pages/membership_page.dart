import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class MembershipPage extends StatelessWidget {
  const MembershipPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Thành viên', icon: Icons.card_membership, description: 'Hạng thành viên, điểm tích lũy');
}
