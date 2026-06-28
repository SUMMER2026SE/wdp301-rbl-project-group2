import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class VoucherListPage extends StatelessWidget {
  const VoucherListPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Voucher', icon: Icons.local_offer, description: 'Danh sách voucher khuyến mãi');
}
