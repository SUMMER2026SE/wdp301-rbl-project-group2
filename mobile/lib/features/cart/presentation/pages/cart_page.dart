import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

/// Full-featured Cart page with food-delivery UI style.
class CartPage extends StatefulWidget {
  const CartPage({super.key});

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  final Dio _dio = ApiClient().dio;

  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _items = [];
  final Set<String> _selectedItemIds = {};
  String? _storeName;
  List<Map<String, dynamic>> _upsellProducts = [];
  bool _isLoadingUpsell = false;
  final Set<String> _addingToCart = {};
  final TextEditingController _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadCart();
    _loadUpsellProducts();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  // ── API ──

  Future<void> _loadCart() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final response = await _dio.get(ApiEndpoints.cart);
      final data = response.data;
      final cartData = data is Map
          ? (data['data'] as Map<String, dynamic>? ?? data)
          : <String, dynamic>{};
      final itemsRaw = (cartData['items'] as List<dynamic>? ?? []);
      setState(() {
        _items = itemsRaw.map((e) => e as Map<String, dynamic>).toList();
        _storeName = cartData['storeName'] as String?;
        _isLoading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = e.type == DioExceptionType.connectionError ||
                e.type == DioExceptionType.connectionTimeout
            ? 'Không có kết nối mạng'
            : 'Không thể tải giỏ hàng';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = 'Không thể tải giỏ hàng';
      });
    }
  }

  Future<void> _loadUpsellProducts() async {
    setState(() => _isLoadingUpsell = true);
    try {
      final responses = await Future.wait([
        _dio.get(ApiEndpoints.products, queryParameters: {
          'category': 'Gọi Thêm Ăn Kèm',
          'limit': 6,
          'status': 'active',
        }),
        _dio.get(ApiEndpoints.products, queryParameters: {
          'category': 'Giải Khát & Tráng Miệng',
          'limit': 6,
          'status': 'active',
        }),
      ]);

      final List<Map<String, dynamic>> combined = [];
      for (final response in responses) {
        final data = response.data;
        final list = data is Map
            ? (data['data'] as List<dynamic>? ?? [])
            : (data as List<dynamic>? ?? []);
        for (final item in list) {
          if (item is Map<String, dynamic> && item['isAvailable'] != false) {
            combined.add(item);
          }
        }
      }

      combined.shuffle();
      if (mounted) {
        setState(() => _upsellProducts = combined.take(4).toList());
      }
    } catch (_) {
      // Silently fail
    } finally {
      if (mounted) setState(() => _isLoadingUpsell = false);
    }
  }

  String _productIdForCartItem(Map<String, dynamic> item) {
    final productId = item['productId'];
    if (productId is Map<String, dynamic>) {
      return productId['_id'] as String? ?? '';
    }
    if (productId != null) {
      return productId.toString();
    }
    final product = item['product'];
    if (product is Map<String, dynamic>) {
      return product['_id'] as String? ?? '';
    }
    return item['_id'] as String? ?? '';
  }

  Future<void> _updateQty(String? itemId, int delta) async {
    if (itemId == null) return;
    // Optimistic: update quantity locally immediately
    setState(() {
      final idx = _items.indexWhere((i) => i['itemId'] == itemId || i['_id'] == itemId);
      if (idx == -1) return;
      final item = _items[idx];
      final qty = ((item['quantity'] as num?)?.toInt() ?? 1) + delta;
      if (qty <= 0) {
        _items.removeAt(idx);
      } else {
        item['quantity'] = qty;
      }
    });

    try {
      final item = _items.firstWhere(
        (i) => i['itemId'] == itemId || i['_id'] == itemId,
        orElse: () => <String, dynamic>{},
      );
      // If qty <= 0, item was already removed from list — skip API call
      if (item.isEmpty) return;
      final productId = _productIdForCartItem(item);
      final variations = (item['variations'] as List<dynamic>?) ?? [];
      final qty = ((item['quantity'] as num?)?.toInt() ?? 1);
      if (qty <= 1 && delta < 0) {
        await _dio.delete(ApiEndpoints.cartRemove, data: {
          'productId': productId,
          'variations': variations,
        });
      } else {
        await _dio.patch(ApiEndpoints.cartUpdate, data: {
          'productId': productId,
          'quantity': qty,
          'variations': variations,
        });
      }
    } on DioException catch (e) {
      // Revert on failure: reload full cart
      if (mounted) {
        _showSnack(
          e.response?.data is Map
              ? ((e.response!.data as Map)['message'] as String? ?? 'Không thể cập nhật giỏ hàng')
              : 'Không thể cập nhật giỏ hàng',
          AppColors.error,
        );
        await _loadCart();
      }
    }
  }

  Future<bool> _removeItem(dynamic id) async {
    if (id == null) return false;
    try {
      final item = id is Map<String, dynamic>
          ? id
          : _items.firstWhere(
              (i) => i['itemId'] == id || i['_id'] == id,
              orElse: () => <String, dynamic>{},
            );
      final productId = _productIdForCartItem(item);
      final variations = (item['variations'] as List<dynamic>?) ?? [];
      await _dio.delete(ApiEndpoints.cartRemove, data: {
        'productId': productId,
        'variations': variations,
      });
      await _loadCart();
      if (mounted) _showSnack('Đã xóa khỏi giỏ hàng', AppColors.success);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _addToCartUpsell(Map<String, dynamic> product) async {
    final productId = product['_id'] as String? ?? '';
    if (productId.isEmpty) return;

    setState(() => _addingToCart.add(productId));

    try {
      await _dio.post(ApiEndpoints.cartAdd, data: {
        'productId': productId,
        'quantity': 1,
      });
      if (mounted) {
        _showSnack('Đã thêm "${product['name'] ?? ''}" vào giỏ hàng',
            AppColors.success);
        await _loadCart();
      }
    } on DioException catch (e) {
      final msg = e.response?.data is Map
          ? ((e.response!.data as Map)['message'] as String? ??
              'Không thể thêm vào giỏ hàng')
          : 'Không thể thêm vào giỏ hàng';
      if (mounted) _showSnack(msg, AppColors.error);
    } finally {
      if (mounted) setState(() => _addingToCart.remove(productId));
    }
  }

  Future<void> _clearCart() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa giỏ hàng'),
        content:
            const Text('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child:
                const Text('Xóa', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _dio.delete(ApiEndpoints.cartClear);
      await _loadCart();
    } catch (_) {}
  }

  // ── Helpers ──

  double _itemTotal(Map<String, dynamic> item) {
    final price = (item['price'] as num?)?.toDouble() ?? 0;
    final qty = (item['quantity'] as num?)?.toInt() ?? 1;
    double extra = 0;
    final variations = item['variations'] as List<dynamic>?;
    if (variations != null) {
      for (final v in variations) {
        if (v is Map<String, dynamic>) {
          extra += (v['extraPrice'] as num?)?.toDouble() ?? 0;
        }
      }
    }
    return (price + extra) * qty;
  }

  /// Returns the item ID as a string key for selection tracking.
  String _itemId(Map<String, dynamic> item) {
    return item['itemId'] as String? ?? item['_id'] as String? ?? '';
  }

  double get _selectedSubtotal {
    double total = 0;
    for (final item in _items) {
      final id = _itemId(item);
      if (_selectedItemIds.contains(id)) {
        total += _itemTotal(item);
      }
    }
    return total;
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: color,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Giỏ hàng',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            fontSize: 20,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _buildBody(),
      bottomNavigationBar: _items.isEmpty || _isLoading ? null : _buildBottomBar(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) return _buildShimmer();
    if (_error != null) return _buildError();
    if (_items.isEmpty) return _buildEmpty();

    final List<Widget> children = [];

    // 1. Store Header
    if (_storeName != null) {
      children.add(_buildStoreHeader());
      children.add(const SizedBox(height: 8));
    }

    // 2. Select All & Clear Cart Actions Header
    children.add(_buildHeaderActions());
    children.add(const SizedBox(height: 10));

    // 3. Cart Items
    for (final item in _items) {
      children.add(_buildItem(item));
    }

    // 4. Order Note Section
    children.add(const SizedBox(height: 12));
    children.add(_buildNoteSection());

    // 5. Upsell Section
    if (_upsellProducts.isNotEmpty || _isLoadingUpsell) {
      children.add(_buildUpsellSection());
    }

    return RefreshIndicator(
      onRefresh: _loadCart,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 140),
        children: children,
      ),
    );
  }

  Widget _buildHeaderActions() {
    final allSelected = _items.isNotEmpty &&
        _items.every((item) => _selectedItemIds.contains(_itemId(item)));

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () {
              setState(() {
                if (allSelected) {
                  _selectedItemIds.clear();
                } else {
                  for (final item in _items) {
                    _selectedItemIds.add(_itemId(item));
                  }
                }
              });
            },
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: allSelected ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: allSelected ? AppColors.primary : AppColors.divider,
                      width: 2,
                    ),
                  ),
                  child: allSelected
                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                      : null,
                ),
                const SizedBox(width: 10),
                Text(
                  'Chọn tất cả (${_items.length} món)',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: _clearCart,
            borderRadius: BorderRadius.circular(8),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  Icon(Icons.delete_sweep_outlined,
                      size: 20, color: AppColors.error),
                  SizedBox(width: 4),
                  Text(
                    'Xóa tất cả',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.error,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItem(Map<String, dynamic> item) {
    final itemId = item['itemId'] as String? ?? item['_id'] as String?;
    // productId is populated by backend
    final prodRaw = item['productId'];
    final prod = prodRaw is Map<String, dynamic> ? prodRaw : (item['product'] as Map<String, dynamic>? ?? item);
    final name = prod['name'] as String? ??
        item['productName'] as String? ??
        item['name'] as String? ??
        'Món ăn';
    final qty = (item['quantity'] as num?)?.toInt() ?? 1;
    final image = prod['image'] as String? ??
        item['productImage'] as String? ??
        item['image'] as String?;
    final note = item['note'] as String?;
    final variations = item['variations'] as List<dynamic>?;
    final id = _itemId(item);
    final isSelected = _selectedItemIds.contains(id);

    final price = (item['price'] as num?)?.toDouble() ?? 0;
    double extraPrice = 0;
    if (variations != null) {
      for (final v in variations) {
        if (v is Map<String, dynamic>) {
          extraPrice += (v['extraPrice'] as num?)?.toDouble() ?? 0;
        }
      }
    }
    final itemTotal = (price + extraPrice) * qty;

    final originalPrice = (prod['originalPrice'] as num?)?.toDouble();
    final hasDiscount = originalPrice != null && originalPrice > price;
    final originalItemTotal = hasDiscount ? (originalPrice + extraPrice) * qty : null;

    return Dismissible(
      key: Key(itemId ?? ''),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white, size: 28),
      ),
      confirmDismiss: (_) async {
        return showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Xóa sản phẩm'),
            content: Text('Bỏ "$name" khỏi giỏ hàng?'),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Hủy')),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Xóa',
                    style: TextStyle(color: AppColors.error)),
              ),
            ],
          ),
        );
      },
      onDismissed: (_) => _removeItem(itemId),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Checkbox
              Padding(
                padding: const EdgeInsets.only(top: 29), // Center checkbox relative to 80x80 image
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      if (isSelected) {
                        _selectedItemIds.remove(id);
                      } else {
                        _selectedItemIds.add(id);
                      }
                    });
                  },
                  child: Container(
                    width: 22,
                    height: 22,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.divider,
                        width: 2,
                      ),
                    ),
                    child: isSelected
                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                        : null,
                  ),
                ),
              ),
              // Image
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  width: 80,
                  height: 80,
                  child: image != null && image.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: image,
                          fit: BoxFit.cover,
                          placeholder: (_, _) =>
                              Container(color: AppColors.surfaceVariant),
                          errorWidget: (_, _, _) => Container(
                            color: AppColors.surfaceVariant,
                            child: const Icon(Icons.restaurant,
                                color: AppColors.primary),
                          ),
                        )
                      : Container(
                          color: AppColors.surfaceVariant,
                          child: const Icon(Icons.restaurant,
                              color: AppColors.primary, size: 32),
                        ),
                ),
              ),
              const SizedBox(width: 12),

              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Name + delete button
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        InkWell(
                          onTap: () => _removeItem(itemId),
                          borderRadius: BorderRadius.circular(20),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.close_rounded,
                                size: 18, color: AppColors.textHint),
                          ),
                        ),
                      ],
                    ),

                    // Variations (as tag chips)
                    if (variations != null && variations.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: variations.map((v) {
                          final vMap = v as Map<String, dynamic>;
                          final vName = vMap['name'] ?? '';
                          final vChoice = vMap['choice'] ?? '';
                          final vExtra = (vMap['extraPrice'] as num?)?.toDouble() ?? 0;
                          final extraText = vExtra > 0 ? ' (+${Formatters.currency(vExtra)})' : '';
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceVariant,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '$vName: $vChoice$extraText',
                              style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],

                    // Note
                    if (note != null && note.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Ghi chú: $note',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textHint,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],

                    const SizedBox(height: 10),

                    // Quantity + Item total
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              InkWell(
                                onTap: () => _updateQty(itemId, -1),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.all(8),
                                  child: Icon(
                                    Icons.remove_rounded,
                                    size: 16,
                                    color: qty > 1
                                        ? AppColors.primary
                                        : AppColors.textHint,
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 28,
                                child: Center(
                                  child: Text(
                                    '$qty',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                              ),
                              InkWell(
                                onTap: () => _updateQty(itemId, 1),
                                borderRadius: BorderRadius.circular(12),
                                child: const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Icon(Icons.add_rounded,
                                      size: 16, color: AppColors.primary),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              Formatters.currency(itemTotal),
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                            if (hasDiscount && originalItemTotal != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                Formatters.currency(originalItemTotal),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[400],
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoteSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.edit_note_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Ghi chú đơn hàng',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const Spacer(),
              ValueListenableBuilder<TextEditingValue>(
                valueListenable: _noteController,
                builder: (context, value, _) {
                  return Text(
                    '${value.text.length}/200',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _noteController,
            maxLines: 2,
            maxLength: 200,
            buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
            decoration: InputDecoration(
              hintText: 'Nhập ghi chú cho nhà hàng (ví dụ: không hành, ít cay...)',
              hintStyle: const TextStyle(color: AppColors.textHint, fontSize: 12),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              filled: true,
              fillColor: AppColors.surfaceVariant,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
            ),
            style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
            textInputAction: TextInputAction.done,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    final selectedCount = _selectedItemIds.length;
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.of(context).padding.bottom + 42),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Đã chọn $selectedCount món',
                style: const TextStyle(
                    fontWeight: FontWeight.w600, color: AppColors.textPrimary),
              ),
              Text(
                Formatters.currency(_selectedSubtotal),
                style: const TextStyle(
                    fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: selectedCount > 0
                  ? () => context.push(
                        '/checkout',
                        extra: {
                          'selectedItemIds': _selectedItemIds.toList(),
                          'note': _noteController.text.trim(),
                        },
                      )
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                textStyle: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: Text(selectedCount > 0 ? 'Thanh toán' : 'Vui lòng chọn món'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_cart_outlined,
                size: 100, color: Colors.grey[300]),
            const SizedBox(height: 20),
            const Text(
              'Giỏ hàng trống',
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'Khám phá thực đơn và thêm món ngay nhé!',
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => context.go('/menu'),
                icon: const Icon(Icons.restaurant_menu),
                label: const Text('Khám phá thực đơn'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
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
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 15, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 44,
              child: ElevatedButton.icon(
                onPressed: _loadCart,
                icon: const Icon(Icons.refresh, size: 20),
                label: const Text('Thử lại'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStoreHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.storefront_rounded, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _storeName ?? 'Cửa hàng',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Giao hàng nhanh • Đảm bảo chất lượng',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Upsell Section ──

  Widget _buildUpsellSection() {
    if (_isLoadingUpsell) {
      return Padding(
        padding: const EdgeInsets.only(top: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(left: 4),
              child: Text(
                'Gọi thêm',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 140,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 4,
                itemBuilder: (_, _) => Container(
                  width: 140,
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
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (_upsellProducts.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.add_shopping_cart_rounded,
                      color: AppColors.primary, size: 18),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Gọi thêm',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 200,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(left: 2, right: 2),
              itemCount: _upsellProducts.length,
              itemBuilder: (_, index) =>
                  _buildUpsellCard(_upsellProducts[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpsellCard(Map<String, dynamic> product) {
    final name = product['name'] as String? ?? 'Món ăn';
    
    final campaignPrice = (product['campaignPrice'] as num?)?.toDouble();
    final price = campaignPrice ?? (product['price'] as num?)?.toDouble() ?? 0;
    
    final image = product['image'] as String?;
    final originalPrice = campaignPrice != null ? (product['price'] as num?)?.toDouble() : null;
    final hasDiscount = originalPrice != null && originalPrice > price;
    
    final productId = product['_id'] as String? ?? '';
    final isAdding = _addingToCart.contains(productId);

    return GestureDetector(
      onTap: () => context.push('/food/$productId'),
      child: Container(
        width: 140,
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
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    image != null && image.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: image,
                            fit: BoxFit.cover,
                            placeholder: (_, _) =>
                                Container(color: AppColors.surfaceVariant),
                            errorWidget: (_, _, _) => Container(
                              color: AppColors.surfaceVariant,
                              child: const Icon(Icons.restaurant,
                                  color: AppColors.primary, size: 28),
                            ),
                          )
                        : Container(
                            color: AppColors.surfaceVariant,
                            child: const Icon(Icons.restaurant,
                                color: AppColors.primary, size: 28),
                          ),
                    if (hasDiscount)
                      Positioned(
                        top: 0,
                        left: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.only(
                              topLeft: Radius.circular(16),
                              bottomRight: Radius.circular(8),
                            ),
                          ),
                          child: Text(
                            '-${((originalPrice - price) / originalPrice * 100).round()}%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
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
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          Formatters.currency(price),
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
                              Formatters.currency(originalPrice),
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
                    Align(
                      alignment: Alignment.centerRight,
                      child: GestureDetector(
                        onTap:
                            isAdding ? null : () => _addToCartUpsell(product),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: isAdding
                                ? AppColors.primary.withValues(alpha: 0.5)
                                : AppColors.primary,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.2),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: isAdding
                              ? const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white),
                                )
                              : const Icon(Icons.add_rounded,
                                  color: Colors.white, size: 20),
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

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 4,
        itemBuilder: (_, _) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 104,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}
