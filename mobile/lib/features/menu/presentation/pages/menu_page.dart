import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/core/di/injection.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:foa_mobile/shared/widgets/product_grid_card.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_cubit.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_state.dart';
import 'package:foa_mobile/features/products/domain/entities/product_entity.dart';
import 'package:foa_mobile/features/products/data/models/product_model.dart';
import 'package:foa_mobile/features/menu/presentation/blocs/menu_bloc.dart';
import 'package:foa_mobile/features/menu/presentation/blocs/menu_event.dart';
import 'package:foa_mobile/features/menu/presentation/blocs/menu_state.dart';

/// Menu listing page wrapper providing [MenuBloc].
class MenuPage extends StatelessWidget {
  final String? initialCategory;
  final String? initialSearch;

  const MenuPage({
    super.key,
    this.initialCategory,
    this.initialSearch,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider<MenuBloc>(
      create: (context) {
        final bloc = sl<MenuBloc>();
        if (initialCategory != null) {
          bloc.add(ChangeCategory(initialCategory));
        }
        if (initialSearch != null) {
          bloc.add(ChangeSearch(initialSearch!));
        }
        bloc.add(const FetchMenu());
        return bloc;
      },
      child: const MenuPageContent(),
    );
  }
}

class MenuPageContent extends StatefulWidget {
  const MenuPageContent({super.key});

  @override
  State<MenuPageContent> createState() => _MenuPageContentState();
}

class _MenuPageContentState extends State<MenuPageContent> {
  final Dio _dio = ApiClient().dio;
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _searchFocusNode = FocusNode();
  Timer? _debounce;

  List<String> _userAllergies = [];
  bool _isGridView = true;

  // New section data
  List<Map<String, dynamic>> _vouchers = [];
  List<ProductEntity> _specials = [];
  bool _isLoadingSpecials = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _userAllergies = LocalStorage.selectedAllergies;

