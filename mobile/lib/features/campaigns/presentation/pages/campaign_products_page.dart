import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/features/cart/presentation/blocs/cart_cubit.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/shared/widgets/product_grid_card.dart';
import 'package:foa_mobile/features/products/data/models/product_model.dart';

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

  List<Map<String, dynamic>> _activeCampaigns = [];
  late String _selectedCampaignId;
  List<String> _userAllergies = [];

  @override
  void initState() {
    super.initState();
    _selectedCampaignId = widget.id;
    _userAllergies = LocalStorage.selectedAllergies;
    _loadCampaign();
    _loadAllActiveCampaigns();
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
      final response = await _dio.get(ApiEndpoints.campaignById(_selectedCampaignId));
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
            final originalPrice = (product['price'] as num?)?.toDouble() ?? 0;
            final fixedPrice = (p['fixedPrice'] as num?)?.toDouble();
            final discount = (p['discount'] as num?)?.toDouble();

            double campaignPrice = originalPrice;
            if (fixedPrice != null) {
              campaignPrice = fixedPrice;
            } else if (discount != null) {
              campaignPrice = originalPrice * (100 - discount) / 100;
            }

            product['originalPrice'] = originalPrice;
            product['price'] = campaignPrice;
            product['campaignFixedPrice'] = fixedPrice;
            product['campaignDiscount'] = discount;
            return product;
          })
          .toList();

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

  Future<void> _loadAllActiveCampaigns() async {
    try {
      final response = await _dio.get(ApiEndpoints.campaigns);
      final data = response.data;
      final List<dynamic> raw = data is Map
          ? (data['data'] as List<dynamic>? ?? [])
          : (data as List<dynamic>? ?? []);
      final list = raw.map((e) => e as Map<String, dynamic>).toList();
      final now = DateTime.now();
      final active = list.where((c) {
        final startTimeStr = c['startTime'] as String?;
        final endTimeStr = c['endTime'] as String?;
        if (startTimeStr == null || endTimeStr == null) return false;
        final start = DateTime.parse(startTimeStr);
        final end = DateTime.parse(endTimeStr);
        final status = c['status'] as String?;
        final products = c['products'] as List<dynamic>? ?? [];
        return status == 'approved' &&
            now.isAfter(start) &&
            now.isBefore(end) &&
            products.isNotEmpty;
      }).toList();

      if (mounted) {
        setState(() {
          _activeCampaigns = active;
        });
      }
    } catch (_) {}
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



  void _addToCart(Map<String, dynamic> product) async {
    try {
      await _dio.post(
        ApiEndpoints.cartAdd,
        data: {
          'productId': product['_id'],
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
          expandedHeight: 260,
          pinned: true,
          backgroundColor: AppColors.primary,
          flexibleSpace: FlexibleSpaceBar(background: _buildHeader()),
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

        // Multi-Campaign Selector Tabs (if multiple campaigns are active)
        if (_activeCampaigns.length > 1)
          SliverToBoxAdapter(
            child: _buildCampaignTabs(),
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
                childAspectRatio: 0.90,
                crossAxisSpacing: 6,
                mainAxisSpacing: 6,
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

  Widget _buildCampaignTabs() {
    return Container(
      height: 44,
      margin: const EdgeInsets.only(top: 16, bottom: 4),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _activeCampaigns.length,
        itemBuilder: (context, index) {
          final c = _activeCampaigns[index];
          final id = c['_id'] as String? ?? '';
          final name = c['name'] as String? ?? 'Chiến dịch';
          final isSelected = id == _selectedCampaignId;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: InkWell(
              onTap: isSelected
                  ? null
                  : () {
                      setState(() {
                        _selectedCampaignId = id;
                      });
                      _loadCampaign();
                    },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : Colors.transparent,
                    width: 1.2,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.2),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  name,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          );
        },
      ),
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
        top: MediaQuery.of(context).padding.top + 48,
        left: 20,
        right: 20,
        bottom: 12,
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
          const SizedBox(height: 8),
          Text(
            name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white24),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.timer_outlined, color: Colors.white, size: 16),
                const SizedBox(width: 6),
                Text(
                  _remaining == Duration.zero
                      ? 'Đã kết thúc'
                      : 'Kết thúc sau: ${_formatCountdown(_remaining)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${_products.length} sản phẩm',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
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
          Icon(Icons.inventory_2_outlined, size: 80, color: Colors.grey[300]),
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
    final entity = ProductModel.fromJson(product).toEntity();
    final conflictingAllergies = entity.allergenTags
        .where((a) => _userAllergies.contains(a))
        .toList();

    return ProductGridCard(
      product: entity,
      isAllergic: conflictingAllergies.isNotEmpty,
      onTap: () => context.push('/food/${entity.id}'),
      onAddToCart: () => _addToCart(product),
    );
  }
}
