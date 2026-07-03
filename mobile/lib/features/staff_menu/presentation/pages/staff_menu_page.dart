import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/models/product_model.dart';
import 'package:foa_mobile/features/staff_menu/presentation/blocs/staff_menu_bloc.dart';
import 'package:foa_mobile/shared/widgets/empty_state_widget.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

class StaffMenuPage extends StatefulWidget {
  const StaffMenuPage({super.key});

  @override
  State<StaffMenuPage> createState() => _StaffMenuPageState();
}

class _StaffMenuPageState extends State<StaffMenuPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCategory = 'Tất cả';
  String _selectedStatusFilter = 'all'; // all, available, suspended

  @override
  void initState() {
    super.initState();
    _fetchMenu();
  }

  void _fetchMenu({bool showLoader = true}) {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated && authState.storeId != null) {
      context.read<StaffMenuBloc>().add(
        FetchStaffMenuEvent(
          storeId: authState.storeId!,
          showLoader: showLoader,
        ),
      );
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quản lý thực đơn'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _fetchMenu(showLoader: true),
          ),
        ],
      ),
      body: BlocConsumer<StaffMenuBloc, StaffMenuState>(
        listener: (context, state) {
          if (state is StaffMenuLoaded && state.message != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message!),
                backgroundColor: AppColors.primary,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is StaffMenuLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is StaffMenuError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    state.message,
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => _fetchMenu(),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          if (state is StaffMenuLoaded) {
            final products = state.products;

            // Stats
            final totalItems = products.length;
            final inStock = products
                .where((p) => p.isAvailable && p.status == 'active')
                .length;
            final outOfStock = totalItems - inStock;

            // Apply Filters Locally
            final filteredProducts = products.where((product) {
              final matchesSearch =
                  product.name.toLowerCase().contains(
                    _searchQuery.toLowerCase(),
                  ) ||
                  product.description.toLowerCase().contains(
                    _searchQuery.toLowerCase(),
                  );

              final matchesCategory =
                  _selectedCategory == 'Tất cả' ||
                  product.category == _selectedCategory;

              final matchesStatus =
                  _selectedStatusFilter == 'all' ||
                  (_selectedStatusFilter == 'available' &&
                      product.isAvailable &&
                      product.status == 'active') ||
                  (_selectedStatusFilter == 'suspended' &&
                      (!product.isAvailable || product.status != 'active'));

              return matchesSearch && matchesCategory && matchesStatus;
            }).toList();

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: _buildKpiBanner(totalItems, inStock, outOfStock),
                ),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _StickyFilterHeaderDelegate(
                    height: 118.0,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border(
                          bottom: BorderSide(
                            color: AppColors.divider.withValues(alpha: 0.6),
                            width: 0.5,
                          ),
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              Expanded(child: _buildSearchField()),
                              const SizedBox(width: 8),
                              _buildCategorySelector(
                                state.categories,
                                products,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _buildSegmentButton('all', 'Tất cả'),
                              const SizedBox(width: 6),
                              _buildSegmentButton('available', 'Đang bán'),
                              const SizedBox(width: 6),
                              _buildSegmentButton('suspended', 'Tạm ngưng'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (filteredProducts.isEmpty)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.only(top: 80),
                      child: EmptyStateWidget(
                        icon: Icons.search_off,
                        title: 'Không tìm thấy món ăn',
                        subtitle:
                            'Vui lòng thay đổi bộ lọc tìm kiếm hoặc danh mục.',
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate((context, index) {
                        final product = filteredProducts[index];
                        final isActioning =
                            state.actioningProductId == product.id;

                        return Column(
                          children: [
                            _buildMenuItemRow(product, isActioning),
                            if (index < filteredProducts.length - 1)
                              const Divider(height: 1, thickness: 0.5),
                          ],
                        );
                      }, childCount: filteredProducts.length),
                    ),
                  ),
              ],
            );
          }

          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildSearchField() {
    return TextField(
      controller: _searchController,
      onChanged: (val) {
        setState(() {
          _searchQuery = val.trim();
        });
      },
      decoration: InputDecoration(
        hintText: 'Tìm món ăn...',
        prefixIcon: const Icon(Icons.search, size: 20),
        suffixIcon: _searchQuery.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.clear, size: 18),
                onPressed: () {
                  _searchController.clear();
                  setState(() {
                    _searchQuery = '';
                  });
                },
              )
            : null,
        contentPadding: const EdgeInsets.symmetric(vertical: 8),
        filled: true,
        fillColor: Colors.grey.shade100,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildCategorySelector(
    List<String> categories,
    List<ProductModel> products,
  ) {
    return InkWell(
      onTap: () => _showCategoryBottomSheet(categories, products),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.filter_list_rounded,
              size: 16,
              color: AppColors.primary,
            ),
            const SizedBox(width: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 80),
              child: Text(
                _selectedCategory,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.keyboard_arrow_down_rounded,
              size: 16,
              color: AppColors.primary,
            ),
          ],
        ),
      ),
    );
  }

  void _showCategoryBottomSheet(
    List<String> categories,
    List<ProductModel> products,
  ) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chọn danh mục',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    final isSelected = _selectedCategory == cat;
                    final count = cat == 'Tất cả'
                        ? products.length
                        : products.where((p) => p.category == cat).length;

                    return ListTile(
                      leading: Icon(
                        cat == 'Tất cả'
                            ? Icons.grid_view_rounded
                            : Icons.restaurant_menu_rounded,
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.textSecondary,
                      ),
                      title: Text(
                        cat,
                        style: TextStyle(
                          fontWeight: isSelected
                              ? FontWeight.bold
                              : FontWeight.normal,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textPrimary,
                        ),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary.withValues(alpha: 0.1)
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$count món',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isSelected
                                    ? AppColors.primary
                                    : AppColors.textSecondary,
                              ),
                            ),
                          ),
                          if (isSelected) ...[
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.check_circle_rounded,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ],
                        ],
                      ),
                      selected: isSelected,
                      onTap: () {
                        setState(() {
                          _selectedCategory = cat;
                        });
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildKpiBanner(int total, int active, int suspended) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: _KpiStatBox(
              value: '$total',
              label: 'TỔNG MÓN',
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _KpiStatBox(
              value: '$active',
              label: 'ĐANG BÁN',
              color: Colors.green.shade800,
              bgColor: Colors.green.shade50,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _KpiStatBox(
              value: '$suspended',
              label: 'TẠM NGƯNG',
              color: Colors.red.shade800,
              bgColor: Colors.red.shade50,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentButton(String value, String label) {
    final isSelected = _selectedStatusFilter == value;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedStatusFilter = value;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItemRow(ProductModel product, bool isActioning) {
    final isProductActive = product.isAvailable && product.status == 'active';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail Image
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 64,
              height: 64,
              color: Colors.grey.shade200,
              child: product.imageUrl.isNotEmpty
                  ? Image.network(product.imageUrl, fit: BoxFit.cover)
                  : const Icon(Icons.fastfood, color: Colors.grey),
            ),
          ),
          const SizedBox(width: 12),

          // Details info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        product.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        product.category.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  product.description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      Formatters.currency(product.price),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    if (product.healthWarning != null &&
                        product.healthWarning!.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: Colors.red.shade100),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.warning,
                              color: Colors.red.shade700,
                              size: 10,
                            ),
                            const SizedBox(width: 2),
                            Text(
                              'Dị ứng',
                              style: TextStyle(
                                fontSize: 8,
                                fontWeight: FontWeight.bold,
                                color: Colors.red.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // Switch button to Toggle selling
          isActioning
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Switch(
                  value: isProductActive,
                  activeThumbColor: Colors.green,
                  onChanged: (val) {
                    context.read<StaffMenuBloc>().add(
                      ToggleProductAvailabilityEvent(
                        productId: product.id,
                        isAvailable: val,
                        status: val ? 'active' : 'inactive',
                      ),
                    );
                  },
                ),
        ],
      ),
    );
  }
}

class _KpiStatBox extends StatelessWidget {
  final String value;
  final String label;
  final Color color;
  final Color? bgColor;

  const _KpiStatBox({
    required this.value,
    required this.label,
    required this.color,
    this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: bgColor ?? Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: color.withValues(alpha: 0.7),
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _StickyFilterHeaderDelegate extends SliverPersistentHeaderDelegate {
  final double height;
  final Widget child;

  _StickyFilterHeaderDelegate({required this.height, required this.child});

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return SizedBox(
      height: height,
      child: Material(color: Colors.transparent, child: child),
    );
  }

  @override
  double get maxExtent => height;

  @override
  double get minExtent => height;

  @override
  bool shouldRebuild(covariant _StickyFilterHeaderDelegate oldDelegate) {
    return oldDelegate.height != height || oldDelegate.child != child;
  }
}
