import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/features/cart/presentation/blocs/cart_cubit.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// AI-powered product suggestions page with recommendations, safe foods, and trending.
class AiSuggestionsPage extends StatefulWidget {
  const AiSuggestionsPage({super.key});

  @override
  State<AiSuggestionsPage> createState() => _AiSuggestionsPageState();
}

class _AiSuggestionsPageState extends State<AiSuggestionsPage> {
  final Dio _dio = ApiClient().dio;

  List<Map<String, dynamic>> _recommendations = [];
  List<Map<String, dynamic>> _safeFoods = [];
  List<Map<String, dynamic>> _trending = [];
  List<String> _userAllergies = [];
  bool _hasPreferences = false;
  bool _isLoading = true;
  String? _error;
  final Set<String> _addingToCart = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Load user allergies from local storage
      final allergies = LocalStorage.selectedAllergies;
      final hasPrefs = allergies.isNotEmpty;

      // Fetch all data individually with error handling
      dynamic recResponse;
      dynamic safeResponse;
      dynamic prodResponse;
      try {
        recResponse = await _dio.get(ApiEndpoints.recommendations);
      } catch (_) {}
      try {
        safeResponse = await _dio.get(ApiEndpoints.safeFoods);
      } catch (_) {}
      try {
        prodResponse = await _dio.get(ApiEndpoints.products);
      } catch (_) {}

      // Parse recommendations
      List<Map<String, dynamic>> recommendations = [];
      if (recResponse != null) {
        final recData = recResponse.data;
        final recList = recData is Map
            ? (recData['data'] as List<dynamic>? ?? [])
            : (recData as List<dynamic>? ?? []);
        recommendations = recList
            .map((e) => e as Map<String, dynamic>)
            .where((p) => p['status'] == 'active' || p['status'] == null)
            .toList();
      }

      // Parse safe foods
      List<Map<String, dynamic>> safeFoods = [];
      if (safeResponse != null) {
        final safeData = safeResponse.data;
        final safeList = safeData is Map
            ? (safeData['data'] as List<dynamic>? ?? [])
            : (safeData as List<dynamic>? ?? []);
        safeFoods = safeList
            .map((e) => e as Map<String, dynamic>)
            .where((p) => p['status'] == 'active' || p['status'] == null)
            .toList();
      }

      // Parse all products for trending (sort by salesCount or rating)
      List<Map<String, dynamic>> trending = [];
      if (prodResponse != null) {
        final prodData = prodResponse.data;
        final prodList = prodData is Map
            ? (prodData['data'] as List<dynamic>? ?? [])
            : (prodData as List<dynamic>? ?? []);
        final allProducts = prodList
            .map((e) => e as Map<String, dynamic>)
            .where((p) => p['status'] == 'active' || p['status'] == null)
            .toList();

        // Sort by sales count or rating for trending
        allProducts.sort((a, b) {
          final aSales = (a['salesCount'] as num?)?.toDouble() ?? 0;
          final bSales = (b['salesCount'] as num?)?.toDouble() ?? 0;
          if (aSales != bSales) return bSales.compareTo(aSales);
          final aRating = (a['rating'] as num?)?.toDouble() ?? 0;
          final bRating = (b['rating'] as num?)?.toDouble() ?? 0;
          return bRating.compareTo(aRating);
        });
        trending = allProducts.take(10).toList();
      }

