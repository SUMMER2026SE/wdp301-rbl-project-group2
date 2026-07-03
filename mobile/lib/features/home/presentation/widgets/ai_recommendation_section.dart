import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class AiRecommendationSection extends StatelessWidget {
  final List<Map<String, dynamic>> recommendations;
  final List<String> userAllergies;
  final Function(String) onTap;
  final Function(Map<String, dynamic>) onAddToCart;
  final VoidCallback onViewAll;

  const AiRecommendationSection({
    super.key,
    required this.recommendations,
    required this.userAllergies,
    required this.onTap,
    required this.onAddToCart,
    required this.onViewAll,
  });

  String _getAllergenLabel(String id) {
    switch (id) {
      case 'fish':
        return 'Cá';
      case 'shrimp':
        return 'Tôm';
      case 'crab':
        return 'Cua';
      case 'shellfish':
        return 'Hải sản có vỏ';
      case 'squid':
        return 'Mực / Bạch tuộc';
      case 'beef':
        return 'Thịt bò';
      case 'pork':
        return 'Thịt heo';
      case 'chicken':
        return 'Gia cầm';
      case 'peanuts':
        return 'Đậu phộng';
      case 'tree_nuts':
        return 'Hạt cây';
      case 'soy':
        return 'Đậu nành';
      case 'gluten':
        return 'Gluten / Lúa mì';
      case 'allium':
        return 'Hành / Tỏi';
      case 'eggs':
        return 'Trứng';
      case 'dairy':
        return 'Sữa';
      case 'msg':
        return 'Bột ngọt';
      default:
        return id;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (recommendations.isEmpty) return const SizedBox.shrink();

    final displayList = recommendations.length > 4
        ? recommendations.sublist(0, 4)
        : recommendations;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.auto_awesome, color: AppColors.primary),
                  SizedBox(width: 6),
                  Text(
                    'Gợi ý từ trợ lý AI',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              TextButton(onPressed: onViewAll, child: const Text('Xem tất cả')),
            ],
          ),
        ),
        ...displayList.map((product) {
          final name = product['name'] as String? ?? 'Món ăn';
          final price = (product['price'] as num?)?.toDouble() ?? 0;
          final image = product['image'] as String?;
          final rating = (product['rating'] as num?)?.toDouble();
          final productId = product['_id'] as String? ?? '';

          final catRaw = product['category'];
          final category = catRaw is String
              ? catRaw
              : (catRaw is Map ? (catRaw['name'] as String? ?? '') : '');

          final allergens = product['allergenTags'] as List<dynamic>? ?? [];
          final conflictingAllergies = allergens
              .map((a) => a.toString())
              .where((a) => userAllergies.contains(a))
              .toList();
          final hasAllergy = conflictingAllergies.isNotEmpty;

          final aiReason = product['aiReason'] as String?;
          final healthScoreRaw = product['healthScore'];
          final healthScore = healthScoreRaw is num
              ? healthScoreRaw.toInt()
              : null;

          Color healthColor = Colors.grey;
          if (healthScore != null) {
            if (healthScore >= 80) {
              healthColor = Colors.green;
            } else if (healthScore >= 60) {
              healthColor = Colors.orange;
            } else {
              healthColor = Colors.red;
            }
          }

          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
              border: Border.all(
                color: hasAllergy
                    ? Colors.red[200]!
                    : AppColors.divider.withValues(alpha: 0.5),
                width: hasAllergy ? 1.5 : 0.8,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: InkWell(
                onTap: () => onTap(productId),
                borderRadius: BorderRadius.circular(20),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: CachedNetworkImage(
                          imageUrl: image ?? '',
                          width: 84,
                          height: 84,
                          fit: BoxFit.cover,
                          placeholder: (_, _) =>
                              Container(color: AppColors.surfaceVariant),
                          errorWidget: (_, _, _) => Container(
                            color: AppColors.surfaceVariant,
                            child: const Icon(
                              Icons.restaurant,
                              color: AppColors.primary,
                              size: 32,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                if (category.isNotEmpty)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.green[50],
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      category,
                                      style: TextStyle(
                                        color: Colors.green[700],
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                if (category.isNotEmpty)
                                  const SizedBox(width: 8),
                                if (rating != null) ...[
                                  const Icon(
                                    Icons.star,
                                    color: Colors.amber,
                                    size: 13,
                                  ),
                                  const SizedBox(width: 2),
                                  Text(
                                    rating.toStringAsFixed(1),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                                const Spacer(),
                                if (healthScore != null)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: healthColor.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      'Điểm: $healthScore',
                                      style: TextStyle(
                                        color: healthColor,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              name,
                              style: const TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (aiReason != null && aiReason.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(
                                    Icons.auto_awesome,
                                    size: 10,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      aiReason,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            const SizedBox(height: 4),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  Formatters.currency(price),
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.primary,
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => onAddToCart(product),
                                  child: Container(
                                    width: 32,
                                    height: 32,
                                    decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.add_shopping_cart,
                                      color: Colors.white,
                                      size: 16,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (hasAllergy) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.red[50],
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.red[100]!),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.warning_amber_rounded,
                                      color: Colors.red,
                                      size: 16,
                                    ),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        'Chứa nguyên liệu dị ứng: ${conflictingAllergies.map(_getAllergenLabel).join(", ")}',
                                        style: TextStyle(
                                          color: Colors.red[900],
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}
