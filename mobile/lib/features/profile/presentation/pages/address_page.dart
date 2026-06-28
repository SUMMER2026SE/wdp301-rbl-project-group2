import 'package:flutter/material.dart';
import 'package:foa_mobile/shared/widgets/coming_soon_page.dart';

class AddressPage extends StatelessWidget {
  const AddressPage({super.key});
  @override
  Widget build(BuildContext context) => const ComingSoonPage(title: 'Địa chỉ', icon: Icons.location_on, description: 'Danh sách địa chỉ giao hàng');
}