      setState(() {
        _recommendations = recommendations;
        _safeFoods = safeFoods;
        _trending = trending;
        _userAllergies = allergies;
        _hasPreferences = hasPrefs;
        _isLoading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        if (e.type == DioExceptionType.connectionError) {
          _error = 'Không có kết nối mạng. Vui lòng kiểm tra lại.';
        } else {
          _error = 'Không thể tải gợi ý. Vui lòng thử lại sau.';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Đã xảy ra lỗi. Vui lòng thử lại.';
      });
    }
  }

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
        return 'Mực';
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
        return 'Gluten';
      case 'allium':
        return 'Hành/Tỏi';
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

  Future<void> _addToCart(Map<String, dynamic> product) async {
    final productId = product['_id'] as String? ?? '';
    if (productId.isEmpty) return;

    setState(() => _addingToCart.add(productId));

    try {
      await _dio.post(
        ApiEndpoints.cartAdd,
        data: {
          'productId': productId,
          'quantity': 1,
          'price': product['price'],
        },
      );
      if (mounted) {
        unawaited(context.read<CartCubit>().loadCart());
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã thêm "${product['name']}" vào giỏ hàng'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            duration: const Duration(seconds: 1),
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
    } finally {
      if (mounted) setState(() => _addingToCart.remove(productId));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Gợi ý từ trợ lý AI')),
      body: _isLoading
          ? _buildShimmer()
          : _error != null
          ? AppErrorWidget(message: _error!, onRetry: _loadData)
          : RefreshIndicator(onRefresh: _loadData, child: _buildContent()),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 80,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 24),
            Container(
              height: 20,
              width: 150,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 3,
                itemBuilder: (_, _) => Container(
                  width: 150,
                  margin: const EdgeInsets.only(right: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Container(
              height: 20,
              width: 150,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 3,
                itemBuilder: (_, _) => Container(
                  width: 150,
                  margin: const EdgeInsets.only(right: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Health/allergy info card
          if (_hasPreferences) _buildHealthCard(),

          // If no preferences, show setup prompt
          if (!_hasPreferences) _buildPreferencesPrompt(),

          // Section 1: Recommendations
          if (_recommendations.isNotEmpty) ...[
            const SizedBox(height: 20),
            _buildSectionHeader(
              'Gợi ý cho bạn',
              Icons.auto_awesome,
              AppColors.primary,
            ),
            const SizedBox(height: 10),
            _buildHorizontalProductList(_recommendations),
          ],

          // Section 2: Safe foods
          if (_safeFoods.isNotEmpty) ...[
            const SizedBox(height: 24),
            _buildSectionHeader(
              'Món ăn an toàn',
              Icons.shield_rounded,
              AppColors.success,
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              child: Text(
                'Phù hợp với chế độ ăn uống của bạn',
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              ),
            ),
            const SizedBox(height: 4),
            _buildHorizontalProductList(_safeFoods),
          ],

          // Section 3: Trending
          if (_trending.isNotEmpty) ...[
            const SizedBox(height: 24),
            _buildSectionHeader(
              'Xu hướng',
              Icons.trending_up_rounded,
              Colors.red,
            ),
            const SizedBox(height: 10),
            _buildHorizontalProductList(_trending),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildHealthCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary.withValues(alpha: 0.08), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.favorite_outline_rounded,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                'Hồ sơ sức khỏe của bạn',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          if (_userAllergies.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _userAllergies
                  .map(
                    (a) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.orange[100]!),
                      ),
                      child: Text(
                        'Dị ứng: ${_getAllergenLabel(a)}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.orange[800],
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 8),
          InkWell(
            onTap: () => context.push('/profile/health'),
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Text(
                    'Cập nhật sở thích',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary.withValues(alpha: 0.8),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 12,
                    color: AppColors.primary.withValues(alpha: 0.6),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreferencesPrompt() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        children: [
          Icon(
            Icons.tune_rounded,
            size: 48,
            color: AppColors.primary.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 12),
          const Text(
            'Cài đặt sở thích để nhận gợi ý',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Cho chúng tôi biết về sở thích ăn uống và dị ứng của bạn\nđể nhận được gợi ý phù hợp nhất.',
            style: TextStyle(fontSize: 13, color: Colors.grey[500]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: 200,
            child: ElevatedButton.icon(
              onPressed: () => context.push('/profile/health'),
              icon: const Icon(Icons.settings_rounded, size: 18),
              label: const Text('Cài đặt ngay'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildHorizontalProductList(List<Map<String, dynamic>> products) {
    return SizedBox(
      height: 240,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.only(left: 2, right: 2),
        itemCount: products.length,
        itemBuilder: (context, index) {
          return _buildProductCard(products[index]);
        },
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    final name = product['name'] as String? ?? 'Món ăn';
    final price = (product['price'] as num?)?.toDouble() ?? 0;
    final image = product['image'] as String?;
    final rating = (product['rating'] as num?)?.toDouble();
    final isAvailable = product['isAvailable'] as bool? ?? true;
    final originalPrice = (product['originalPrice'] as num?)?.toDouble();
    final hasDiscount = originalPrice != null && originalPrice > price;
    final productId = product['_id'] as String? ?? '';
    final isAdding = _addingToCart.contains(productId);

    return GestureDetector(
      onTap: () => context.push('/food/$productId'),
      child: Container(
        width: 150,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              flex: 5,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    image != null && image.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: image,
                            fit: BoxFit.cover,
                            placeholder: (_, _) =>
                                Container(color: Colors.grey[200]),
                            errorWidget: (_, _, _) => Container(
                              color: Colors.orange[50],
                              child: const Icon(
                                Icons.restaurant,
                                color: AppColors.primary,
                                size: 32,
                              ),
                            ),
                          )
                        : Container(
                            color: Colors.orange[50],
                            child: const Icon(
                              Icons.restaurant,
                              color: AppColors.primary,
                              size: 32,
                            ),
                          ),
                    if (!isAvailable)
                      Container(
                        color: Colors.black54,
                        child: const Center(
                          child: Text(
                            'Hết hàng',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    if (hasDiscount)
                      Positioned(
                        top: 6,
                        left: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '-${((originalPrice - price) / originalPrice * 100).round()}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    if (rating != null)
                      Positioned(
                        bottom: 4,
                        right: 4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.star,
                                color: Colors.amber,
                                size: 10,
                              ),
                              const SizedBox(width: 2),
                              Text(
                                rating.toStringAsFixed(1),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            // Info
            Expanded(
              flex: 3,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          Formatters.compactCurrency(price),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                        if (hasDiscount) ...[
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              Formatters.compactCurrency(originalPrice),
                              style: TextStyle(
                                fontSize: 9,
                                color: Colors.grey[400],
                                decoration: TextDecoration.lineThrough,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const Spacer(),
                    if (isAvailable)
                      Align(
                        alignment: Alignment.centerRight,
                        child: GestureDetector(
                          onTap: isAdding ? null : () => _addToCart(product),
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: isAdding
                                  ? AppColors.primary.withValues(alpha: 0.5)
                                  : AppColors.primary,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: isAdding
                                ? const Padding(
                                    padding: EdgeInsets.all(6),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.add,
                                    color: Colors.white,
                                    size: 18,
                                  ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
