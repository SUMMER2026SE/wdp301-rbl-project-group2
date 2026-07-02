import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:shimmer/shimmer.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_cubit.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_state.dart';
import 'package:foa_mobile/features/stores/presentation/widgets/store_selector_bottom_sheet.dart';
import 'package:foa_mobile/shared/widgets/product_grid_card.dart';
import 'package:foa_mobile/features/products/data/models/product_model.dart';
import 'package:foa_mobile/features/home/presentation/widgets/loyalty_preview_section.dart';
import 'package:foa_mobile/features/home/presentation/widgets/recent_orders_section.dart';
import 'package:foa_mobile/features/home/presentation/widgets/review_highlights_section.dart';
import 'package:foa_mobile/features/home/presentation/widgets/voucher_ticket_section.dart';
import 'package:foa_mobile/features/home/presentation/widgets/ai_recommendation_section.dart';


class BannerData {
  final String title;
  final String highlight;
  final String description;
  final String tag;
  final String image;
  final Color highlightColor;

  const BannerData({
    required this.title,
    required this.highlight,
    required this.description,
    required this.tag,
    required this.image,
    required this.highlightColor,
  });
}

/// Home screen with real API data for all sections.
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final PageController _bannerController = PageController(viewportFraction: 0.88, initialPage: 1000);
  int _currentBanner = 1000;
  Timer? _bannerTimer;

  // Rotating search hints
  static const List<String> _searchHints = [
    'Thèm gì hôm nay? Tìm món ngay...',
    'Tìm Mì Quảng, Bún Bò, Cơm Gà...',
    'Bạn muốn ăn gì tối nay?',
    'Khám phá món mới gần bạn...',
    'Gõ tên món để đặt ngay!',
  ];
  int _searchHintIndex = 0;
  Timer? _searchHintTimer;
  List<String> _userAllergies = [];
  Map<String, dynamic>? _selectedStore;
  final Dio _dio = ApiClient().dio;


  // API data
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _recommendations = [];
  List<Map<String, dynamic>> _vouchers = [];
  List<Map<String, dynamic>> _bestSellers = [];
  int _unreadCount = 0;

  Map<String, dynamic>? _membership;
  List<Map<String, dynamic>> _recentOrders = [];
  List<Map<String, dynamic>> _latestReviews = [];

  bool _membershipError = false;
  bool _ordersError = false;
  bool _reviewsError = false;

  bool _isLoading = true;
  String? _error;

  // Sorting and filtering state
  String _sortBy = 'salesCount';
  double? _minPrice;
  double? _maxPrice;
  bool _filterAllergies = false;

  static const List<BannerData> _banners = [
    BannerData(
      title: 'Trứ danh',
      highlight: 'Đặc Sản Phố Hội',
      description: 'Thưởng thức Cao Lầu, Mì Quảng chuẩn vị miền Trung ngay tại nhà. Giảm ngay 20%.',
      tag: 'Best Seller',
      image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&fit=crop',
      highlightColor: Colors.orange,
    ),
    BannerData(
      title: 'Ăn Ngon',
      highlight: 'Dáng Thon - Eo Gọn',
      description: 'Thực đơn Eat-clean được thiết kế riêng. Trợ lý AI tự động cảnh báo dị ứng.',
      tag: 'Healthy & AI',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&fit=crop',
      highlightColor: Colors.teal,
    ),
    BannerData(
      title: 'Giao Hàng',
      highlight: 'Thần Tốc 0đ',
      description: 'Shipper nội bộ giao ngay món nóng hổi trong 30 phút. Miễn phí ship bán kính 3km.',
      tag: 'In-house Delivery',
      image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&fit=crop',
      highlightColor: Colors.amber,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadUserAllergies();

    final storeCubit = context.read<StoreCubit>();
    _selectedStore = storeCubit.state.selectedStore;

    _loadData();

    // Check if we need to force select store
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && storeCubit.state.selectedStore == null) {
        _showStoreSelector(isClosable: false);
      }
    });

    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_bannerController.hasClients) {
        _bannerController.animateToPage(
          _currentBanner + 1,
          duration: const Duration(milliseconds: 550),
          curve: Curves.easeInOut,
        );
      }
    });

    _searchHintTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (mounted) {
        setState(() {
          _searchHintIndex = (_searchHintIndex + 1) % _searchHints.length;
        });
      }
    });
  }

  void _loadUserAllergies() {
    _userAllergies = LocalStorage.selectedAllergies;
  }

  Future<void> _addToCart(Map<String, dynamic> product) async {
    final productId = product['_id'] as String? ?? '';
    if (productId.isEmpty) return;

    try {
      await _dio.post(ApiEndpoints.cartAdd, data: {
        'productId': productId,
        'quantity': 1,
      });
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã thêm "${product['name'] ?? ''}" vào giỏ hàng!'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          action: SnackBarAction(
            label: 'Xem giỏ',
            textColor: Colors.white,
            onPressed: () => context.push('/cart'),
          ),
        ),
      );
    } on DioException catch (e) {
      final msg = e.response?.data is Map
          ? ((e.response!.data as Map)['message'] as String? ?? 'Không thể thêm vào giỏ hàng')
          : 'Không thể thêm vào giỏ hàng';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Không thể thêm vào giỏ hàng'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      _membershipError = false;
      _ordersError = false;
      _reviewsError = false;

      // Fetch all APIs - run in parallel for speed
      // Run all API calls safely — null means that call failed
      Future<dynamic> safeCall(Future<dynamic> call) async {
        try {
          return await call;
        } catch (_) {
          return null;
        }
      }

      final results = await Future.wait([
        safeCall(_dio.get(ApiEndpoints.productCategories)),
        safeCall(_dio.get(ApiEndpoints.products, queryParameters: {'limit': 20})),
        safeCall(_dio.get(ApiEndpoints.recommendations, queryParameters: _selectedStore != null ? {'storeId': _selectedStore!['_id']} : null)),
        safeCall(_dio.get(ApiEndpoints.vouchers)),
        safeCall(_dio.get(ApiEndpoints.notificationsUnreadCount)),
        safeCall(_dio.get(ApiEndpoints.products, queryParameters: {'sort': 'rating', 'limit': 4, 'isAvailable': true})),
        safeCall(_dio.get(ApiEndpoints.userMembership)),
        safeCall(_dio.get(ApiEndpoints.myOrders, queryParameters: {'limit': 3, 'sort': '-createdAt'})),
        safeCall(_dio.get(ApiEndpoints.featuredReviews, queryParameters: {'limit': 5})),
      ]);

      if (!mounted) return;

      // Helper to parse list response
      List<Map<String, dynamic>> parseList(dynamic response) {
        if (response == null) return [];
        final data = response.data;
        final raw = data is Map
            ? (data['data'] as List<dynamic>? ?? [])
            : (data as List<dynamic>? ?? []);
        return raw.map((e) => e as Map<String, dynamic>).toList();
      }

      // Parse categories. Backend returns distinct category values, often List<String>.
      final catResponse = results[0];
      final catData = catResponse?.data;
      final catRaw = catData is Map
          ? (catData['data'] as List<dynamic>? ?? [])
          : (catData as List<dynamic>? ?? []);
      final categories = catRaw.map((e) {
        if (e is String) {
          return {'id': e, 'name': e};
        }
        if (e is Map<String, dynamic>) {
          return {
            'id': e['_id'] as String? ?? e['name'] as String? ?? '',
            'name': e['name'] as String? ?? e['_id'] as String? ?? '',
          };
        }
        return {'id': e.toString(), 'name': e.toString()};
      }).toList();

      // Parse products (for flash sale — sort by salesCount)
      var productsRaw = parseList(results[1])
          .where((p) => p['status'] == 'active' || p['status'] == null)
          .toList();
      final uniqueProducts = <String, Map<String, dynamic>>{};
      for (final p in productsRaw) {
        final id = p['_id'] as String? ?? '';
        if (id.isNotEmpty) {
          uniqueProducts[id] = p;
        }
      }
      var products = uniqueProducts.values.toList();
      products.sort((a, b) {
        final aSales = (a['salesCount'] as num?)?.toDouble() ?? 0;
        final bSales = (b['salesCount'] as num?)?.toDouble() ?? 0;
        return bSales.compareTo(aSales);
      });

      // Parse recommendations. Backend returns [{ product, aiReason, healthScore }].
      final recommendations = parseList(results[2])
          .map((item) {
            final product = item['product'];
            if (product is Map<String, dynamic>) {
              return {
                ...product,
                'aiReason': item['aiReason'],
                'healthScore': item['healthScore'],
              };
            }
            return item;
          })
          .where((p) => p['status'] == 'active' || p['status'] == null)
          .toList();

      // Parse vouchers
      final vouchers = parseList(results[3]);

      // Parse unread count
      int unreadCount = 0;
      final notifResponse = results[4];
      if (notifResponse != null) {
        final d = notifResponse.data;
        if (d is Map) {
          final dataField = d['data'];
          // Backend returns { data: { count: N } }
          if (dataField is Map) {
            unreadCount = (dataField['count'] as int?) ?? 0;
          } else {
            unreadCount = (dataField as int?) ?? 0;
          }
        }
      }

      // Parse best sellers
      final bestSellersRaw = parseList(results[5])
          .where((p) => p['status'] == 'active' || p['status'] == null)
          .toList();
      final uniqueBestSellers = <String, Map<String, dynamic>>{};
      for (final p in bestSellersRaw) {
        final id = p['_id'] as String? ?? '';
        if (id.isNotEmpty) {
          uniqueBestSellers[id] = p;
        }
      }
      final bestSellers = uniqueBestSellers.values.toList();

      // Parse membership
      Map<String, dynamic>? membership;
      final memRes = results[6];
      if (memRes != null) {
        membership = memRes.data['data'] as Map<String, dynamic>? ?? memRes.data as Map<String, dynamic>;
      } else {
        _membershipError = true;
      }

      // Parse recent orders
      List<Map<String, dynamic>> recentOrders = [];
      final ordersRes = results[7];
      if (ordersRes != null) {
        final data = ordersRes.data;
        final raw = data is Map ? ((data['data'] ?? data['orders']) as List<dynamic>? ?? []) : (data as List<dynamic>? ?? []);
        recentOrders = raw.map((e) => e as Map<String, dynamic>).toList();
      } else {
        _ordersError = true;
      }

      // Parse reviews
      List<Map<String, dynamic>> latestReviews = [];
      final revRes = results[8];
      if (revRes != null) {
        final data = revRes.data;
        final raw = data is Map ? (data['data'] as List<dynamic>? ?? []) : (data as List<dynamic>? ?? []);
        latestReviews = raw.map((e) => e as Map<String, dynamic>).toList();
      } else {
        _reviewsError = true;
      }

      setState(() {
        _categories = categories;
        _products = products;
        _recommendations = recommendations;
        _vouchers = vouchers;
        _unreadCount = unreadCount;
        _bestSellers = bestSellers;
        _membership = membership;
        _recentOrders = recentOrders;
        _latestReviews = latestReviews;
        _isLoading = false;
      });
    } on DioException catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Không thể tải dữ liệu. Vui lòng thử lại.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = 'Đã xảy ra lỗi. Vui lòng thử lại.';
        });
      }
    }
  }

  Future<void> _showStoreSelector({bool isClosable = true}) async {
    await showModalBottomSheet(
      context: context,
      isDismissible: isClosable,
      enableDrag: isClosable,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StoreSelectorBottomSheet(isClosable: isClosable);
      },
    );
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    _searchHintTimer?.cancel();
    _bannerController.dispose();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    final filteredProducts = getFilteredProducts(_products);
    final filteredBestSellers = getFilteredProducts(_bestSellers);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: BlocListener<StoreCubit, StoreState>(
          listenWhen: (previous, current) =>
              previous.selectedStore?['_id'] != current.selectedStore?['_id'],
          listener: (context, state) {
            setState(() {
              _selectedStore = state.selectedStore;
            });
            _loadData(); // Re-fetch products when store changes
          },
          child: BlocBuilder<StoreCubit, StoreState>(
            builder: (context, state) {
              _selectedStore = state.selectedStore;

              if (_isLoading) return _buildShimmer();
              if (_error != null) return _buildError();

              return RefreshIndicator(
                onRefresh: _loadData,
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    // Scrollable Brand Header
                    SliverToBoxAdapter(
                      child: _buildLogoHeader(),
                    ),
                    
                    // Sticky Location & Search/Filter Header
                    SliverPersistentHeader(
                      pinned: true,
                      delegate: _StickyHeaderDelegate(
                        height: 124.0,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _buildAddressPill(),
                            _buildSearchBox(),
                          ],
                        ),
                      ),
                    ),
                    
                    // Main Content
                    SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildBannerCarousel(),
                          
                          // Flash Sale (Now displayed below Banner Carousel, above Category Section)
                          if (filteredProducts.isNotEmpty) ...[
                            _buildFlashSaleSectionHeader(),
                            _buildProductGrid(filteredProducts),
                          ],
                          
                          // AI Recommendations
                          if (_recommendations.isNotEmpty)
                            AiRecommendationSection(
                              recommendations: _recommendations,
                              userAllergies: _userAllergies,
                              onTap: (id) => context.push('/food/$id'),
                              onAddToCart: _addToCart,
                              onViewAll: () => context.push('/ai-suggestions'),
                            ),

                          // Category Section (Below AI Recommendations)
                          if (_categories.isNotEmpty) _buildCategorySection(),

                          // Best Seller Section (Below Category)
                          if (filteredBestSellers.isNotEmpty) ...[
                            _buildBestSellerSectionHeader(),
                            _buildProductGrid(filteredBestSellers),
                          ],

                          // Vouchers
                          if (_vouchers.isNotEmpty)
                            VoucherTicketSection(vouchers: _vouchers),

                          // Loyalty Preview (only if authenticated)
                          if (context.read<AuthBloc>().state is AuthAuthenticated)
                            LoyaltyPreviewSection(
                              membership: _membership,
                              isError: _membershipError,
                              onRetry: _loadData,
                            ),

                          // Recent Orders
                          RecentOrdersSection(
                            recentOrders: _recentOrders,
                            isError: _ordersError,
                            onRetry: _loadData,
                            onAddToCart: _addToCart,
                          ),

                          // Review Highlights
                          ReviewHighlightsSection(
                            reviews: _latestReviews,
                            isError: _reviewsError,
                            onRetry: _loadData,
                          ),

                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildShimmer() {
    return SingleChildScrollView(
      child: Shimmer.fromColors(
        baseColor: AppColors.shimmerBase,
        highlightColor: AppColors.shimmerHighlight,
        child: Column(
          children: [
            Container(height: 60, color: Colors.white),
            Container(height: 50, margin: const EdgeInsets.all(16), color: Colors.white),
            Container(height: 160, margin: const EdgeInsets.symmetric(horizontal: 16), color: Colors.white),
            const SizedBox(height: 16),
            Container(height: 80, margin: const EdgeInsets.symmetric(horizontal: 16), color: Colors.white),
            const SizedBox(height: 16),
            Container(height: 220, margin: const EdgeInsets.symmetric(horizontal: 16), color: Colors.white),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, color: AppColors.textSecondary)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh, size: 20),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoHeader() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Row(
        children: [
          // Logo + brand name + subtitle
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Offset(-5, 0): kéo logo sang trái 5px để bớt khoảng trống bên TRÁI logo
                  // → Tăng số (vd: -8) = kéo nhiều hơn sang trái
                  // → Giảm số (vd: -2) = kéo ít hơn
                  Transform.translate(
                    offset: const Offset(-28, 0),
                    child: Image.asset(
                      'assets/images/logo.png',
                      height: 40,
                      fit: BoxFit.contain,
                    ),
                  ),
                  // Offset(-10, 0): kéo chữ FoodieDash sang trái 10px để bớt khoảng trống bên PHẢI logo
                  // → Tăng số (vd: -14) = kéo chữ sát logo hơn
                  // → Giảm số (vd: -6) = giữ khoảng cách nhiều hơn
                  Transform.translate(
                    offset: const Offset(-42, 0),
                    child: const Text(
                      'FoodieDash',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              const Text(
                'Đặt món ngon, giao siêu tốc!',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const Spacer(),
          
          // Notification Icon
          IconButton(
            icon: Badge(
              isLabelVisible: _unreadCount > 0,
              label: _unreadCount > 0
                  ? Text('$_unreadCount',
                      style: const TextStyle(fontSize: 10, color: Colors.white))
                      : null,
              child: const Icon(Icons.notifications_outlined, color: AppColors.textPrimary),
            ),
            onPressed: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),
          
          // User Avatar with AuthBloc
          BlocBuilder<AuthBloc, AuthState>(
            builder: (context, authState) {
              String initials = '';
              String? avatarUrl;
              if (authState is AuthAuthenticated) {
                final name = authState.username;
                if (name.isNotEmpty) {
                  initials = name[0].toUpperCase();
                }
                avatarUrl = authState.user['avatar'] as String?;
              }
              
              Widget avatarChild = initials.isNotEmpty
                  ? Text(
                      initials,
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    )
                  : const Icon(Icons.person, color: AppColors.primary, size: 18);
              
              return GestureDetector(
                onTap: () => context.push('/profile'),
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                  child: avatarUrl != null && avatarUrl.isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: CachedNetworkImage(
                            imageUrl: avatarUrl,
                            width: 36,
                            height: 36,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => avatarChild,
                            errorWidget: (context, url, error) => avatarChild,
                          ),
                        )
                      : avatarChild,
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAddressPill() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: GestureDetector(
        onTap: _showStoreSelector,
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.location_on,
                color: AppColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _selectedStore != null
                        ? (_selectedStore!['name'] ?? 'Chi nhánh')
                        : 'Chi nhánh',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _selectedStore != null
                        ? (_selectedStore!['address'] ?? 'Chọn chi nhánh giao hàng...')
                        : 'Chọn chi nhánh giao hàng...',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right,
              color: AppColors.textSecondary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  // ── Search Box ──

  Widget _buildSearchBox() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: GestureDetector(
        onTap: () => context.push('/menu?search='),
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.10),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.18),
              width: 1.2,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.search_rounded, color: AppColors.primary, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 400),
                  transitionBuilder: (child, animation) {
                    return FadeTransition(
                      opacity: animation,
                      child: SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0, 0.3),
                          end: Offset.zero,
                        ).animate(animation),
                        child: child,
                      ),
                    );
                  },
                  child: Text(
                    _searchHints[_searchHintIndex],
                    key: ValueKey<int>(_searchHintIndex),
                    style: const TextStyle(
                      color: AppColors.textHint,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Banner Carousel ──

  Widget _buildBannerCarousel() {
    return Container(
      height: 200,
      margin: const EdgeInsets.only(bottom: 16),
      child: Stack(
        children: [
          PageView.builder(
            controller: _bannerController,
            onPageChanged: (idx) => setState(() => _currentBanner = idx),
            itemCount: null, // infinite scroll
            itemBuilder: (context, index) {
              final banner = _banners[index % _banners.length];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    children: [
                      CachedNetworkImage(
                        imageUrl: banner.image,
                        fit: BoxFit.cover,
                        width: double.infinity, height: double.infinity,
                        placeholder: (_, _) => Container(color: Colors.grey[300]),
                        errorWidget: (_, _, _) => Container(color: Colors.orange[200]),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.black.withValues(alpha: 0.85),
                              Colors.black.withValues(alpha: 0.2),
                            ],
                            begin: Alignment.centerLeft, end: Alignment.centerRight,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white24,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(banner.tag,
                                  style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700)),
                            ),
                            const SizedBox(height: 6),
                            Text(banner.highlight,
                                style: TextStyle(color: banner.highlightColor, fontSize: 18, fontWeight: FontWeight.w900)),
                            const SizedBox(height: 4),
                            SizedBox(
                              width: 220,
                              child: Text(banner.description,
                                  style: const TextStyle(color: Colors.white70, fontSize: 10, height: 1.3),
                                  maxLines: 2, overflow: TextOverflow.ellipsis),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          Positioned(
            bottom: 12, left: 0, right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _banners.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: (_currentBanner % _banners.length) == i ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                     color: (_currentBanner % _banners.length) == i ? Colors.white : Colors.white.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Categories ──

  String _categoryImage(String name) {
    switch (name.toLowerCase()) {
      case 'đặc sản & bán chạy':
      case 'đặc sản phố hội':
      case 'món chính':
        return 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=500&fit=crop';
      case 'trứ danh món nước':
        return 'https://tse1.mm.bing.net/th/id/OIP.F22QiBk-4Fw8UhdC-DDYbgHaJQ?pid=Api&P=0&h=220';
      case 'cơm đĩa truyền thống':
      case 'cơm truyền thống':
        return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=500&fit=crop';
      case 'góc healthy & ăn kiêng':
      case 'góc healthy (ai)':
      case 'healthy':
      case 'ăn chay':
        return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=500&fit=crop';
      case 'gọi thêm ăn kèm':
      case 'topping ăn kèm':
      case 'topping':
      case 'gọi thêm':
        return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=500&fit=crop';
      case 'giải khát & tráng miệng':
      case 'đồ uống & tráng miệng':
      case 'đồ uống':
      case 'tráng miệng':
        return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=500&fit=crop';
      default:
        return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=500&fit=crop';
    }
  }

  Widget _buildCategorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Text(
            'Danh mục món ăn',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
          ),
        ),
        SizedBox(
          height: 160,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              final cat = _categories[index];
              final name = cat['name'] as String? ?? '';
              final imageUrl = _categoryImage(name);
              
              return GestureDetector(
                onTap: () => context.push('/menu?category=${Uri.encodeComponent(name)}'),
                child: Container(
                  width: 120,
                  margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Stack(
                      children: [
                        // Image Background
                        CachedNetworkImage(
                          imageUrl: imageUrl,
                          width: double.infinity,
                          height: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (_, _) => Container(color: Colors.grey[200]),
                          errorWidget: (_, _, _) => Container(color: Colors.orange[100]),
                        ),
                        // Dark Gradient Overlay
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.black.withValues(alpha: 0.85),
                                Colors.black.withValues(alpha: 0.15),
                                Colors.transparent,
                              ],
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              stops: const [0.0, 0.6, 1.0],
                            ),
                          ),
                        ),
                        // Category Name at the bottom
                        Positioned(
                          bottom: 12,
                          left: 12,
                          right: 12,
                          child: Text(
                            name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              height: 1.2,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ── Best Seller ──

  Widget _buildBestSellerSectionHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              Icon(Icons.trending_up, color: Colors.red),
              SizedBox(width: 6),
              Text('Bán chạy',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            ],
          ),
          TextButton(
            onPressed: () => context.push('/menu'),
            child: const Text('Xem tất cả'),
          ),
        ],
      ),
    );
  }

  Widget _buildProductGrid(List<Map<String, dynamic>> products, {int maxItems = 6}) {
    final limit = products.length > maxItems ? maxItems : products.length;
    if (limit == 0) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 20),
          child: Text(
            'Không tìm thấy món ăn nào phù hợp.', 
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
        ),
      );
    }
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      clipBehavior: Clip.none,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.90,
        crossAxisSpacing: 6,
        mainAxisSpacing: 6,
      ),
      itemCount: limit,
      itemBuilder: (context, index) {
        return _buildProductCard(products[index]);
      },
    );
  }

  List<Map<String, dynamic>> getFilteredProducts(List<Map<String, dynamic>> rawList) {
    var list = List<Map<String, dynamic>>.from(rawList);
    
    // Filter by price range
    if (_minPrice != null) {
      list = list.where((p) => (p['price'] as num).toDouble() >= _minPrice!).toList();
    }
    if (_maxPrice != null) {
      list = list.where((p) => (p['price'] as num).toDouble() <= _maxPrice!).toList();
    }
    
    // Filter allergy tags if requested
    if (_filterAllergies && _userAllergies.isNotEmpty) {
      list = list.where((p) {
        final allergens = p['allergenTags'] as List<dynamic>? ?? [];
        return !allergens.any((a) => _userAllergies.contains(a.toString()));
      }).toList();
    }
    
    // Sort
    if (_sortBy == 'rating') {
      list.sort((a, b) {
        final aRating = (a['rating'] as num?)?.toDouble() ?? 0;
        final bRating = (b['rating'] as num?)?.toDouble() ?? 0;
        return bRating.compareTo(aRating);
      });
    } else if (_sortBy == 'price_asc') {
      list.sort((a, b) {
        final aPrice = (a['price'] as num?)?.toDouble() ?? 0;
        final bPrice = (b['price'] as num?)?.toDouble() ?? 0;
        return aPrice.compareTo(bPrice);
      });
    } else if (_sortBy == 'price_desc') {
      list.sort((a, b) {
        final aPrice = (a['price'] as num?)?.toDouble() ?? 0;
        final bPrice = (b['price'] as num?)?.toDouble() ?? 0;
        return bPrice.compareTo(aPrice);
      });
    } else {
      // Default: Sort by salesCount
      list.sort((a, b) {
        final aSales = (a['salesCount'] as num?)?.toDouble() ?? 0;
        final bSales = (b['salesCount'] as num?)?.toDouble() ?? 0;
        return bSales.compareTo(aSales);
      });
    }
    
    return list;
  }


  Widget _buildProductCard(Map<String, dynamic> product) {
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

  // ── Flash Sale ──

  Widget _buildFlashSaleSectionHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              Icon(Icons.flash_on, color: Colors.red),
              SizedBox(width: 4),
              Text('Flash Sale',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            ],
          ),
          TextButton(
            onPressed: () => context.push('/menu'),
            child: const Text('Xem tất cả'),
          ),
        ],
      ),
    );
  }




}

class _StickyHeaderDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final double height;
  _StickyHeaderDelegate({required this.child, required this.height});

  @override
  double get minExtent => height;
  @override
  double get maxExtent => height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return SizedBox(
      height: height,
      child: Material(
        color: Colors.white,
        elevation: overlapsContent ? 2 : 0,
        child: child,
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _StickyHeaderDelegate oldDelegate) {
    return oldDelegate.height != height || oldDelegate.child != child;
  }
}
