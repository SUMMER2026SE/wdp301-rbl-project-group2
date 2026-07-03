import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/features/products/data/models/product_model.dart';
import 'package:foa_mobile/shared/widgets/product_grid_card.dart';

/// Food detail page with image, info, variations, and add-to-cart.
class FoodDetailPage extends StatefulWidget {
  final String id;
  const FoodDetailPage({super.key, required this.id});

  @override
  State<FoodDetailPage> createState() => _FoodDetailPageState();
}

class _FoodDetailPageState extends State<FoodDetailPage> {
  final Dio _dio = ApiClient().dio;
  Map<String, dynamic>? _product;
  List<Map<String, dynamic>> _variations = [];
  final Map<String, String> _selectedOptions = {};
  bool _isLoading = true;
  String? _error;
  int _quantity = 1;
  bool _isAddingToCart = false;
  bool _isBuyingNow = false;
  Map<String, dynamic>? _healthRisk;
  List<Map<String, dynamic>> _similarProducts = [];
  bool _isLoadingSimilar = false;

  // Reviews state
  List<Map<String, dynamic>> _reviews = [];
  bool _isLoadingReviews = false;
  int _reviewPage = 1;
  bool _hasMoreReviews = true;

  @override
  void initState() {
    super.initState();
    _loadProduct();
  }

  Future<void> _loadProduct() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _dio.get(ApiEndpoints.productById(widget.id));
      final data = response.data;
      final productData = data is Map<String, dynamic>
          ? (data['data'] as Map<String, dynamic>? ?? data)
          : data is Map
          ? (data['data'] as Map<String, dynamic>? ??
                Map<String, dynamic>.from(data))
          : <String, dynamic>{};

      final variations =
          (productData['variants'] as List<dynamic>?)
              ?.whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList() ??
          [];

