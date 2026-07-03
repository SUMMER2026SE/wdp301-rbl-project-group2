import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/core/utils/debouncer.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';
import 'package:go_router/go_router.dart';

class VoucherListPage extends StatefulWidget {
  const VoucherListPage({super.key});

  @override
  State<VoucherListPage> createState() => _VoucherListPageState();
}

class _VoucherListPageState extends State<VoucherListPage> {
  final Dio _dio = ApiClient().dio;
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _debouncer = Debouncer(
    delay: const Duration(milliseconds: 300),
  );

  List<dynamic> _vouchers = [];
  bool _loading = true;
  String? _error;
  String? _selectedCategory;
  String _searchQuery = '';

  static const List<Map<String, String?>> _categories = [
    {'label': 'Tất cả', 'value': null},
    {'label': 'Giảm giá', 'value': 'discount'},
    {'label': 'FreeShip', 'value': 'freeship'},
    {'label': 'Mới', 'value': 'new'},
    {'label': 'Đặc biệt', 'value': 'special'},
  ];

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debouncer.dispose();
    super.dispose();
  }

  Future<void> _loadVouchers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final queryParams = <String, dynamic>{};
      if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
        queryParams['category'] = _selectedCategory;
      }
      if (_searchQuery.isNotEmpty) {
        queryParams['search'] = _searchQuery;
      }

      final res = await _dio.get(
        ApiEndpoints.vouchers,
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      setState(() {
        _vouchers =
            res.data['data'] as List<dynamic>? ?? res.data as List<dynamic>;
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _error =
            e.response?.data['message'] as String? ??
            'Không thể tải danh sách voucher';
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Đã xảy ra lỗi';
        _loading = false;
      });
    }
  }

  void _filterByCategory(String? category) {
    setState(() {
      _selectedCategory = _selectedCategory == category ? null : category;
    });
    _loadVouchers();
  }

  void _onSearch(String value) {
    _debouncer.run(() {
      if (!mounted) return;
      setState(() {
        _searchQuery = value.trim();
      });
      _loadVouchers();
    });
  }

  void _clearSearch() {
    _debouncer.cancel();
    _searchController.clear();
    setState(() {
      _searchQuery = '';
    });
    _loadVouchers();
  }

  bool _isExpired(Map<String, dynamic> v) {
    final exp = Formatters.parseDate(v['validUntil'] as String?);
    return exp != null && exp.isBefore(DateTime.now());
  }

  String _discountLabel(Map<String, dynamic> v) {
    if (v['discountPercent'] != null && (v['discountPercent'] as num) > 0) {
      return '-${v['discountPercent']}%';
    }
    if (v['discountAmount'] != null && (v['discountAmount'] as num) > 0) {
      return '-${Formatters.compactCurrency((v['discountAmount'] as num))}';
    }
    return 'Giảm';
  }

  bool _isPercentage(Map<String, dynamic> v) {
    return v['discountPercent'] != null && (v['discountPercent'] as num) > 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Khuyến mãi')),
      body: Column(
        children: [
          _buildCategoryChips(),
          _buildSearchBar(),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildCategoryChips() {
    return Container(
      height: 56,
      color: Colors.white,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: _categories
            .map((cat) => _buildChip(cat['label'] as String, cat['value']))
            .toList(),
      ),
    );
  }

  Widget _buildChip(String label, String? value) {
    final isSelected = _selectedCategory == value;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => _filterByCategory(value),
        backgroundColor: Colors.white,
        selectedColor: AppColors.primary,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : AppColors.textPrimary,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.divider,
          width: 1,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: TextField(
        controller: _searchController,
        onChanged: _onSearch,
        decoration: InputDecoration(
          hintText: 'Tìm mã giảm giá...',
          prefixIcon: const Icon(
            Icons.search_rounded,
            color: AppColors.textHint,
          ),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 20),
                  onPressed: _clearSearch,
                )
              : null,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return _buildShimmer();
    if (_error != null) {
      return AppErrorWidget(message: _error!, onRetry: _loadVouchers);
    }
    if (_vouchers.isEmpty) {
      return _buildEmptyState();
    }
    return RefreshIndicator(
      onRefresh: _loadVouchers,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _vouchers.length,
        itemBuilder: (_, i) =>
            _buildVoucherCard(_vouchers[i] as Map<String, dynamic>),
      ),
    );
  }

  Widget _buildShimmer() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (_, _) => Shimmer.fromColors(
        baseColor: AppColors.shimmerBase,
        highlightColor: AppColors.shimmerHighlight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          height: 160,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.local_offer_outlined, size: 72, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'Chưa có khuyến mãi nào',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 8),
          Text(
            'Hiện tại chưa có voucher nào khả dụng',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: AppColors.textHint),
          ),
        ],
      ),
    );
  }

  Widget _buildVoucherCard(Map<String, dynamic> v) {
    final expired = _isExpired(v);
    final isPct = _isPercentage(v);
    final validUntil = Formatters.parseDate(v['validUntil'] as String?);
    final minOrder = v['minOrderAmount'] != null
        ? (v['minOrderAmount'] as num)
        : 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: expired ? Colors.grey[100] : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push('/vouchers/${v['_id']}'),
          child: IntrinsicHeight(
            child: Row(
              children: [
                // Discount badge side
                Container(
                  width: 88,
                  decoration: BoxDecoration(
                    color: expired
                        ? Colors.grey[300]
                        : (isPct ? AppColors.primary : AppColors.success),
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      bottomLeft: Radius.circular(16),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _discountLabel(v),
                        style: TextStyle(
                          color: expired ? Colors.grey[500] : Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (!expired)
                        Icon(
                          Icons.local_offer,
                          color: Colors.white.withValues(alpha: 0.8),
                          size: 20,
                        ),
                    ],
                  ),
                ),
                // Content side
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          v['title'] as String? ?? '',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: expired
                                ? Colors.grey[500]
                                : AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        if (v['code'] != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              v['code'] as String,
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        const SizedBox(height: 6),
                        Text(
                          v['description'] as String? ?? '',
                          style: TextStyle(
                            fontSize: 12,
                            color: expired
                                ? Colors.grey[400]
                                : AppColors.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            if (validUntil != null)
                              Text(
                                'HSD: ${Formatters.date(validUntil)}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: expired
                                      ? Colors.grey[400]
                                      : AppColors.textHint,
                                ),
                              ),
                            if (minOrder > 0) ...[
                              const SizedBox(width: 12),
                              Text(
                                'Đơn tối thiểu ${Formatters.compactCurrency(minOrder)}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: expired
                                      ? Colors.grey[400]
                                      : AppColors.textHint,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (!expired && v['code'] != null)
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () {
                                Clipboard.setData(
                                  ClipboardData(text: v['code'] as String),
                                );
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Đã sao chép mã!'),
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size(double.infinity, 32),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 6,
                                ),
                                textStyle: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              child: const Text('Sao chép mã'),
                            ),
                          ),
                        if (expired)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.grey[300],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Đã hết hạn',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[600],
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
        ),
      ),
    );
  }
}