    // Load initial values from Bloc state after first build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final state = context.read<MenuBloc>().state;
        _searchController.text = state.searchQuery;
        if (state.searchQuery.isNotEmpty) {
          _searchFocusNode.requestFocus();
        }
      }
    });

    _loadSpecialsAndVouchers();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _loadSpecialsAndVouchers() async {
    try {
      final results = await Future.wait([
        _dio.get(ApiEndpoints.vouchers),
        _dio.get(ApiEndpoints.products, queryParameters: {'sort': 'salesCount', 'limit': 6}),
      ]);

      // Parse vouchers
      final voucherData = results[0].data;
      final voucherRaw = voucherData is Map
          ? (voucherData['data'] as List<dynamic>? ?? [])
          : (voucherData as List<dynamic>? ?? []);
      
      // Parse specials (Best sellers)
      final specialsData = results[1].data;
      final specialsRaw = specialsData is Map
          ? (specialsData['data'] as List<dynamic>? ?? [])
          : (specialsData as List<dynamic>? ?? []);

      if (mounted) {
        setState(() {
          _vouchers = voucherRaw.map((e) => e as Map<String, dynamic>).toList();
          _specials = specialsRaw
              .map((e) => ProductModel.fromJson(e as Map<String, dynamic>).toEntity())
              .where((p) => p.status == 'active')
              .toList();
          _isLoadingSpecials = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingSpecials = false;
        });
      }
    }
  }

  bool get _isNearBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    return maxScroll - currentScroll <= 250;
  }

  void _onScroll() {
    if (_isNearBottom) {
      final state = context.read<MenuBloc>().state;
      if (!state.isLoadingMore && state.hasMore && !state.isLoading && state.error == null) {
        context.read<MenuBloc>().add(const LoadMoreMenu());
      }
    }
  }

  void _onSearch(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) {
        context.read<MenuBloc>().add(ChangeSearch(query));
      }
    });
  }

  String _getCategoryEmoji(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bún') || lower.contains('phở') || lower.contains('nước')) return '🍲 ';
    if (lower.contains('khô') || lower.contains('mì') || lower.contains('trộn')) return '🍝 ';
    if (lower.contains('cơm')) return '🍛 ';
    if (lower.contains('salad') || lower.contains('rau') || lower.contains('chay')) return '🥗 ';
    if (lower.contains('uống') || lower.contains('nước sâm') || lower.contains('sữa')) return '🥤 ';
    if (lower.contains('bánh') || lower.contains('bao')) return '🥟 ';
    if (lower.contains('tráng miệng') || lower.contains('flan') || lower.contains('ngọt')) return '🍰 ';
    if (lower.contains('ăn kèm') || lower.contains('tóp mỡ')) return '🥓 ';
    return '🍽️ ';
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<StoreCubit, StoreState>(
      listenWhen: (previous, current) =>
          previous.selectedStore?['_id'] != current.selectedStore?['_id'],
      listener: (context, state) {
        context.read<MenuBloc>().add(const FetchMenu()); // Re-fetch products when store changes
        _loadSpecialsAndVouchers(); // Re-fetch recommendations
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Column(
            children: [
              // Content Scroll View
              Expanded(
                child: BlocBuilder<MenuBloc, MenuState>(
                  builder: (context, state) {
                    if (state.isLoading) {
                      return _buildShimmer();
                    }

                    if (state.error != null) {
                      return AppErrorWidget(
                        message: state.error!,
                        onRetry: () => context.read<MenuBloc>().add(const FetchMenu()),
                      );
                    }

                    return RefreshIndicator(
                      onRefresh: () async {
                        context.read<MenuBloc>().add(const FetchMenu());
                        await _loadSpecialsAndVouchers();
                      },
                      child: CustomScrollView(
                        controller: _scrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          // 1. Premium Brand Header
                          SliverToBoxAdapter(
                            child: _buildBrandHeader(),
                          ),

                          // 2. Hot Promotions Carousel
                          if (_vouchers.isNotEmpty)
                            SliverToBoxAdapter(
                              child: _buildPromoCarousel(),
                            ),

                          // 3. Today's Specials Carousel
                          if (_specials.isNotEmpty)
                            SliverToBoxAdapter(
                              child: _buildSpecialsCarousel(),
                            ),

                          // 4. Sticky Filter & Category Header (Pinned)
                          SliverPersistentHeader(
                            pinned: true,
                            delegate: _StickyMenuHeaderDelegate(
                              height: 146.0,
                              child: Container(
                                color: AppColors.background,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _buildSearchRow(context),
                                    if (state.categories.isNotEmpty)
                                      _buildCategoryChips(state),
                                    _buildQuickFilters(state),
                                  ],
                                ),
                              ),
                            ),
                          ),

                          if (state.products.isEmpty)
                            SliverFillRemaining(
                              hasScrollBody: false,
                              child: _buildEmptyState(state.searchQuery),
                            ),
                          if (state.products.isNotEmpty)
                            _isGridView
                                ? _buildGridView(state.products)
                                : _buildListView(state.products),
                          if (state.products.isNotEmpty)
                            SliverToBoxAdapter(child: _buildLoadMore(state)),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrandHeader() {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Thực đơn hôm nay',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Tươi ngon, bổ dưỡng & an toàn sức khỏe',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          // Branch Pill
          BlocBuilder<StoreCubit, StoreState>(
            builder: (context, state) {
              final storeName = state.selectedStore?['name'] as String? ?? 'Chi nhánh chính';
              return ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 200),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey[200]!, width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_on, color: AppColors.primary, size: 10),
                      const SizedBox(width: 3),
                      Flexible(
                        child: Text(
                          storeName,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPromoCarousel() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: Text(
            'Khuyến mãi hot 🎁',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
          ),
        ),
        SizedBox(
          height: 60,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _vouchers.length,
            itemBuilder: (context, index) {
              final voucher = _vouchers[index];
              final code = voucher['code'] as String? ?? 'DISCOUNT';
              final desc = voucher['description'] as String? ?? 'Giảm giá cực tốt';
              return Container(
                width: 200,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange[100]!),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(5),
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.confirmation_num_outlined, color: Colors.white, size: 14),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              code,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppColors.primary),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              desc,
                              style: TextStyle(fontSize: 9.5, color: Colors.grey[600]),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
        ),
      ],
    );
  }

  Widget _buildSpecialsCarousel() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 6),
          child: Text(
            'Món ăn nổi bật hôm nay 🔥',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
          ),
        ),
        SizedBox(
          height: 225,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _specials.length,
            itemBuilder: (context, index) {
              final product = _specials[index];
              final conflictingAllergies = product.allergenTags
                  .where((a) => _userAllergies.contains(a))
                  .toList();
              return SizedBox(
                width: 146,
                child: ProductGridCard(
                  product: product,
                  isAllergic: conflictingAllergies.isNotEmpty,
                  onTap: () => context.push('/food/${product.id}'),
                  onAddToCart: () => _handleAddToCart(product),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSearchRow(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              focusNode: _searchFocusNode,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'Tìm món ngon hoặc nguyên liệu...',
                prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textHint),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          context.read<MenuBloc>().add(const ChangeSearch(''));
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
          const SizedBox(width: 8),
          _buildFilterIconButton(context),
        ],
      ),
    );
  }

  Widget _buildFilterIconButton(BuildContext context) {
    return BlocBuilder<MenuBloc, MenuState>(
      builder: (context, state) {
        final hasActiveFilter = state.minPrice != null || 
            state.maxPrice != null || 
            state.filterAllergies || 
            state.sortBy != 'salesCount';

        return InkWell(
          onTap: () => _showFilterBottomSheet(context),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: hasActiveFilter ? AppColors.primary : Colors.grey[100],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: hasActiveFilter ? AppColors.primary : Colors.grey[200]!,
                width: 1,
              ),
            ),
            child: Icon(
              Icons.tune_rounded,
              color: hasActiveFilter ? Colors.white : AppColors.textPrimary,
              size: 18,
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickFilters(MenuState state) {
    final userAllergies = LocalStorage.selectedAllergies;
    return Container(
      height: 38,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          // View toggle inside quick filter row to save space and look neat
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(
              avatar: Icon(
                _isGridView ? Icons.view_list_rounded : Icons.grid_view_rounded,
                color: AppColors.textSecondary,
                size: 14,
              ),
              label: Text(_isGridView ? 'Dạng danh sách' : 'Dạng lưới'),
              onPressed: () => setState(() => _isGridView = !_isGridView),
              backgroundColor: Colors.grey[100],
              labelStyle: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
              side: BorderSide(color: Colors.grey[200]!, width: 1),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            ),
          ),
          // Quick Allergy Filter
          if (userAllergies.isNotEmpty)
            _buildQuickFilterChip(
              label: 'An toàn dị ứng',
              icon: Icons.shield_outlined,
              isSelected: state.filterAllergies,
              onTap: () {
                context.read<MenuBloc>().add(ApplyFilters(
                  sortBy: state.sortBy,
                  minPrice: state.minPrice,
                  maxPrice: state.maxPrice,
                  filterAllergies: !state.filterAllergies,
                ));
              },
            ),
          // Quick Under 50k
          _buildQuickFilterChip(
            label: 'Dưới 50k',
            icon: Icons.monetization_on_outlined,
            isSelected: state.maxPrice == 50000 && state.minPrice == null,
            onTap: () {
              final isSelected = state.maxPrice == 50000 && state.minPrice == null;
              context.read<MenuBloc>().add(ApplyFilters(
                sortBy: state.sortBy,
                minPrice: null,
                maxPrice: isSelected ? null : 50000,
                filterAllergies: state.filterAllergies,
              ));
            },
          ),
        ],
      ),
    );
  }

  Widget _buildQuickFilterChip({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ActionChip(
        avatar: Icon(
          icon,
          color: isSelected ? Colors.white : AppColors.textSecondary,
          size: 14,
        ),
        label: Text(label),
        onPressed: onTap,
        backgroundColor: isSelected ? AppColors.primary : Colors.grey[100],
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
        side: BorderSide(
          color: isSelected ? AppColors.primary : Colors.grey[200]!,
          width: 1,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 6,
        itemBuilder: (_, _) => Container(
          height: 120,
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(String searchQuery) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off_rounded, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            searchQuery.isNotEmpty
                ? 'Không tìm thấy món "$searchQuery"'
                : 'Không có món ăn nào',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(
            'Thử tìm kiếm với từ khóa khác',
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadMore(MenuState state) {
    if (state.isLoadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 3)),
      );
    }
    if (!state.hasMore && state.products.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Center(
          child: Text(
            'Đã hiển thị tất cả',
            style: TextStyle(fontSize: 13, color: Colors.grey[500]),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 48),
      child: SizedBox(
        width: double.infinity,
        child: OutlinedButton(
          onPressed: () => context.read<MenuBloc>().add(const LoadMoreMenu()),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12),
            side: BorderSide(color: AppColors.primary.withOpacity(0.3)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text(
            'Xem thêm',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChips(MenuState state) {
    // Find active category name
    String activeCategoryName = 'Danh mục khác';
    if (state.selectedCategory != null) {
      final matchedCat = state.categories.firstWhere(
        (c) => c.id == state.selectedCategory,
        orElse: () => state.categories.first,
      );
      activeCategoryName = matchedCat.name;
    }

    final isCategorySelected = state.selectedCategory != null;

    return Container(
      color: Colors.white,
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          // 1. All chip
          ChoiceChip(
            label: const Text('Tất cả'),
            selected: state.selectedCategory == null,
            onSelected: (_) {
              context.read<MenuBloc>().add(const ChangeCategory(null));
            },
            backgroundColor: Colors.grey[100],
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: state.selectedCategory == null ? Colors.white : AppColors.textPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 11.5,
            ),
            side: BorderSide(
              color: state.selectedCategory == null ? AppColors.primary : Colors.grey[200]!,
              width: 1,
            ),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          ),
          const SizedBox(width: 8),

          // 2. Dropdown Chip (PopupMenuButton)
          PopupMenuButton<String?>(
            initialValue: state.selectedCategory,
            onSelected: (String? catId) {
              context.read<MenuBloc>().add(ChangeCategory(catId));
            },
            itemBuilder: (BuildContext context) {
              return [
                const PopupMenuItem<String?>(
                  value: null,
                  child: Text('Tất cả danh mục'),
                ),
                ...state.categories.map((cat) {
                  return PopupMenuItem<String?>(
                    value: cat.id,
                    child: Text(cat.name),
                  );
                }),
              ];
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: isCategorySelected ? AppColors.primary : Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isCategorySelected ? AppColors.primary : Colors.grey[200]!,
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    activeCategoryName,
                    style: TextStyle(
                      color: isCategorySelected ? Colors.white : AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 11.5,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.arrow_drop_down_rounded,
                    color: isCategorySelected ? Colors.white : AppColors.textSecondary,
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
          const Spacer(),

          // 3. Rating Choice Chips
          ChoiceChip(
            label: const Text('4★+'),
            selected: state.selectedRating == 4.0,
            onSelected: (_) {
              context.read<MenuBloc>().add(ChangeRatingFilter(state.selectedRating == 4.0 ? null : 4.0));
            },
            backgroundColor: Colors.grey[100],
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: state.selectedRating == 4.0 ? Colors.white : AppColors.textPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 11.5,
            ),
            side: BorderSide(
              color: state.selectedRating == 4.0 ? AppColors.primary : Colors.grey[200]!,
              width: 1,
            ),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          ),
          const SizedBox(width: 6),
          ChoiceChip(
            label: const Text('3★+'),
            selected: state.selectedRating == 3.0,
            onSelected: (_) {
              context.read<MenuBloc>().add(ChangeRatingFilter(state.selectedRating == 3.0 ? null : 3.0));
            },
            backgroundColor: Colors.grey[100],
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: state.selectedRating == 3.0 ? Colors.white : AppColors.textPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 11.5,
            ),
            side: BorderSide(
              color: state.selectedRating == 3.0 ? AppColors.primary : Colors.grey[200]!,
              width: 1,
            ),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet(BuildContext context) {
    final menuBloc = context.read<MenuBloc>();
    final currentState = menuBloc.state;

    String tempSortBy = currentState.sortBy;
    double? tempMinPrice = currentState.minPrice;
    double? tempMaxPrice = currentState.maxPrice;
    bool tempFilterAllergies = currentState.filterAllergies;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Bộ lọc tìm kiếm',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const Divider(),
                  const SizedBox(height: 16),
                  const Text(
                    'Sắp xếp theo',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildFilterChip(
                        label: 'Phổ biến',
                        isSelected: tempSortBy == 'salesCount',
                        onTap: () => setModalState(() => tempSortBy = 'salesCount'),
                      ),
                      _buildFilterChip(
                        label: 'Đánh giá cao',
                        isSelected: tempSortBy == 'rating',
                        onTap: () => setModalState(() => tempSortBy = 'rating'),
                      ),
                      _buildFilterChip(
                        label: 'Giá thấp → cao',
                        isSelected: tempSortBy == 'price_asc',
                        onTap: () => setModalState(() => tempSortBy = 'price_asc'),
                      ),
                      _buildFilterChip(
                        label: 'Giá cao → thấp',
                        isSelected: tempSortBy == 'price_desc',
                        onTap: () => setModalState(() => tempSortBy = 'price_desc'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Khoảng giá',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildFilterChip(
                        label: 'Tất cả',
                        isSelected: tempMinPrice == null && tempMaxPrice == null,
                        onTap: () => setModalState(() {
                          tempMinPrice = null;
                          tempMaxPrice = null;
                        }),
                      ),
                      _buildFilterChip(
                        label: 'Dưới 50k',
                        isSelected: tempMinPrice == null && tempMaxPrice == 50000,
                        onTap: () => setModalState(() {
                          tempMinPrice = null;
                          tempMaxPrice = 50000;
                        }),
                      ),
                      _buildFilterChip(
                        label: '50k - 100k',
                        isSelected: tempMinPrice == 50000 && tempMaxPrice == 100000,
                        onTap: () => setModalState(() {
                          tempMinPrice = 50000;
                          tempMaxPrice = 100000;
                        }),
                      ),
                      _buildFilterChip(
                        label: 'Trên 100k',
                        isSelected: tempMinPrice == 100000 && tempMaxPrice == null,
                        onTap: () => setModalState(() {
                          tempMinPrice = 100000;
                          tempMaxPrice = null;
                        }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  if (_userAllergies.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Lọc dị ứng',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Ẩn các món chứa chất gây dị ứng của bạn',
                                style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: tempFilterAllergies,
                          activeThumbColor: AppColors.primary,
                          activeTrackColor: AppColors.primary.withOpacity(0.5),
                          onChanged: (val) {
                            setModalState(() => tempFilterAllergies = val);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setModalState(() {
                              tempSortBy = 'salesCount';
                              tempMinPrice = null;
                              tempMaxPrice = null;
                              tempFilterAllergies = false;
                            });
                          },
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 48),
                            side: const BorderSide(color: AppColors.divider),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Thiết lập lại', style: TextStyle(color: AppColors.textSecondary)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            menuBloc.add(ApplyFilters(
                              sortBy: tempSortBy,
                              minPrice: tempMinPrice,
                              maxPrice: tempMaxPrice,
                              filterAllergies: tempFilterAllergies,
                            ));
                          },
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size(0, 48),
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Áp dụng', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.divider,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? AppColors.primary : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildGridView(List<ProductEntity> products) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 80),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.90,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final product = products[index];
            final conflictingAllergies = product.allergenTags
                .where((a) => _userAllergies.contains(a))
                .toList();

            return ProductGridCard(
              product: product,
              isAllergic: conflictingAllergies.isNotEmpty,
              onTap: () => context.push('/food/${product.id}'),
              onAddToCart: () => _handleAddToCart(product),
            );
          },
          childCount: products.length,
        ),
      ),
    );
  }

  Widget _buildListView(List<ProductEntity> products) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 80),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) => _buildListItem(products[index]),
          childCount: products.length,
        ),
      ),
    );
  }

  Widget _buildListItem(ProductEntity product) {
    final name = product.name;
    final price = product.price;
    final image = product.image;
    final rating = product.rating;
    final description = product.description;
    final isAvailable = product.isAvailable;
    final originalPrice = product.originalPrice;
    final hasDiscount = originalPrice != null && originalPrice > price;

    final conflictingAllergies = product.allergenTags
        .where((a) => _userAllergies.contains(a))
        .toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(
          color: conflictingAllergies.isNotEmpty
              ? Colors.red.withOpacity(0.5)
              : Colors.transparent,
          width: conflictingAllergies.isNotEmpty ? 1.0 : 0.0,
        ),
      ),
      child: InkWell(
        onTap: () => context.push('/food/${product.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Image
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  children: [
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: image != null && image.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: image,
                              fit: BoxFit.cover,
                              placeholder: (_, _) => Container(color: Colors.grey[200]),
                              errorWidget: (_, _, _) => Container(
                                color: Colors.orange[50],
                                child: const Icon(Icons.restaurant, color: AppColors.primary, size: 32),
                              ),
                            )
                          : Container(
                              color: Colors.orange[50],
                              child: const Icon(Icons.restaurant, color: AppColors.primary, size: 32),
                            ),
                    ),
                    if (!isAvailable)
                      Container(
                        width: 80,
                        height: 80,
                        color: Colors.black54,
                        child: const Center(
                          child: Text(
                            'Hết',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (conflictingAllergies.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            margin: const EdgeInsets.only(right: 6),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'DỊ ỨNG',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.red),
                            ),
                          ),
                        if (!isAvailable)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Hết hàng',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.grey),
                            ),
                          ),
                      ],
                    ),
                    if (description != null && description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        description,
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          Formatters.compactCurrency(price),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                        ),
                        if (hasDiscount) ...[
                          const SizedBox(width: 4),
                          Text(
                            Formatters.compactCurrency(originalPrice),
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[400],
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                        if (rating != null) ...[
                          const Spacer(),
                          const Icon(Icons.star, color: Colors.amber, size: 14),
                          const SizedBox(width: 2),
                          Text(
                            rating.toStringAsFixed(1),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (isAvailable) ...[
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _handleAddToCart(product),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.add, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _handleAddToCart(ProductEntity product) {
    final conflictingAllergies = product.allergenTags
        .where((a) => _userAllergies.contains(a))
        .toList();

    if (conflictingAllergies.isNotEmpty) {
      showDialog(
        context: context,
        builder: (dialogCtx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
              SizedBox(width: 8),
              Text('Cảnh báo dị ứng', style: TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
          content: Text(
            'Món ăn "${product.name}" này có chứa nguyên liệu có thể gây dị ứng cho bạn: '
            '${conflictingAllergies.join(", ")}.\n\nBạn vẫn muốn thêm vào giỏ hàng chứ?',
            style: const TextStyle(fontSize: 14),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                Navigator.pop(dialogCtx);
                _executeAddToCart(product);
              },
              child: const Text('Vẫn thêm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    } else {
      _executeAddToCart(product);
    }
  }

  void _executeAddToCart(ProductEntity product) async {
    try {
      await _dio.post(ApiEndpoints.cartAdd, data: {
        'productId': product.id,
        'quantity': 1,
        'price': product.price,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã thêm "${product.name}" vào giỏ hàng'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] as String? ?? 'Không thể thêm vào giỏ hàng';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }
}

class _StickyMenuHeaderDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;
  final double height;

  _StickyMenuHeaderDelegate({required this.child, required this.height});

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
        child: child,
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _StickyMenuHeaderDelegate oldDelegate) {
    return oldDelegate.height != height || oldDelegate.child != child;
  }
}

List<Map<String, dynamic>> parseMenuCategories(dynamic data) {
  final raw = data is Map
      ? (data['data'] as List<dynamic>? ?? [])
      : (data as List<dynamic>? ?? []);

  return raw.map((item) {
    if (item is String) {
      return {'id': item, 'name': item};
    }
    final category = item as Map<String, dynamic>;
    return {
      'id': category['_id'] as String? ?? category['name'] as String? ?? '',
      'name': category['name'] as String? ?? category['_id'] as String? ?? '',
    };
  }).toList();
}
