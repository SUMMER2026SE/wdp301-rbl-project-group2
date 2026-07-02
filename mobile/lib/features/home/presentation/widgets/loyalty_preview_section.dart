import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';

class LoyaltyPreviewSection extends StatelessWidget {
  final Map<String, dynamic>? membership;
  final bool isError;
  final VoidCallback onRetry;

  const LoyaltyPreviewSection({
    super.key,
    this.membership,
    this.isError = false,
    required this.onRetry,
  });

  static const Map<String, int> _tierThresholds = {
    'bronze': 0,
    'silver': 500,
    'gold': 2000,
    'platinum': 5000,
    'diamond': 10000,
  };

  static const List<String> _tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

  String _getTierEmoji(String tier) {
    switch (tier.toLowerCase()) {
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'platinum': return '💎';
      case 'diamond': return '👑';
      case 'bronze':
      default: return '🥉';
    }
  }

  String _getTierLabel(String tier) {
    switch (tier.toLowerCase()) {
      case 'silver': return 'Bạc';
      case 'gold': return 'Vàng';
      case 'platinum': return 'Bạch Kim';
      case 'diamond': return 'Kim Cương';
      case 'bronze':
      default: return 'Đồng';
    }
  }

  Color _getTierColor(String tier) {
    switch (tier.toLowerCase()) {
      case 'silver': return const Color(0xFFC0CAD8);
      case 'gold': return const Color(0xFFFFBF69);
      case 'platinum': return const Color(0xFFB39DDB);
      case 'diamond': return const Color(0xFF80DEEA);
      case 'bronze':
      default: return const Color(0xFFFF8F5E);
    }
  }

  List<Color> _getGradientColors(String tier) {
    switch (tier.toLowerCase()) {
      case 'silver': return [const Color(0xFF455A64), const Color(0xFF607D8B)];
      case 'gold': return [const Color(0xFF5D4037), const Color(0xFF8D6E63)];
      case 'platinum': return [const Color(0xFF4A148C), const Color(0xFF7B1FA2)];
      case 'diamond': return [const Color(0xFF1A237E), const Color(0xFF283593)];
      case 'bronze':
      default: return [const Color(0xFFBF360C), const Color(0xFFE64A19)];
    }
  }

  String _getNextTierName(String currentTier) {
    final idx = _tierOrder.indexOf(currentTier.toLowerCase());
    if (idx < 0 || idx >= _tierOrder.length - 1) return '';
    return _tierOrder[idx + 1];
  }

  int _getNextTierThreshold(String currentTier) {
    final next = _getNextTierName(currentTier);
    if (next.isEmpty) return 0;
    return _tierThresholds[next] ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    if (isError) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.red[50],
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.red[100]!),
          ),
          child: Row(
            children: [
              Icon(Icons.error_outline, color: Colors.red[400], size: 20),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Không thể tải thông tin thành viên',
                  style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ),
              TextButton(
                onPressed: onRetry,
                style: TextButton.styleFrom(
                  minimumSize: const Size(40, 28),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
                child: const Text('Thử lại', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        ),
      );
    }

    if (membership == null) {
      return const SizedBox.shrink();
    }

    final tierRaw = (membership?['tier'] as String? ?? 'bronze').toLowerCase();
    final tierLabel = _getTierLabel(tierRaw);
    final tierEmoji = _getTierEmoji(tierRaw);
    final tierColor = _getTierColor(tierRaw);
    final gradientColors = _getGradientColors(tierRaw);

    // collectedPoints = spendable points, accumulatedPoints = total earned (for tier calc)
    final collectedPoints = ((membership?['collectedPoints'] ?? membership?['points'] ?? membership?['accumulatedPoints']) as num? ?? 0).toInt();
    final accumulatedPoints = ((membership?['accumulatedPoints'] ?? membership?['collectedPoints'] ?? membership?['points']) as num? ?? 0).toInt();

    final nextTierName = _getNextTierName(tierRaw);
    final nextTierThreshold = _getNextTierThreshold(tierRaw);
    final isMaxTier = nextTierName.isEmpty;

    // Progress to next tier based on accumulated points
    final progress = isMaxTier
        ? 1.0
        : (nextTierThreshold > 0 ? (accumulatedPoints / nextTierThreshold).clamp(0.0, 1.0) : 0.0);
    final pointsToNext = isMaxTier ? 0 : (nextTierThreshold - accumulatedPoints).clamp(0, nextTierThreshold);

    return GestureDetector(
      onTap: () => context.push('/membership'),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: gradientColors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: gradientColors[0].withValues(alpha: 0.4),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative circles
            Positioned(
              top: -20,
              right: -20,
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: tierColor.withValues(alpha: 0.08),
                ),
              ),
            ),
            Positioned(
              bottom: -30,
              left: -15,
              child: Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.04),
                ),
              ),
            ),
            // Main content
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top row: Tier badge + arrow
                  Row(
                    children: [
                      // Tier emoji + name
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: tierColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: tierColor.withValues(alpha: 0.3), width: 1),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(tierEmoji, style: const TextStyle(fontSize: 16)),
                            const SizedBox(width: 6),
                            Text(
                              'Hạng $tierLabel',
                              style: TextStyle(
                                color: tierColor,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.arrow_forward_ios, color: Colors.white54, size: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Points display
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '$collectedPoints',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          height: 1,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          'điểm khả dụng',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Stack(
                      children: [
                        Container(
                          height: 8,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        FractionallySizedBox(
                          widthFactor: progress,
                          child: Container(
                            height: 8,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [tierColor.withValues(alpha: 0.7), tierColor],
                              ),
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Bottom text
                  if (!isMaxTier)
                    Text(
                      'Còn $pointsToNext điểm nữa lên hạng ${_getTierLabel(nextTierName)} ${_getTierEmoji(nextTierName)}',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    )
                  else
                    Text(
                      'Bạn đã đạt hạng cao nhất! 🎉',
                      style: TextStyle(
                        color: tierColor.withValues(alpha: 0.9),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