      setState(() {
        _product = productData;
        _variations = variations;
        _isLoading = false;
      });
      unawaited(_loadHealthRisk());
      unawaited(_loadReviews());
      unawaited(_loadSimilarProducts());
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        if (e.type == DioExceptionType.connectionError) {
          _error = 'Không có kết nối mạng. Vui lòng kiểm tra lại.';
        } else if (e.response?.statusCode == 404) {
          _error = 'Không tìm thấy món ăn này.';
        } else {
          _error = 'Không thể tải thông tin món ăn. Vui lòng thử lại.';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Đã xảy ra lỗi. Vui lòng thử lại.';
      });
    }
  }

  Future<void> _loadReviews({bool loadMore = false}) async {
    if (_isLoadingReviews || (!loadMore && !_hasMoreReviews)) return;

    setState(() {
      _isLoadingReviews = true;
      if (!loadMore) _reviewPage = 1;
    });

    try {
      final response = await _dio.get(
        ApiEndpoints.productReviews(widget.id),
        queryParameters: {'page': _reviewPage, 'limit': 10},
      );
      final data = response.data as Map<String, dynamic>;
      final rawList = (data['data'] as List<dynamic>?) ?? [];
      final reviews = rawList.cast<Map<String, dynamic>>();
      final pagination = data['pagination'] as Map<String, dynamic>?;
      final totalPages = pagination?['totalPages'] as int? ?? 1;

      setState(() {
        if (loadMore) {
          _reviews.addAll(reviews);
        } else {
          _reviews = reviews;
        }
        _reviewPage++;
        _hasMoreReviews = _reviewPage <= totalPages;
        _isLoadingReviews = false;
      });
    } catch (e) {
      setState(() => _isLoadingReviews = false);
    }
  }

  double get _totalPrice {
    double base = (_product?['price'] as num?)?.toDouble() ?? 0;
    for (final varId in _selectedOptions.keys) {
      final varGroup = _variations.firstWhere(
        (v) => v['_id'] == varId || v['name'] == varId,
        orElse: () => <String, dynamic>{},
      );
      final options = varGroup['options'] as List<dynamic>? ?? [];
      for (final opt in options) {
        final optMap = opt as Map<String, dynamic>;
        if (optMap['choice'] == _selectedOptions[varId]) {
          base += (optMap['extraPrice'] as num?)?.toDouble() ?? 0;
        }
      }
    }
    return base * _quantity;
  }

  Future<void> _loadHealthRisk() async {
    try {
      final response = await _dio.get(
        ApiEndpoints.productHealthRisk(widget.id),
      );
      final data = response.data;
      final riskData = data is Map<String, dynamic>
          ? (data['data'] as Map<String, dynamic>? ?? data)
          : data is Map
          ? (data['data'] as Map<String, dynamic>? ??
                Map<String, dynamic>.from(data))
          : null;
      if (riskData != null) {
        if (mounted) {
          setState(() => _healthRisk = riskData);
        }
      }
    } on DioException catch (e) {
      // 404 or any error — skip silently
      if (e.response?.statusCode == 404) return;
    } catch (_) {
      // ignore
    }
  }

  Future<void> _addToCart() async {
    setState(() => _isAddingToCart = true);

    final variations = _selectedOptions.entries
        .map((e) => {'name': e.key, 'choice': e.value})
        .toList();

    try {
      await _dio.post(
        ApiEndpoints.cartAdd,
        data: {
          'productId': widget.id,
          'quantity': _quantity,
          'price': (_product?['price'] as num?)?.toDouble() ?? 0,
          if (variations.isNotEmpty) 'variations': variations,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Đã thêm ${_product?['name'] ?? 'món ăn'} vào giỏ hàng',
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            duration: const Duration(seconds: 2),
          ),
        );
        context.pop();
      }
    } on DioException catch (e) {
      final msg =
          e.response?.data?['message'] as String? ??
          'Không thể thêm vào giỏ hàng';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isAddingToCart = false);
    }
  }

  List<String> _getIngredientNames() {
    final recipe = _product?['recipe'] as List<dynamic>?;
    if (recipe == null) return [];
    final names = <String>{};
    for (final item in recipe) {
      if (item is Map) {
        final name = item['name'] as String?;
        if (name != null && name.trim().isNotEmpty) {
          names.add(name.trim());
          continue;
        }
        final ingredientId = item['ingredientId'];
        if (ingredientId is Map) {
          final ingName = ingredientId['name'] as String?;
          if (ingName != null && ingName.trim().isNotEmpty) {
            names.add(ingName.trim());
          }
        }
      }
    }
    return names.toList();
  }

  Future<void> _buyNow() async {
    setState(() => _isBuyingNow = true);

    final variations = _selectedOptions.entries
        .map((e) => {'name': e.key, 'choice': e.value})
        .toList();

    try {
      await _dio.post(
        ApiEndpoints.cartAdd,
        data: {
          'productId': widget.id,
          'quantity': _quantity,
          'price': (_product?['price'] as num?)?.toDouble() ?? 0,
          if (variations.isNotEmpty) 'variations': variations,
        },
      );

      // Fetch the updated cart items to find the ID of this newly added item
      final cartResponse = await _dio.get(ApiEndpoints.cart);
      final cartData = cartResponse.data;
      final cartItems = cartData is Map
          ? (cartData['data']?['items'] as List<dynamic>? ?? [])
          : (cartData['items'] as List<dynamic>? ?? []);

      String? matchedCartItemId;
      for (final item in cartItems.reversed) {
        if (item is! Map<String, dynamic>) continue;
        final prodId = item['productId'] is Map
            ? item['productId']['_id']
            : item['productId'];
        if (prodId?.toString() == widget.id) {
          matchedCartItemId = (item['itemId'] ?? item['_id'])?.toString();
          break;
        }
      }

      if (mounted) {
        if (matchedCartItemId != null) {
          unawaited(context.push('/checkout', extra: [matchedCartItemId]));
        } else {
          unawaited(context.push('/checkout'));
        }
      }
    } on DioException catch (e) {
      final msg =
          e.response?.data?['message'] as String? ??
          'Không thể thực hiện mua ngay';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isBuyingNow = false);
    }
  }

  Future<void> _loadSimilarProducts() async {
    setState(() => _isLoadingSimilar = true);
    try {
      final categoryData = _product?['category'];
      final String? categoryId = categoryData is Map
          ? categoryData['_id'] as String?
          : categoryData as String?;

      final queryParams = <String, dynamic>{'limit': 5};
      if (categoryId != null) {
        queryParams['category'] = categoryId;
      }

      final storeId = LocalStorage.selectedStoreId;
      if (storeId != null && storeId.isNotEmpty) {
        queryParams['storeId'] = storeId;
      }

      final response = await _dio.get(
        ApiEndpoints.products,
        queryParameters: queryParams,
      );

      final data = response.data;
      final rawList = data is Map
          ? (data['data'] as List<dynamic>? ?? [])
          : data is List
          ? data
          : [];

      final products = rawList
          .map((e) => e as Map<String, dynamic>)
          .where((p) => p['_id'] != widget.id)
          .take(4)
          .toList();

      if (mounted) {
        setState(() {
          _similarProducts = products;
          _isLoadingSimilar = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingSimilar = false);
      }
    }
  }

  Future<void> _quickAddToCart(ProductModel product) async {
    try {
      await _dio.post(
        ApiEndpoints.cartAdd,
        data: {'productId': product.id, 'quantity': 1, 'price': product.price},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã thêm ${product.name} vào giỏ hàng'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } on DioException catch (e) {
      final msg =
          e.response?.data?['message'] as String? ??
          'Không thể thêm vào giỏ hàng';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? _buildShimmer()
          : _error != null
          ? _buildError()
          : _buildContent(),
      bottomNavigationBar: _product != null ? _buildBottomBar() : null,
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: Column(
        children: [
          Container(height: 280, color: Colors.white),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildError() {
    return AppErrorWidget(message: _error!, onRetry: _loadProduct);
  }

  Widget _buildContent() {
    return CustomScrollView(
      slivers: [
        // Image + back button
        SliverAppBar(
          expandedHeight: 280,
          pinned: true,
          backgroundColor: Colors.white,
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                _buildProductImage(),
                // Gradient overlay for brand feel
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          AppColors.primary.withValues(alpha: 0.15),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: MediaQuery.of(context).padding.top + 8,
                  left: 8,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_rounded),
                      onPressed: () => context.pop(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Product info
        SliverToBoxAdapter(
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: _buildProductInfo(),
                ),
                _buildUnifiedHealthAlert(),
                _buildAICard(),
                if (_product?['description'] != null &&
                    (_product!['description'] as String).isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: _buildDescription(),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: _buildIngredientsSection(),
                ),
                if (_variations.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: _buildVariations(),
                  ),

                // Reviews section
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                  child: _buildReviewsSection(),
                ),

                _buildSimilarProductsSection(),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProductImage() {
    final image = _product?['image'] as String?;
    if (image != null && image.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: image,
        width: double.infinity,
        height: 280,
        fit: BoxFit.cover,
        placeholder: (_, _) => Container(color: Colors.grey[200]),
        errorWidget: (_, _, _) => Container(
          color: Colors.orange[50],
          child: const Icon(
            Icons.restaurant,
            color: AppColors.primary,
            size: 60,
          ),
        ),
      );
    }
    return Container(
      color: Colors.orange[50],
      child: const Icon(Icons.restaurant, color: AppColors.primary, size: 60),
    );
  }

  Widget _buildProductInfo() {
    final name = _product?['name'] as String? ?? 'Món ăn';
    final price = (_product?['price'] as num?)?.toDouble() ?? 0;
    final rating = (_product?['rating'] as num?)?.toDouble();
    final originalPrice = (_product?['originalPrice'] as num?)?.toDouble();

    final hasDiscount = originalPrice != null && originalPrice > price;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (rating != null && rating >= 4.5) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.local_fire_department_rounded,
                  color: Colors.red,
                  size: 12,
                ),
                const SizedBox(width: 4),
                Text(
                  'MÓN NỔI BẬT',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    color: Colors.red[700],
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],

        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                name,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                  height: 1.2,
                ),
              ),
            ),
            if (rating != null) ...[
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.amber[50],
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.amber[100]!, width: 0.8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      color: Colors.amber,
                      size: 16,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      rating.toStringAsFixed(1),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12.5,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              Formatters.currency(price),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: AppColors.primary,
              ),
            ),
            if (hasDiscount) ...[
              const SizedBox(width: 8),
              Text(
                Formatters.currency(originalPrice),
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[400],
                  decoration: TextDecoration.lineThrough,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '-${((originalPrice - price) / originalPrice * 100).round()}%',
                  style: const TextStyle(
                    color: Colors.red,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildVariations() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _variations.map((v) {
        final name = v['name'] as String? ?? '';
        final options =
            (v['options'] as List<dynamic>?)
                ?.map((e) => e as Map<String, dynamic>)
                .toList() ??
            [];

        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: options.map((opt) {
                  final choice = opt['choice'] as String? ?? '';
                  final extraPrice =
                      (opt['extraPrice'] as num?)?.toDouble() ?? 0;
                  final isSelected = _selectedOptions[name] == choice;

                  return GestureDetector(
                    onTap: () =>
                        setState(() => _selectedOptions[name] = choice),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.divider,
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            choice,
                            style: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                          if (extraPrice > 0) ...[
                            const SizedBox(width: 4),
                            Text(
                              '+${Formatters.compactCurrency(extraPrice)}',
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white70
                                    : AppColors.primary,
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDescription() {
    final description = _product?['description'] as String? ?? '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(
              Icons.description_outlined,
              color: AppColors.primary,
              size: 18,
            ),
            SizedBox(width: 8),
            Text(
              'Mô tả món ăn',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey[50],
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey[100]!),
          ),
          child: Container(
            padding: const EdgeInsets.only(left: 12),
            decoration: const BoxDecoration(
              border: Border(
                left: BorderSide(color: AppColors.primary, width: 3),
              ),
            ),
            child: Text(
              description.isNotEmpty
                  ? description
                  : 'Hương vị tuyệt hảo đang chờ bạn khám phá.',
              style: TextStyle(
                fontSize: 13.5,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
                height: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUnifiedHealthAlert() {
    final riskLevel = _healthRisk?['level'] as String?;
    final matchedAllergens =
        _healthRisk?['matchedAllergens'] as List<dynamic>? ?? [];
    final allergenTags =
        (_product?['allergenTags'] as List<dynamic>?)?.cast<String>() ?? [];

    // State 1: Personalized health risk (warning or danger)
    if (_healthRisk != null &&
        (riskLevel == 'warning' || riskLevel == 'danger')) {
      final isDanger = riskLevel == 'danger';
      final bgColor = isDanger ? Colors.red.shade50 : Colors.orange.shade50;
      final accentColor =
          isDanger ? Colors.red.shade300 : Colors.orange.shade300;
      final iconColor =
          isDanger ? Colors.red.shade400 : Colors.orange.shade400;
      final titleColor =
          isDanger ? Colors.red.shade700 : Colors.orange.shade700;
      final icon =
          isDanger ? Icons.shield_outlined : Icons.warning_amber_rounded;
      final title = isDanger
          ? 'Món này không phù hợp với hồ sơ sức khỏe của bạn'
          : 'Cảnh báo dị ứng';
      final body = isDanger
          ? 'Chứa: ${matchedAllergens.join(", ")} — bạn đã khai báo dị ứng với các thành phần này'
          : 'Món này có thể chứa: ${matchedAllergens.join(", ")}. Vui lòng cân nhắc trước khi đặt.';

      return Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border(
            left: BorderSide(color: accentColor, width: 3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: iconColor, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // State 2: General allergen tags (no personalized health risk)
    if (allergenTags.isNotEmpty) {
      return Container(
        margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border(
            left: BorderSide(color: Colors.orange.shade200, width: 3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.info_outline, color: Colors.orange.shade300, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Lưu ý dị ứng',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Món này có chứa: ${allergenTags.join(", ")}. Kiểm tra kỹ nếu bạn có tiền sử dị ứng.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // State 3: Nothing to show
    return const SizedBox.shrink();
  }

  Widget _buildAICard() {
    final healthTags = _product?['healthTags'] as List<dynamic>?;
    if (healthTags == null || healthTags.isEmpty) {
      return const SizedBox.shrink();
    }

    final riskLevel = _healthRisk?['level'] as String?;
    if (riskLevel == 'warning' || riskLevel == 'danger') {
      return const SizedBox.shrink();
    }

    const Color emerald50 = Color(0xFFECFDF5);
    const Color emerald100 = Color(0xFFD1FAE5);
    const Color emerald500 = Color(0xFF10B981);
    const Color emerald800 = Color(0xFF065F46);

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [emerald50, Colors.teal[50]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: emerald100),
        boxShadow: [
          BoxShadow(
            color: emerald500.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: emerald500,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.shield_outlined,
                  color: Colors.white,
                  size: 14,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'NutriAI™ Khuyên dùng',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 13.5,
                  color: emerald500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Món ăn được trí tuệ nhân tạo phân tích thành phần, đảm bảo an toàn cho hồ sơ sức khỏe của bạn.',
            style: TextStyle(
              fontSize: 12,
              color: emerald800,
              height: 1.4,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: healthTags.map((tag) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: emerald100),
                ),
                child: Text(
                  tag.toString().toUpperCase(),
                  style: const TextStyle(
                    color: emerald500,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildIngredientsSection() {
    final names = _getIngredientNames();
    if (names.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(
              Icons.restaurant_menu_rounded,
              color: AppColors.primary,
              size: 18,
            ),
            SizedBox(width: 8),
            Text(
              'Nguyên liệu',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey[200]!),
          ),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: names.map((name) {
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.15),
                  ),
                ),
                child: Text(
                  name,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 12.5,
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // ── Reviews Section ──

  Widget _buildReviewsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Đánh giá',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            if (_reviews.isNotEmpty)
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 18),
                  const SizedBox(width: 4),
                  Text(
                    (_product?['rating'] as num?)?.toStringAsFixed(1) ?? '0.0',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '(${_reviews.length})',
                    style: TextStyle(color: Colors.grey[500], fontSize: 13),
                  ),
                ],
              ),
          ],
        ),
        const SizedBox(height: 16),

        if (_isLoadingReviews && _reviews.isEmpty)
          _buildReviewsShimmer()
        else if (_reviews.isEmpty)
          _buildEmptyReviews()
        else
          ...List.generate(_reviews.length, (i) {
            final review = _reviews[i];
            final isLast = i == _reviews.length - 1;
            return Column(
              children: [
                _buildReviewCard(review),
                if (!isLast) const Divider(height: 24),
              ],
            );
          }),

        // Load more button
        if (_hasMoreReviews && _reviews.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _isLoadingReviews
                    ? null
                    : () => _loadReviews(loadMore: true),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoadingReviews
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'Xem thêm đánh giá',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review) {
    final userData = review['userId'] as Map<String, dynamic>?;
    final username = userData?['username'] as String? ?? 'Người dùng';
    final avatar = userData?['avatar'] as String?;
    final rating = review['rating'] as int? ?? 5;
    final comment = review['comment'] as String?;
    final createdAt = review['createdAt'] as String?;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius: 20,
            backgroundColor: Colors.orange[100],
            backgroundImage: avatar != null && avatar.isNotEmpty
                ? CachedNetworkImageProvider(avatar)
                : null,
            child: avatar == null || avatar.isEmpty
                ? Icon(Icons.person, color: Colors.orange[400], size: 20)
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      username,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      _formatReviewDate(createdAt),
                      style: TextStyle(color: Colors.grey[400], fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // Stars
                Row(
                  children: List.generate(5, (i) {
                    return Icon(
                      i < rating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 16,
                    );
                  }),
                ),
                if (comment != null && comment.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    comment,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[700],
                      height: 1.4,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatReviewDate(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inDays > 30) {
        return '${date.day}/${date.month}/${date.year}';
      } else if (diff.inDays > 0) {
        return '${diff.inDays} ngày trước';
      } else if (diff.inHours > 0) {
        return '${diff.inHours} giờ trước';
      } else {
        return '${diff.inMinutes} phút trước';
      }
    } catch (_) {
      return '';
    }
  }

  Widget _buildEmptyReviews() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          Icon(Icons.rate_review_outlined, size: 48, color: Colors.grey[300]),
          const SizedBox(height: 12),
          Text(
            'Chưa có đánh giá',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewsShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: Column(
        children: List.generate(
          3,
          (i) => Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 14,
                        width: 120,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 12,
                        width: 80,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 12,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        MediaQuery.of(context).padding.bottom + 12,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Colors.orange.shade100, width: 0.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Quantity selector
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.remove_rounded, size: 20),
                  onPressed: _quantity > 1
                      ? () => setState(() => _quantity--)
                      : null,
                  color: _quantity > 1 ? AppColors.primary : AppColors.textHint,
                ),
                Text(
                  '$_quantity',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_rounded, size: 20),
                  onPressed: () => setState(() => _quantity++),
                  color: AppColors.primary,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Add to Cart Button (Outlined)
          Expanded(
            child: SizedBox(
              height: 52,
              child: OutlinedButton(
                onPressed: (_isAddingToCart || _isBuyingNow)
                    ? null
                    : _addToCart,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  foregroundColor: AppColors.primary,
                ),
                child: _isAddingToCart
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      )
                    : const Text(
                        'Thêm vào giỏ',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Buy Now Button (Solid)
          Expanded(
            child: SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: (_isAddingToCart || _isBuyingNow) ? null : _buyNow,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 0,
                ),
                child: _isBuyingNow
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        'Mua ngay - ${Formatters.compactCurrency(_totalPrice)}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimilarProductsSection() {
    if (_isLoadingSimilar) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator(strokeWidth: 3)),
      );
    }
    if (_similarProducts.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 24, 20, 12),
          child: Row(
            children: [
              Icon(
                Icons.restaurant_rounded,
                color: AppColors.primary,
                size: 18,
              ),
              SizedBox(width: 8),
              Text(
                'Món ăn tương tự',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 225,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _similarProducts.length,
            itemBuilder: (context, index) {
              final itemJson = _similarProducts[index];
              final product = ProductModel.fromJson(itemJson).toEntity();
              return SizedBox(
                width: 146,
                child: ProductGridCard(
                  product: product,
                  isAllergic: false,
                  onTap: () {
                    context.push('/food/${product.id}');
                  },
                  onAddToCart: () {
                    // Quick add to cart requires ProductModel so we parse it again or cast
                    final model = ProductModel.fromJson(itemJson);
                    _quickAddToCart(model);
                  },
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 100),
      ],
    );
  }
}
