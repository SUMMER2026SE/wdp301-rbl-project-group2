import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class ReviewHighlightsSection extends StatelessWidget {
  final List<Map<String, dynamic>> reviews;
  final bool isError;
  final VoidCallback onRetry;

  const ReviewHighlightsSection({
    super.key,
    required this.reviews,
    this.isError = false,
    required this.onRetry,
  });

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
                  'Không thể tải đánh giá',
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

    if (reviews.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.star_rate_rounded, color: Colors.amber, size: 18),
              ),
              const SizedBox(width: 10),
              const Text(
                'Đánh giá nổi bật',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: reviews.length,
            itemBuilder: (context, index) {
              final review = reviews[index];
              final rating = (review['rating'] as num?)?.toInt() ?? 5;
              final comment = review['comment'] as String? ?? '';
              final createdAt = DateTime.tryParse(review['createdAt'] as String? ?? '');

              // Backend populates userId -> { username, avatar }
              final user = (review['userId'] ?? review['user']) as Map<String, dynamic>?;
              final userName = user?['username'] as String? ?? user?['name'] as String? ?? 'Khách hàng';
              final userAvatar = user?['avatar'] as String?;

              // Backend populates productId -> { name, image }
              final product = (review['productId'] ?? review['product']) as Map<String, dynamic>?;
              final productName = product?['name'] as String? ?? review['productName'] as String? ?? '';
              final productImage = product?['image'] as String? ?? '';

              return Container(
                width: 260,
                margin: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.divider.withValues(alpha: 0.4)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top: Product info row with image
                    if (productName.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                        ),
                        child: Row(
                          children: [
                            if (productImage.isNotEmpty)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: CachedNetworkImage(
                                  imageUrl: productImage,
                                  width: 28,
                                  height: 28,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, _, _) => const SizedBox(width: 28, height: 28),
                                ),
                              ),
                            if (productImage.isNotEmpty) const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                productName,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Comment body
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(12, productName.isNotEmpty ? 8 : 12, 12, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Quote icon + comment
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.format_quote_rounded,
                                  size: 18,
                                  color: AppColors.primary.withValues(alpha: 0.3),
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    comment,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                      height: 1.4,
                                      fontStyle: FontStyle.italic,
                                    ),
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Bottom: User info + rating
                    Container(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                      child: Row(
                        children: [
                          // Avatar
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                            child: userAvatar != null && userAvatar.isNotEmpty
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: CachedNetworkImage(
                                      imageUrl: userAvatar,
                                      width: 28,
                                      height: 28,
                                      fit: BoxFit.cover,
                                      errorWidget: (_, _, _) => const Icon(Icons.person, size: 14, color: AppColors.primary),
                                    ),
                                  )
                                : Text(
                                    userName.isNotEmpty ? userName[0].toUpperCase() : '?',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.primary,
                                    ),
                                  ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  userName,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (createdAt != null)
                                  Text(
                                    Formatters.timeAgo(createdAt),
                                    style: const TextStyle(
                                      fontSize: 9,
                                      color: AppColors.textHint,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          // Star rating
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: List.generate(5, (i) {
                              return Padding(
                                padding: const EdgeInsets.only(left: 1),
                                child: Icon(
                                  i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
                                  size: 14,
                                  color: i < rating ? Colors.amber : AppColors.textHint.withValues(alpha: 0.4),
                                ),
                              );
                            }),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
