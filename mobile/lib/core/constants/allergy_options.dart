import 'package:flutter/material.dart';

class AllergyOptionData {
  final String id;
  final String label;
  final IconData icon;
  final String subtitle;

  const AllergyOptionData({
    required this.id,
    required this.label,
    required this.icon,
    required this.subtitle,
  });
}

const List<AllergyOptionData> allergyOptions = [
  AllergyOptionData(
    id: 'fish',
    label: 'Cá',
    icon: Icons.set_meal,
    subtitle: 'Cá hồi, cá ngừ, cá thu...',
  ),
  AllergyOptionData(
    id: 'shrimp',
    label: 'Tôm',
    icon: Icons.water,
    subtitle: 'Tôm sú, tôm hùm, tôm khô...',
  ),
  AllergyOptionData(
    id: 'crab',
    label: 'Cua',
    icon: Icons.waves,
    subtitle: 'Cua biển, ghẹ, gạch cua...',
  ),
  AllergyOptionData(
    id: 'shellfish',
    label: 'Hải sản có vỏ',
    icon: Icons.bubble_chart,
    subtitle: 'Nghêu, sò, ốc, hàu...',
  ),
  AllergyOptionData(
    id: 'squid',
    label: 'Mực / Bạch tuộc',
    icon: Icons.water_drop,
    subtitle: 'Mực ống, mực khô, bạch tuộc...',
  ),
  AllergyOptionData(
    id: 'beef',
    label: 'Thịt Bò',
    icon: Icons.restaurant,
    subtitle: 'Thịt bò phi lê, nạm bò...',
  ),
  AllergyOptionData(
    id: 'pork',
    label: 'Thịt Heo',
    icon: Icons.savings,
    subtitle: 'Thịt heo, mỡ heo, sườn...',
  ),
  AllergyOptionData(
    id: 'chicken',
    label: 'Thịt Gà / Gia cầm',
    icon: Icons.dining,
    subtitle: 'Thịt gà, thịt vịt, thịt ngan...',
  ),
  AllergyOptionData(
    id: 'peanuts',
    label: 'Đậu phộng (Lạc)',
    icon: Icons.grain,
    subtitle: 'Hạt đậu phộng, dầu phộng...',
  ),
  AllergyOptionData(
    id: 'tree_nuts',
    label: 'Các loại hạt',
    icon: Icons.forest,
    subtitle: 'Macca, hạnh nhân, hạt dẻ...',
  ),
  AllergyOptionData(
    id: 'soy',
    label: 'Đậu nành',
    icon: Icons.eco,
    subtitle: 'Đậu phụ, nước tương, sữa đậu...',
  ),
  AllergyOptionData(
    id: 'gluten',
    label: 'Gluten / Lúa mì',
    icon: Icons.bakery_dining,
    subtitle: 'Bột mì, bánh mì, mì sợi...',
  ),
  AllergyOptionData(
    id: 'allium',
    label: 'Hành / Tỏi',
    icon: Icons.spa,
    subtitle: 'Hành lá, hành tây, tỏi củ...',
  ),
  AllergyOptionData(
    id: 'eggs',
    label: 'Trứng',
    icon: Icons.egg,
    subtitle: 'Trứng gà, trứng vịt, sốt bơ...',
  ),
  AllergyOptionData(
    id: 'dairy',
    label: 'Sữa & Lactose',
    icon: Icons.local_drink,
    subtitle: 'Sữa tươi, phô mai, bơ sữa...',
  ),
  AllergyOptionData(
    id: 'msg',
    label: 'Bột ngọt (MSG)',
    icon: Icons.science,
    subtitle: 'Mì chính, hạt nêm chứa MSG...',
  ),
];

AllergyOptionData? findAllergyOption(String id) {
  for (final option in allergyOptions) {
    if (option.id == id) return option;
  }
  return null;
}
