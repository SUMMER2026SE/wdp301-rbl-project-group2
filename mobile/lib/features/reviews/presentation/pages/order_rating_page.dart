import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';

/// Extract product ID from raw JSON (String or Map with _id).
String _extractProductId(dynamic productIdField) {
  if (productIdField is Map) {
    return productIdField['_id'] as String? ?? '';
  }
  return (productIdField as String?) ?? '';
}

/// Feedback tags shown when rating < 3.
const _feedbackTagOptions = [
  'Món không ngon',
  'Giao hàng trễ',
  'Sai món',
  'Đóng gói kém',
  'Giá cao',
  'Khác',
];

/// Review item state for each product in the order.
class _ReviewItem {
  double rating;
  final TextEditingController commentController;
  List<File> images;
  Set<String> feedbackTags;
  bool existingReviewed;
  double existingRating;

  _ReviewItem({
    this.rating = 0,
    this.existingReviewed = false,
    this.existingRating = 0,
    String existingComment = '',
    List<File>? images,
    Set<String>? feedbackTags,
  }) : commentController = TextEditingController(text: existingComment),
       images = images ?? [],
       feedbackTags = feedbackTags ?? {};
}

/// Order rating page — rate each product in a completed order.
class OrderRatingPage extends StatefulWidget {
  final String orderId;
  const OrderRatingPage({super.key, required this.orderId});

  @override
  State<OrderRatingPage> createState() => _OrderRatingPageState();
}

class _OrderRatingPageState extends State<OrderRatingPage> {
  final Dio _dio = ApiClient().dio;
  final ImagePicker _picker = ImagePicker();

  List<Map<String, dynamic>> _items = [];
  Map<String, _ReviewItem> _reviewItems = {};
  double _overallRating = 0;
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _isAnonymous = false;
  bool _rateAll = false;
  String? _error;
  String? _orderCode;

  /// Cache of uploaded file ObjectIds keyed by local file path.
  final Map<String, String> _uploadedImageIds = {};

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  @override
  void dispose() {
    for (final item in _reviewItems.values) {
      item.commentController.dispose();
    }
    super.dispose();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _dio.get(ApiEndpoints.orderById(widget.orderId));
      final body = response.data as Map<String, dynamic>;
      final data = body['data'] as Map<String, dynamic>;

      // Load existing reviews if any
      final existingReviews = <String, Map<String, dynamic>>{};
      try {
        final reviewResponse = await _dio.get(
          ApiEndpoints.reviewByOrder(widget.orderId),
        );
        final reviewBody = reviewResponse.data as Map<String, dynamic>;
        final reviewData = reviewBody['data'] as List<dynamic>? ?? [];
        for (final r in reviewData) {
          final rMap = r as Map<String, dynamic>;
          existingReviews[_extractProductId(rMap['productId'])] = rMap;
        }
      } catch (_) {
        // No existing reviews
      }

      final items = data['items'] as List<dynamic>? ?? [];
      final orderCode = data['code'] as String? ?? '';

      final reviewMap = <String, _ReviewItem>{};
      for (final item in items) {
        final itemMap = item as Map<String, dynamic>;
        final productId = _extractProductId(itemMap['productId']);
        final key = productId.isNotEmpty ? productId : 'item_${_items.length}';

        final existing = existingReviews[productId];
        if (existing != null) {
          final rating = (existing['rating'] as num?)?.toDouble() ?? 0;
          reviewMap[key] = _ReviewItem(
            rating: rating,
            existingReviewed: true,
            existingRating: rating,
            existingComment: existing['comment'] as String? ?? '',
          );
        } else {
          reviewMap[key] = _ReviewItem();
        }
      }

      setState(() {
        _items = items.map((e) => e as Map<String, dynamic>).toList();
        _reviewItems = reviewMap;
        _orderCode = orderCode;
        _isLoading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        if (e.type == DioExceptionType.connectionError) {
          _error = 'Không có kết nối mạng. Vui lòng kiểm tra lại.';
        } else {
          _error = 'Không thể tải thông tin đơn hàng. Vui lòng thử lại.';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Đã xảy ra lỗi. Vui lòng thử lại.';
      });
    }
  }

