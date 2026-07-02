import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';

/// Campaign products page showing campaign header and discounted products.
class CampaignProductsPage extends StatefulWidget {
  final String id;
  const CampaignProductsPage({super.key, required this.id});

  @override
  State<CampaignProductsPage> createState() => _CampaignProductsPageState();
}

class _CampaignProductsPageState extends State<CampaignProductsPage> {
  final Dio _dio = ApiClient().dio;
  Map<String, dynamic>? _campaign;
  List<Map<String, dynamic>> _products = [];
  bool _isLoading = true;
  String? _error;
  Timer? _countdownTimer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _loadCampaign();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadCampaign() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _dio.get(ApiEndpoints.campaignById(widget.id));
      final data = response.data;
      final campaignData = data is Map<String, dynamic>
          ? (data['data'] as Map<String, dynamic>? ?? data)
          : data is Map
              ? (data['data'] as Map<String, dynamic>? ??
                  Map<String, dynamic>.from(data))
              : <String, dynamic>{};

      // Parse products from campaign
      final productsRaw = campaignData['products'] as List<dynamic>? ?? [];
      final products = productsRaw
          .map((e) => e as Map<String, dynamic>)
          .where((p) => p['productId'] != null)
          .map((p) {
        final product = p['productId'] as Map<String, dynamic>;
        // Merge campaign pricing into product
        product['campaignFixedPrice'] = p['fixedPrice'];
        product['campaignDiscount'] = p['discount'];
        return product;
      }).toList();

      // Calculate remaining time
      final endTimeStr = campaignData['endTime'] as String?;
      if (endTimeStr != null) {
        final endTime = DateTime.parse(endTimeStr);
        _remaining = endTime.difference(DateTime.now());
        if (_remaining.isNegative) _remaining = Duration.zero;
        _startCountdown(endTime);
      }

      setState(() {
        _campaign = campaignData;
        _products = products;
        _isLoading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _isLoading = false;
        if (e.type == DioExceptionType.connectionError) {
          _error = 'Không có kết nối mạng. Vui lòng kiểm tra lại.';
        } else if (e.response?.statusCode == 404) {
          _error = 'Không tìm thấy chiến dịch này.';
        } else {
          _error = 'Không thể tải chiến dịch. Vui lòng thử lại.';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Đã xảy ra lỗi. Vui lòng thử lại.';
      });
    }
  }

  void _startCountdown(DateTime endTime) {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      final remaining = endTime.difference(DateTime.now());
      if (remaining.isNegative) {
        _countdownTimer?.cancel();
        setState(() => _remaining = Duration.zero);
      } else {
        setState(() => _remaining = remaining);
      }
    });
  }

  String _formatCountdown(Duration d) {
    if (d.isNegative || d == Duration.zero) return 'Đã kết thúc';
    final days = d.inDays;
    final hours = d.inHours.remainder(24);
    final minutes = d.inMinutes.remainder(60);
    final seconds = d.inSeconds.remainder(60);
    if (days > 0) {
      return '$days ngày ${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    }
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  double _getCampaignPrice(Map<String, dynamic> product) {
    final originalPrice = (product['price'] as num?)?.toDouble() ?? 0;
    final fixedPrice = (product['campaignFixedPrice'] as num?)?.toDouble();
    final discount = (product['campaignDiscount'] as num?)?.toDouble();
    if (fixedPrice != null) return fixedPrice;
    if (discount != null) return originalPrice * (100 - discount) / 100;
    return originalPrice;
  }

  void _addToCart(Map<String, dynamic> product) async {
    try {
      await _dio.post(ApiEndpoints.cartAdd, data: {
        'productId': product['_id'],
        'quantity': 1,
        'price': product['price'],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã thêm "${product['name']}" vào giỏ hàng'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] as String? ??
          'Không thể thêm vào giỏ hàng';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
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
              ? AppErrorWidget(message: _error!, onRetry: _loadCampaign)
              : _buildContent(),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: Column(
        children: [
          Container(height: 200, color: Colors.white),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.72,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: 4,
              itemBuilder: (_, _) => Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return CustomScrollView(
      slivers: [
        // Campaign header
        SliverAppBar(
          expandedHeight: 220,
          pinned: true,
          backgroundColor: AppColors.primary,
          flexibleSpace: FlexibleSpaceBar(
            background: _buildHeader(),
          ),
          leading: Container(
            margin: const EdgeInsets.all(8),
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

        // Products grid
        if (_products.isEmpty)
          SliverFillRemaining(child: _buildEmptyState())
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(12, 16, 12, 80),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.72,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) => _buildGridItem(_products[index]),
                childCount: _products.length,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHeader() {
    final name = _campaign?['name'] as String? ?? 'Chiến dịch';
    final type = _campaign?['type'] as String? ?? '';

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary,
            AppColors.primary.withValues(alpha: 0.8),
            Colors.deepOrange,
          ],
        ),
      ),
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 56,
        left: 20,
        right: 20,
        bottom: 24,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          if (type.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _getTypeLabel(type),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(height: 12),
          Text(
            name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.timer_outlined,
                  color: Colors.white70, size: 16),
              const SizedBox(width: 6),
              Text(
                _remaining == Duration.zero
                    ? 'Đã kết thúc'
                    : 'Kết thúc sau: ${_formatCountdown(_remaining)}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${_products.length} sản phẩm',
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  String _getTypeLabel(String type) {
    switch (type) {
      case 'flash_sale':
        return 'Flash Sale';
      case 'seasonal':
        return 'Theo mùa';
      case 'combo':
        return 'Combo ưu đãi';
      default:
        return type;
    }
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined,
              size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'Chiến dịch chưa có sản phẩm',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Vui lòng quay lại sau',
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildGridItem(Map<String, dynamic> product) {
    final name = product['name'] as String? ?? 'Món ăn';
    final originalPrice = (product['price'] as num?)?.toDouble() ?? 0;
    final campaignPrice = _getCampaignPrice(product);
    final image = product['image'] as String?;
    final rating = (product['rating'] as num?)?.toDouble();
    final isAvailable = product['isAvailable'] as bool? ?? true;
    final hasDiscount = campaignPrice < originalPrice;

    return GestureDetector(
      onTap: () => context.push('/food/${product['_id']}'),
      child: Container(
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
              flex: 6,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16)),
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
                              child: const Icon(Icons.restaurant,
                                  color: AppColors.primary, size: 40),
                            ),
                          )
                        : Container(
                            color: Colors.orange[50],
                            child: const Icon(Icons.restaurant,
                                color: AppColors.primary, size: 40),
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
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    if (hasDiscount)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '-${((originalPrice - campaignPrice) / originalPrice * 100).round()}%',
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
                        bottom: 6,
                        right: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star,
                                  color: Colors.amber, size: 12),
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
                    // Campaign badge
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.local_offer,
                                color: Colors.white, size: 10),
                            SizedBox(width: 2),
                            Text(
                              'KM',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
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
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          Formatters.compactCurrency(campaignPrice),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                        if (hasDiscount) ...[
                          const SizedBox(width: 4),
                          Text(
                            Formatters.compactCurrency(originalPrice),
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey[400],
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (isAvailable)
                          GestureDetector(
                            onTap: () => _addToCart(product),
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.add,
                                  color: Colors.white, size: 18),
                            ),
                          ),
                      ],
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