  Future<void> _pickImages(String key) async {
    try {
      // Determine how many more images are allowed
      final current = _reviewItems[key]?.images ?? [];
      final remaining = 4 - current.length;
      if (remaining <= 0) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tối đa 4 ảnh cho mỗi đánh giá'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: AppColors.warning,
            ),
          );
        }
        return;
      }

      final List<XFile> pickedFiles = await _picker.pickMultiImage(
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (pickedFiles.isNotEmpty && _reviewItems[key] != null) {
        final newFiles = pickedFiles
            .map((f) => File(f.path))
            .take(remaining)
            .toList();
        setState(() {
          _reviewItems[key]!.images.addAll(newFiles);
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể chọn ảnh'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _removeImage(String key, int index) {
    final item = _reviewItems[key];
    if (item == null || index >= item.images.length) return;
    final removed = item.images[index];
    _uploadedImageIds.remove(removed.path);
    setState(() {
      item.images.removeAt(index);
    });
  }

  /// Upload all pending images for a review item, returning file ObjectIds.
  Future<List<String>> _uploadPendingImages(String key) async {
    final item = _reviewItems[key];
    if (item == null || item.images.isEmpty) return [];

    final uploadedIds = <String>[];
    for (final file in item.images) {
      // Check if already uploaded in this session
      final cached = _uploadedImageIds[file.path];
      if (cached != null) {
        uploadedIds.add(cached);
        continue;
      }

      final extension = file.path.split('.').last;

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: 'review_$key.$extension',
        ),
      });

      final response = await _dio.post(ApiEndpoints.fileUpload, data: formData);

      final responseData = response.data['data'] as Map<String, dynamic>;
      final fileId =
          responseData['_id'] as String? ?? responseData['id'] as String? ?? '';
      if (fileId.isNotEmpty) {
        _uploadedImageIds[file.path] = fileId;
        uploadedIds.add(fileId);
      }
    }
    return uploadedIds;
  }

  Future<void> _submitReview() async {
    // Gather the keys that need reviewing (not already reviewed)
    final pendingKeys = _reviewItems.entries
        .where((e) => !e.value.existingReviewed)
        .map((e) => e.key)
        .toList();

    if (pendingKeys.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tất cả sản phẩm đã được đánh giá'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    // Validate: if rateAll is off, each must have a rating
    if (!_rateAll) {
      for (final key in pendingKeys) {
        if (_reviewItems[key]!.rating == 0) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Vui lòng đánh giá tất cả sản phẩm'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: AppColors.warning,
            ),
          );
          return;
        }
      }
    } else {
      // In rateAll mode, use the first pending item as the master
      final master = _reviewItems[pendingKeys.first]!;
      if (master.rating == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Vui lòng đánh giá sản phẩm'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.warning,
          ),
        );
        return;
      }
    }

    setState(() => _isSubmitting = true);

    try {
      // Upload all images first and collect file IDs
      final imageIdsByKey = <String, List<String>>{};
      if (_rateAll) {
        final masterKey = pendingKeys.first;
        imageIdsByKey[masterKey] = await _uploadPendingImages(masterKey);
      } else {
        for (final key in pendingKeys) {
          imageIdsByKey[key] = await _uploadPendingImages(key);
        }
      }

      // Build the reviews payload
      final reviewsPayload = <Map<String, dynamic>>[];
      for (final key in pendingKeys) {
        final item = _reviewItems[key]!;
        final productId = _extractProductId(
          _items.firstWhere(
            (i) => _extractProductId(i['productId']) == key,
            orElse: () => <String, dynamic>{},
          )['productId'],
        );

        if (_rateAll) {
          final master = _reviewItems[pendingKeys.first]!;
          reviewsPayload.add({
            'productId': productId,
            'rating': master.rating.toInt(),
            'comment': master.commentController.text.trim(),
            'feedbackTags': master.feedbackTags.toList(),
            'images': imageIdsByKey[pendingKeys.first] ?? [],
            'isAnonymous': _isAnonymous,
          });
        } else {
          reviewsPayload.add({
            'productId': productId,
            'rating': item.rating.toInt(),
            'comment': item.commentController.text.trim(),
            'feedbackTags': item.feedbackTags.toList(),
            'images': imageIdsByKey[key] ?? [],
            'isAnonymous': _isAnonymous,
          });
        }
      }

      // Send JSON body (not FormData) matching the backend validator
      await _dio.post(
        ApiEndpoints.reviews,
        data: {'orderId': widget.orderId, 'reviews': reviewsPayload},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đánh giá thành công'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
            ),
          ),
        );
        Navigator.of(context).pop();
      }
    } on DioException catch (e) {
      final msg =
          e.response?.data?['message'] as String? ??
          'Không thể gửi đánh giá. Vui lòng thử lại.';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Đánh giá đơn hàng')),
      body: _isLoading
          ? _buildShimmer()
          : _error != null
          ? AppErrorWidget(message: _error!, onRetry: _loadOrder)
          : _buildContent(),
      bottomNavigationBar: _isLoading || _error != null
          ? null
          : _buildBottomBar(),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 3,
        itemBuilder: (_, _) => Container(
          height: 160,
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    final hasUnreviewed = _reviewItems.values.any((r) => !r.existingReviewed);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order info header
          if (_orderCode != null && _orderCode!.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.divider),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.receipt_outlined,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Đơn hàng #$_orderCode',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),

          // Overall rating
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.divider),
            ),
            child: Column(
              children: [
                const Text(
                  'Đánh giá tổng quan',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                RatingBar.builder(
                  initialRating: _overallRating,
                  minRating: 1,
                  direction: Axis.horizontal,
                  allowHalfRating: true,
                  itemCount: 5,
                  itemSize: 36,
                  unratedColor: Colors.grey[300],
                  itemBuilder: (context, _) =>
                      const Icon(Icons.star_rounded, color: Colors.amber),
                  onRatingUpdate: (rating) {
                    setState(() => _overallRating = rating);
                  },
                ),
                if (_overallRating > 0) ...[
                  const SizedBox(height: 6),
                  Text(
                    _overallRating >= 4.5
                        ? 'Tuyệt vời!'
                        : _overallRating >= 3.5
                        ? 'Tốt'
                        : _overallRating >= 2.5
                        ? 'Tạm ổn'
                        : 'Cần cải thiện',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[500],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Rate-all checkbox (only when there are items not yet reviewed)
          if (hasUnreviewed && _items.length > 1)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: Row(
                children: [
                  Checkbox(
                    value: _rateAll,
                    onChanged: (v) {
                      setState(() => _rateAll = v ?? false);
                    },
                    activeColor: AppColors.primary,
                  ),
                  const Text(
                    'Áp dụng cho tất cả',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 4),

          const Text(
            'Đánh giá từng sản phẩm',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),

          // Per-product reviews
          ..._items.map((item) {
            final name = item['name'] as String? ?? 'Sản phẩm';
            final productId = _extractProductId(item['productId']);
            final key = productId.isNotEmpty
                ? productId
                : 'item_${item["productId"]}';
            final imageRaw =
                item['image'] as String? ??
                (item['productId'] is Map
                    ? (item['productId']['image'] as String?)
                    : null);
            final reviewItem = _reviewItems[key];
            if (reviewItem == null) return const SizedBox.shrink();

            final isMaster =
                _rateAll &&
                key ==
                    _reviewItems.keys.firstWhere(
                      (k) => !_reviewItems[k]!.existingReviewed,
                      orElse: () => key,
                    );

            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.divider),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Product header
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: SizedBox(
                            width: 52,
                            height: 52,
                            child: imageRaw != null && imageRaw.isNotEmpty
                                ? CachedNetworkImage(
                                    imageUrl: imageRaw,
                                    fit: BoxFit.cover,
                                    placeholder: (_, _) =>
                                        Container(color: Colors.grey[200]),
                                    errorWidget: (_, _, _) => Container(
                                      color: Colors.orange[50],
                                      child: const Icon(
                                        Icons.restaurant,
                                        color: AppColors.primary,
                                        size: 24,
                                      ),
                                    ),
                                  )
                                : Container(
                                    color: Colors.orange[50],
                                    child: const Icon(
                                      Icons.restaurant,
                                      color: AppColors.primary,
                                      size: 24,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Số lượng: ${item['quantity'] ?? 1}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Show "Master" badge for rate-all master item
                        if (_rateAll && isMaster)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Mẫu',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // If already reviewed, show existing rating badge
                    if (reviewItem.existingReviewed)
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.check_circle,
                              color: AppColors.success,
                              size: 16,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Đã đánh giá',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.green[700],
                              ),
                            ),
                            const SizedBox(width: 8),
                            RatingBar.builder(
                              initialRating: reviewItem.existingRating,
                              minRating: 0,
                              direction: Axis.horizontal,
                              allowHalfRating: true,
                              itemCount: 5,
                              itemSize: 20,
                              ignoreGestures: true,
                              unratedColor: Colors.grey[300],
                              itemBuilder: (context, _) => const Icon(
                                Icons.star_rounded,
                                color: Colors.amber,
                              ),
                              onRatingUpdate: (_) {},
                            ),
                          ],
                        ),
                      )
                    else ...[
                      // In rateAll mode and this is not the master, show "Will use master"
                      if (_rateAll && !isMaster)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.blue[50],
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.sync,
                                  color: AppColors.primary,
                                  size: 16,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Sẽ áp dụng đánh giá từ sản phẩm mẫu',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.blue[700],
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else ...[
                        // Rating stars
                        RatingBar.builder(
                          initialRating: reviewItem.rating,
                          minRating: 1,
                          direction: Axis.horizontal,
                          allowHalfRating: true,
                          itemCount: 5,
                          itemSize: 32,
                          unratedColor: Colors.grey[300],
                          itemBuilder: (context, _) => const Icon(
                            Icons.star_rounded,
                            color: Colors.amber,
                          ),
                          onRatingUpdate: (rating) {
                            setState(() {
                              _reviewItems[key]!.rating = rating;
                            });
                          },
                        ),

                        const SizedBox(height: 10),

                        // Comment field
                        TextField(
                          controller: reviewItem.commentController,
                          decoration: const InputDecoration(
                            hintText: 'Nhận xét của bạn về sản phẩm này...',
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            isDense: true,
                          ),
                          maxLines: 3,
                          maxLength: 500,
                        ),

                        // Feedback tags (only when rating < 3)
                        if (reviewItem.rating > 0 && reviewItem.rating < 3) ...[
                          const SizedBox(height: 8),
                          _buildFeedbackTags(key),
                        ],

                        const SizedBox(height: 8),

                        // Multi-image grid + add button
                        _buildImageSection(key),
                      ],
                    ],
                  ],
                ),
              ),
            );
          }),
          // Bottom padding for the submit bar + anonymous checkbox
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildFeedbackTags(String key) {
    final item = _reviewItems[key]!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Bạn gặp vấn đề gì?',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _feedbackTagOptions.map((tag) {
            final isSelected = item.feedbackTags.contains(tag);
            return FilterChip(
              label: Text(tag),
              selected: isSelected,
              onSelected: (val) {
                setState(() {
                  if (val) {
                    if (item.feedbackTags.length < 5) {
                      item.feedbackTags.add(tag);
                    }
                  } else {
                    item.feedbackTags.remove(tag);
                  }
                });
              },
              selectedColor: AppColors.primary.withValues(alpha: 0.15),
              checkmarkColor: AppColors.primary,
              labelStyle: TextStyle(
                color: isSelected ? AppColors.primary : AppColors.textPrimary,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                fontSize: 12,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(
                  color: isSelected ? AppColors.primary : AppColors.divider,
                  width: isSelected ? 1.5 : 1,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildImageSection(String key) {
    final item = _reviewItems[key]!;
    final images = item.images;
    final remaining = 4 - images.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Hình ảnh',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              '${images.length}/4',
              style: TextStyle(fontSize: 12, color: Colors.grey[500]),
            ),
          ],
        ),
        const SizedBox(height: 8),
        // Thumbnail grid (2 columns max)
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            // Existing thumbnails
            ...List.generate(images.length, (index) {
              return _buildImageThumbnail(key, images[index], index);
            }),
            // Add button (if not full)
            if (remaining > 0) _buildAddImageButton(key, remaining),
          ],
        ),
      ],
    );
  }

  Widget _buildImageThumbnail(String key, File file, int index) {
    return Stack(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.divider),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.file(file, fit: BoxFit.cover, width: 72, height: 72),
          ),
        ),
        // Delete button
        Positioned(
          top: -4,
          right: -4,
          child: GestureDetector(
            onTap: () => _removeImage(key, index),
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(
                color: AppColors.error,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, size: 14, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAddImageButton(String key, int remaining) {
    return GestureDetector(
      onTap: () => _pickImages(key),
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.divider,
            style: BorderStyle.solid,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_a_photo_outlined, color: Colors.grey[400], size: 22),
            const SizedBox(height: 2),
            Text(
              remaining > 1 ? '+$remaining ảnh' : '+1 ảnh',
              style: TextStyle(fontSize: 9, color: Colors.grey[400]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        MediaQuery.of(context).padding.bottom + 12,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Anonymous toggle
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Checkbox(
                value: _isAnonymous,
                onChanged: (v) {
                  setState(() => _isAnonymous = v ?? false);
                },
                activeColor: AppColors.primary,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              GestureDetector(
                onTap: () {
                  setState(() => _isAnonymous = !_isAnonymous);
                },
                child: const Text(
                  'Đánh giá ẩn danh',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _submitReview,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Gửi đánh giá',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
