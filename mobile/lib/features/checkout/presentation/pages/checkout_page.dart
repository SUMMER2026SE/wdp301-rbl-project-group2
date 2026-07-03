import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/constants/danang_locations.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/core/utils/permission_utils.dart';
import 'package:foa_mobile/core/utils/shipping.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_cubit.dart';
import 'package:foa_mobile/features/stores/presentation/widgets/store_selector_bottom_sheet.dart';

class CheckoutPage extends StatefulWidget {
  final List<String>? selectedItemIds;
  final String? note;

  const CheckoutPage({super.key, this.selectedItemIds, this.note});

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  final Dio _dio = ApiClient().dio;

  bool _isLoading = true;
  bool _isPlacing = false;
  String? _error;

  List<Map<String, dynamic>> _items = [];
  double _subtotal = 0;
  Map<String, dynamic>? _selectedAddress;
  List<Map<String, dynamic>> _addresses = [];

  // Store — managed by StoreCubit
  Map<String, dynamic>? _selectedStore;

  // Voucher
  final TextEditingController _voucherController = TextEditingController();
  bool _isApplyingVoucher = false;
  String? _appliedVoucher;
  double _discountAmount = 0;
  String? _voucherError;
  String? _voucherMessage;
  List<Map<String, dynamic>> _availableVouchers = [];

  // Payment
  String _paymentMethod = 'cash';

  // Note
  final TextEditingController _noteController = TextEditingController();

  // Shipping
  ShippingConfig _shippingConfig = const ShippingConfig();
  ShippingResult? _shippingResult;

  @override
  void initState() {
    super.initState();
    if (widget.note != null && widget.note!.isNotEmpty) {
      _noteController.text = widget.note!;
    }
    _loadData();
  }

  @override
  void dispose() {
    _voucherController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Capture store cubit before async gap
    final storeCubit = context.read<StoreCubit>();

    try {
      final results = await Future.wait([
        _dio.get(ApiEndpoints.cart),
        _dio.get(ApiEndpoints.vouchers, queryParameters: {'isActive': true}),
        _dio.get(ApiEndpoints.settings),
      ]);

      // Parse cart
      final r = results[0];
      final d = r.data;
      final cd = d is Map
          ? (d['data'] as Map<String, dynamic>? ?? Map<String, dynamic>.from(d))
          : <String, dynamic>{};
      final ir = (cd['items'] as List<dynamic>? ?? []);

      // Parse vouchers
      final voucherRes = results[1];
      final vd = voucherRes.data;
      final voucherList = vd is Map
          ? (vd['data'] as List<dynamic>? ?? [])
          : (vd as List<dynamic>? ?? []);
      final vouchers = voucherList
          .map((e) => e as Map<String, dynamic>)
          .toList();

      // Parse settings (shipping config)
      final settingsRes = results[2];
      final sd = settingsRes.data;
      final settingsData = sd is Map
          ? (sd['data'] as Map<String, dynamic>? ?? sd)
          : <String, dynamic>{};
      final shippingConfig = ShippingConfig(
        baseDeliveryFee:
            double.tryParse(
              (settingsData['baseDeliveryFee'] as String? ?? '15000'),
            ) ??
            15000,
        feePerKm:
            double.tryParse((settingsData['feePerKm'] as String? ?? '5000')) ??
            5000,
        freeDeliveryEnabled:
            settingsData['freeDeliveryEnabled'] as bool? ?? true,
        freeDeliveryThreshold:
            double.tryParse(
              (settingsData['freeDeliveryThreshold'] as String? ?? '300000'),
            ) ??
            300000,
      );

      var selectedStore = storeCubit.state.selectedStore;

      if (selectedStore == null) {
        final savedStoreId = LocalStorage.selectedStoreId;
        if (savedStoreId != null &&
            savedStoreId.isNotEmpty &&
            storeCubit.state.stores.isNotEmpty) {
          selectedStore = storeCubit.state.stores.firstWhere(
            (s) => s['_id'] == savedStoreId,
            orElse: () => storeCubit.state.stores.first,
          );
        } else if (storeCubit.state.stores.isNotEmpty) {
          selectedStore = storeCubit.state.stores.first;
        }
      }

      if (!mounted) return;

      // Filter items
      var items = ir.map((e) => e as Map<String, dynamic>).toList();
      if (widget.selectedItemIds != null &&
          widget.selectedItemIds!.isNotEmpty) {
        items = items.where((item) {
          final id = (item['itemId'] ?? item['_id'])?.toString() ?? '';
          return widget.selectedItemIds!.contains(id);
        }).toList();
        if (items.isEmpty) {
          items = ir.map((e) => e as Map<String, dynamic>).toList();
        }
      }

      double computedSubtotal = 0;
      for (final item in items) {
        final price = (item['price'] as num?)?.toDouble() ?? 0;
        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
        computedSubtotal += price * qty;
      }

      // Get user addresses
      final authState = context.read<AuthBloc>().state;
      final user = authState is AuthAuthenticated
          ? authState.user
          : <String, dynamic>{};
      final addresses =
          (user['addresses'] as List<dynamic>?)
              ?.whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList() ??
          [];
      final defaultAddr = addresses.isEmpty
          ? null
          : (addresses.indexWhere((a) => a['isDefault'] == true) >= 0
                ? addresses.firstWhere((a) => a['isDefault'] == true)
                : addresses.first);

      setState(() {
        _items = items;
        _subtotal = computedSubtotal;
        _selectedStore = selectedStore;
        _availableVouchers = vouchers;
        _shippingConfig = shippingConfig;
        _addresses = addresses;
        if (_selectedAddress == null && defaultAddr != null) {
          _selectedAddress = defaultAddr;
        }
        _isLoading = false;
      });

      _recalcShipping();
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error =
            e.type == DioExceptionType.connectionError ||
                e.type == DioExceptionType.connectionTimeout
            ? 'Không có kết nối mạng'
            : 'Không thể tải thông tin thanh toán';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = 'Đã xảy ra lỗi';
      });
    }
  }

  void _recalcShipping() {
    if (_selectedAddress == null || _selectedStore == null) {
      _shippingResult = null;
      return;
    }
    final loc = _selectedStore!['location'];
    List<double>? coords;
    if (loc != null && loc['coordinates'] is List) {
      final raw = loc['coordinates'] as List;
      if (raw.length >= 2) {
        coords = [(raw[0] as num).toDouble(), (raw[1] as num).toDouble()];
      }
    }
    _shippingResult = calculateShippingFee(
      ward: _selectedAddress!['ward'] as String? ?? '',
      city: _selectedAddress!['city'] as String? ?? '',
      subtotal: _subtotal,
      storeCoordinates: coords,
      config: _shippingConfig,
    );
  }

  // ── Address ──

  bool _isLocating = false;

  Future<void> _locateAddress() async {
    final granted = await PermissionUtils.requestLocation();
    if (!granted) {
      if (mounted) {
        _snack('Vui lòng cấp quyền truy cập vị trí', AppColors.warning);
      }
      return;
    }
    if (!mounted) return;

    // Capture user info before async gap
    final authState = context.read<AuthBloc>().state;
    final user = authState is AuthAuthenticated
        ? authState.user
        : <String, dynamic>{};
    final userName =
        user['fullName'] as String? ?? user['username'] as String? ?? '';
    final userPhone = user['phone'] as String? ?? '';

    setState(() => _isLocating = true);
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 6),
        ),
      );

      // Find nearest ward by distance (same approach as web frontend)
      final nearestWard = _findNearestWard(
        position.latitude,
        position.longitude,
      );

      // Auto-select GPS address immediately (like web)
      final gpsAddr = <String, dynamic>{
        'label': 'Vị trí hiện tại',
        'receiverName': userName.isNotEmpty ? userName : 'Người nhận',
        'phone': userPhone,
        'detail': 'Vị trí GPS',
        'ward': nearestWard,
        'city': DanangLocations.deliverableCity,
        'isDefault': false,
      };

      if (mounted) {
        setState(() {
          _selectedAddress = gpsAddr;
          _isLocating = false;
        });
        _recalcShipping();
      }

      // Try Photon for better detail (async, non-blocking)
      try {
        final photonRes = await Dio().get(
          'https://photon.komoot.io/reverse',
          queryParameters: {
            'lon': position.longitude.toString(),
            'lat': position.latitude.toString(),
          },
        );
        final features = photonRes.data['features'] as List<dynamic>?;
        if (features != null && features.isNotEmpty) {
          final props = features.first['properties'];
          final houseNumber = props['housenumber'] as String?;
          final street = props['street'] as String?;
          final placeName = props['name'] as String?;

          String resolvedDetail = houseNumber != null && street != null
              ? '$houseNumber $street'
              : street != null
              ? '$placeName, $street'
              : placeName ?? 'Vị trí GPS';

          // Match ward from Photon
          String resolvedWard = nearestWard;
          final photonWard =
              props['locality'] as String? ??
              props['district'] as String? ??
              '';
          if (photonWard.isNotEmpty) {
            final normalizedPhoton = photonWard
                .replaceAll(RegExp(r'^(phường|xã)\s+', multiLine: true), '')
                .trim()
                .toLowerCase();
            for (final w in DanangLocations.deliverableWards) {
              final normalizedKnown = w
                  .replaceAll(RegExp(r'^(phường|xã)\s+', multiLine: true), '')
                  .trim()
                  .toLowerCase();
              if (normalizedKnown == normalizedPhoton ||
                  normalizedKnown.contains(normalizedPhoton) ||
                  normalizedPhoton.contains(normalizedKnown)) {
                resolvedWard = w;
                break;
              }
            }
          }

          if (mounted) {
            final updatedAddr = Map<String, dynamic>.from(gpsAddr);
            updatedAddr['detail'] = resolvedDetail;
            updatedAddr['ward'] = resolvedWard;
            setState(() => _selectedAddress = updatedAddr);
            _recalcShipping();
          }
        }
      } catch (_) {
        // Photon failed, GPS address already set above — silently ok
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLocating = false);
        _snack('Không thể xác định vị trí. Vui lòng thử lại.', AppColors.error);
      }
    }
  }

  /// Find nearest known ward to GPS coordinates (same approach as web)
  String _findNearestWard(double lat, double lng) {
    double minDist = double.infinity;
    String nearest = '';
    for (final entry in wardCentroids.entries) {
      final coords = entry.value;
      if (coords.length < 2) continue;
      final dist = calculateDistance(lat, lng, coords[1], coords[0]);
      if (dist < minDist) {
        minDist = dist;
        nearest = entry.key;
      }
    }
    return nearest.isNotEmpty
        ? nearest
        : DanangLocations.deliverableWards.first;
  }

  Future<void> _showAddressPicker() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text(
                'Chọn địa chỉ giao hàng',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
            ),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _addresses.length,
                itemBuilder: (context, index) {
                  final addr = _addresses[index];
                  final isSelected = addr == _selectedAddress;
                  return ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary.withValues(alpha: 0.1)
                            : Colors.grey[100],
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.location_on_outlined,
                        color: isSelected
                            ? AppColors.primary
                            : Colors.grey[500],
                        size: 20,
                      ),
                    ),
                    title: Text(
                      addr['receiverName'] as String? ?? '',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      '${addr['detail'] ?? ''}, ${addr['ward'] ?? ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12),
                    ),
                    trailing: isSelected
                        ? const Icon(
                            Icons.check_circle,
                            color: AppColors.primary,
                          )
                        : null,
                    onTap: () => Navigator.pop(ctx, addr),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (result != null && mounted) {
      setState(() {
        _selectedAddress = result;
      });
      _recalcShipping();
    }
  }

  void _showAddAddressModal({Map<String, dynamic>? prefill}) {
    final nameCtrl = TextEditingController(
      text: prefill?['receiverName'] as String? ?? '',
    );
    final phoneCtrl = TextEditingController(
      text: prefill?['phone'] as String? ?? '',
    );
    final detailCtrl = TextEditingController(
      text: prefill?['detail'] as String? ?? '',
    );
    var selectedWard = prefill?['ward'] as String? ?? '';
    var isDefault = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        bool saving = false;
        return StatefulBuilder(
          builder: (ctx, setSheetState) => Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 14,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Thêm địa chỉ',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Người nhận *',
                      hintText: 'Nhập tên người nhận',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Số điện thoại *',
                      hintText: '0xxxxxxxxx',
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: const [DanangLocations.deliverableCity].first,
                    decoration: const InputDecoration(labelText: 'Thành phố'),
                    items: const [DanangLocations.deliverableCity]
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: saving ? null : (_) {},
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: selectedWard.isEmpty ? null : selectedWard,
                    decoration: const InputDecoration(labelText: 'Phường/Xã *'),
                    items: DanangLocations.deliverableWards
                        .map((w) => DropdownMenuItem(value: w, child: Text(w)))
                        .toList(),
                    onChanged: saving
                        ? null
                        : (value) {
                            setSheetState(() {
                              selectedWard = value ?? '';
                            });
                          },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: detailCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Địa chỉ chi tiết *',
                      hintText: 'Số nhà, tên đường',
                    ),
                  ),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    value: isDefault,
                    onChanged: (value) =>
                        setSheetState(() => isDefault = value ?? false),
                    title: const Text(
                      'Đặt làm địa chỉ mặc định',
                      style: TextStyle(fontSize: 14),
                    ),
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    dense: true,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: saving
                          ? null
                          : () async {
                              setSheetState(() => saving = true);
                              final receiverName = nameCtrl.text.trim();
                              final phone = phoneCtrl.text.replaceAll(
                                RegExp(r'\s+'),
                                '',
                              );
                              final detail = detailCtrl.text.trim();
                              final ward = selectedWard;

                              String? msg;
                              if (receiverName.isEmpty) {
                                msg = 'Vui lòng nhập người nhận';
                              } else if (!RegExp(
                                r'^0\d{8,10}$',
                              ).hasMatch(phone)) {
                                msg = 'Số điện thoại không hợp lệ';
                              } else if (ward.isEmpty) {
                                msg = 'Vui lòng chọn phường/xã';
                              } else if (detail.isEmpty) {
                                msg = 'Vui lòng nhập địa chỉ chi tiết';
                              }
                              if (msg != null) {
                                setSheetState(() => saving = false);
                                ScaffoldMessenger.of(
                                  ctx,
                                ).showSnackBar(SnackBar(content: Text(msg)));
                                return;
                              }

                              final newAddr = <String, dynamic>{
                                'label': 'home',
                                'receiverName': receiverName,
                                'phone': phone,
                                'detail': detail,
                                'ward': ward,
                                'city': DanangLocations.deliverableCity,
                                'isDefault': isDefault,
                              };

                              try {
                                final updated = [..._addresses, newAddr];
                                await _dio.patch(
                                  ApiEndpoints.userAddresses,
                                  data: {'addresses': updated},
                                );
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (mounted) {
                                  setState(() {
                                    _addresses = updated;
                                    _selectedAddress = newAddr;
                                  });
                                  _recalcShipping();
                                }
                              } on DioException catch (e) {
                                if (!ctx.mounted) return;
                                final msg2 =
                                    e.response?.data['message'] as String? ??
                                    'Lưu thất bại';
                                setSheetState(() => saving = false);
                                ScaffoldMessenger.of(
                                  ctx,
                                ).showSnackBar(SnackBar(content: Text(msg2)));
                              } catch (_) {
                                if (!ctx.mounted) return;
                                setSheetState(() => saving = false);
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  const SnackBar(
                                    content: Text('Đã xảy ra lỗi'),
                                  ),
                                );
                              }
                            },
                      child: saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Thêm địa chỉ'),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ── Voucher ──

  Future<void> _applyVoucher({String? code}) async {
    final voucherCode = code ?? _voucherController.text.trim();
    if (voucherCode.isEmpty) return;
    setState(() {
      _isApplyingVoucher = true;
      _voucherError = null;
      _voucherMessage = null;
    });
    try {
      final r = await _dio.post(
        ApiEndpoints.voucherValidate,
        data: {
          'code': voucherCode,
          'orderAmount': _subtotal,
          'userId': context.read<AuthBloc>().state is AuthAuthenticated
              ? (context.read<AuthBloc>().state as AuthAuthenticated)
                        .user['_id']
                    as String?
              : null,
        },
      );
      final d = r.data;
      final vd = d is Map
          ? (d['data'] as Map<String, dynamic>? ?? Map<String, dynamic>.from(d))
          : <String, dynamic>{};
      final type = vd['discountType'] as String? ?? 'percentage';
      final value = (vd['discountValue'] as num?)?.toDouble() ?? 0;
      final maxD = (vd['maxDiscount'] as num?)?.toDouble();
      double disc = type == 'percentage' ? _subtotal * value / 100 : value;
      if (maxD != null && disc > maxD) disc = maxD;
      if (!mounted) return;
      setState(() {
        _appliedVoucher = voucherCode;
        _discountAmount = disc;
        _isApplyingVoucher = false;
        _voucherMessage = 'Đã áp dụng mã giảm giá!';
      });
    } on DioException catch (e) {
      if (!mounted) return;
      final msg = e.response?.data is Map
          ? ((e.response!.data as Map)['message'] as String? ??
                'Mã giảm giá không hợp lệ')
          : 'Mã giảm giá không hợp lệ';
      setState(() {
        _voucherError = msg;
        _isApplyingVoucher = false;
      });
    }
  }

  void _removeVoucher() {
    setState(() {
      _appliedVoucher = null;
      _discountAmount = 0;
      _voucherController.clear();
      _voucherError = null;
      _voucherMessage = null;
    });
  }

  void _selectVoucherChip(Map<String, dynamic> voucher) {
    final code = voucher['code'] as String? ?? '';
    if (code.isEmpty) return;
    _voucherController.text = code;
    _applyVoucher(code: code);
  }

  // ── Place Order ──

  Future<void> _removeCheckedOutItemsFromCart() async {
    try {
      await Future.wait(
        _items.map((item) {
          final productIdRaw = item['productId'];
          final prod = productIdRaw is Map<String, dynamic>
              ? productIdRaw
              : (item['product'] as Map<String, dynamic>? ?? item);
          final productId = productIdRaw is String
              ? productIdRaw
              : (prod['_id'] as String? ?? '');
          if (productId.isEmpty) return Future<void>.value();

          final rawVariations = item['variations'] as List<dynamic>?;
          final variations =
              rawVariations
                  ?.whereType<Map<String, dynamic>>()
                  .map(
                    (v) => {
                      'name': v['name'] as String? ?? '',
                      'choice': v['choice'] as String? ?? '',
                    },
                  )
                  .where((v) => v['name']!.isNotEmpty)
                  .toList() ??
              <Map<String, String>>[];

          return _dio.delete(
            ApiEndpoints.cartRemove,
            data: {'productId': productId, 'variations': variations},
          );
        }),
      );
    } catch (e) {
      debugPrint('CHECKOUT_REMOVE_CART_ITEMS_ERROR: $e');
    }
  }

  Future<void> _placeOrder() async {
    final validationMsg = _checkoutValidationMessage();
    if (validationMsg != null) {
      _snack(validationMsg, AppColors.warning);
      return;
    }

    setState(() => _isPlacing = true);
    try {
      final selectedStoreId = _selectedStore?['_id'] as String? ?? '';
      final body = <String, dynamic>{
        'paymentMethod': _paymentMethod,
        if (_appliedVoucher != null) 'voucher': _appliedVoucher,
        if (_noteController.text.trim().isNotEmpty)
          'note': _noteController.text.trim(),
        'deliveryAddress': {
          'receiverName': _selectedAddress!['receiverName'] ?? '',
          'phone': _selectedAddress!['phone'] ?? '',
          'detail': _selectedAddress!['detail'] ?? '',
          'ward': _selectedAddress!['ward'] ?? '',
          'city': _selectedAddress!['city'] ?? '',
        },
        'items': _items.map((item) {
          final productIdRaw = item['productId'];
          final prod = productIdRaw is Map<String, dynamic>
              ? productIdRaw
              : (item['product'] as Map<String, dynamic>? ?? item);
          final productId = productIdRaw is String
              ? productIdRaw
              : (prod['_id'] as String? ?? '');
          final qty = (item['quantity'] as num?)?.toInt() ?? 1;
          final rawVariations = item['variations'] as List<dynamic>?;
          final variations = rawVariations
              ?.whereType<Map<String, dynamic>>()
              .map(
                (v) => {
                  'name': v['name'] as String? ?? '',
                  'choice': v['choice'] as String? ?? '',
                },
              )
              .where((v) => v['name']!.isNotEmpty)
              .toList();
          return <String, dynamic>{
            'productId': productId,
            'quantity': qty,
            if (variations != null && variations.isNotEmpty)
              'variations': variations,
          };
        }).toList(),
        'storeId': selectedStoreId,
        if (_shippingResult != null)
          'shippingFee': _shippingResult!.fee.toInt(),
      };

      final r = await _dio.post(ApiEndpoints.orders, data: body);
      final d = r.data;
      final od = d is Map
          ? (d['data'] as Map<String, dynamic>? ?? Map<String, dynamic>.from(d))
          : <String, dynamic>{};
      final id = od['_id'] as String? ?? od['id'] as String? ?? '';
      final checkoutUrl = od['checkoutUrl'] as String?;

      if (!mounted) return;

      if (checkoutUrl != null && checkoutUrl.isNotEmpty) {
        final result = await context.push<bool>(
          '/payment-webview',
          extra: checkoutUrl,
        );
        if (result == true && mounted && id.isNotEmpty) {
          await _removeCheckedOutItemsFromCart();
          if (!mounted) return;
          context.pushReplacement('/order-success/$id');
        } else if (mounted && id.isNotEmpty) {
          context.pushReplacement('/order-failed/$id');
        }
        return;
      }

      if (id.isNotEmpty) {
        await _removeCheckedOutItemsFromCart();
        if (!mounted) return;
        context.pushReplacement('/order-success/$id');
      } else {
        context.pushReplacement('/order-failed/unknown');
      }
    } on DioException catch (e) {
      if (!mounted) return;
      final statusCode = e.response?.statusCode;
      var msg = e.response?.data is Map
          ? ((e.response!.data as Map)['message'] as String? ??
                'Không thể đặt hàng')
          : 'Không thể đặt hàng';

      if (statusCode == 400) {
        msg = 'Đơn hàng không hợp lệ';
      } else if (statusCode == 422) {
        msg = 'Thông tin đơn hàng không hợp lệ. Vui lòng kiểm tra lại.';
        final errors = e.response?.data is Map
            ? (e.response!.data as Map)['errors']
            : null;
        if (errors is List && errors.isNotEmpty) {
          final details = errors
              .map((e) => (e is Map ? e['message'] ?? '' : e.toString()))
              .where((s) => s.toString().isNotEmpty)
              .join(', ');
          if (details.isNotEmpty) {
            _snack(details.toString(), AppColors.error);
            setState(() => _isPlacing = false);
            return;
          }
        }
      }
      _snack(msg, AppColors.error);
      setState(() => _isPlacing = false);
    } catch (_) {
      if (!mounted) return;
      _snack('Đặt hàng thất bại. Vui lòng thử lại.', AppColors.error);
      setState(() => _isPlacing = false);
    }
  }

  // ── Helpers ──

  bool get _canUsePayos => _total >= 2000;

  double get _deliveryFee => _shippingResult?.fee ?? 0;

  double get _total =>
      (_subtotal + _deliveryFee - _discountAmount).clamp(0, double.infinity);

  String? _checkoutValidationMessage() {
    if (_items.isEmpty) return 'Giỏ hàng trống';
    if (_selectedStore == null) return 'Vui lòng chọn cửa hàng';
    final addr = _selectedAddress;
    if (addr == null) return 'Vui lòng chọn địa chỉ giao hàng';
    final rn = (addr['receiverName'] as String? ?? '').trim();
    final ph = (addr['phone'] as String? ?? '').replaceAll(RegExp(r'\s+'), '');
    final dt = (addr['detail'] as String? ?? '').trim();
    final wd = (addr['ward'] as String? ?? '').trim();
    final ct = (addr['city'] as String? ?? '').trim();
    if (rn.isEmpty) return 'Vui lòng nhập tên người nhận';
    if (!RegExp(r'^0\d{8,10}$').hasMatch(ph)) {
      return 'Số điện thoại không hợp lệ';
    }
    if (dt.isEmpty) return 'Vui lòng nhập số nhà, tên đường cụ thể';
    if (!DanangLocations.isDeliverableCity(ct)) {
      return 'Hiện chỉ giao hàng trong khu vực Đà Nẵng';
    }
    if (!DanangLocations.isDeliverableWard(wd)) {
      return 'Địa chỉ nằm ngoài vùng giao hàng';
    }
    if (_shippingResult?.blocked == true) {
      return _shippingResult!.reason ?? 'Không thể giao đến địa chỉ này';
    }
    return null;
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    // Listen to StoreCubit for store changes
    final storeState = context.watch<StoreCubit>().state;
    if (storeState.selectedStore != null &&
        storeState.selectedStore!['_id'] != _selectedStore?['_id']) {
      _selectedStore = storeState.selectedStore;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _recalcShipping();
          setState(() {});
        }
      });
    }

    try {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/cart');
              }
            },
          ),
          title: const Text(
            'Thanh toán',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          backgroundColor: Colors.white,
          elevation: 0,
        ),
        body: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : _error != null
            ? _buildError()
            : _items.isEmpty
            ? const Center(child: Text('Giỏ hàng trống'))
            : _buildForm(),
        bottomNavigationBar: _items.isEmpty ? null : _buildBottomBar(),
      );
    } catch (e, stack) {
      debugPrint('CHECKOUT_PAGE_BUILD_ERROR: $e\n$stack');
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Thanh toán'),
          backgroundColor: Colors.white,
          elevation: 0,
        ),
        body: _buildRenderError(e, stack),
      );
    }
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
                fontSize: 15,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 44,
              child: ElevatedButton.icon(
                onPressed: _loadData,
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

  Widget _buildRenderError(Object error, StackTrace stack) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error, size: 48),
              const SizedBox(height: 12),
              const Text(
                'Không thể hiển thị màn hình thanh toán',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              SelectableText(
                '$error',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
    try {
      return SafeArea(
        top: false,
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildStoreSection(),
              const SizedBox(height: 16),
              _buildAddressSection(),
              const SizedBox(height: 16),
              _buildItemsSection(),
              const SizedBox(height: 16),
              _buildVoucherSection(),
              const SizedBox(height: 16),
              _buildPaymentSection(),
              const SizedBox(height: 16),
              _buildNoteSection(),
            ],
          ),
        ),
      );
    } catch (e, stack) {
      debugPrint("CHECKOUT_BUILD_ERROR: $e\n$stack");
      return _buildRenderError(e, stack);
    }
  }

  // ── Section: Store ──

  Widget _buildStoreSection() {
    return _sectionCard(
      children: [
        _sectionTitle(Icons.storefront_outlined, 'Cửa hàng nhận đơn'),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: _showStoreSelector,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.3),
                width: 1.5,
              ),
              color: AppColors.primary.withValues(alpha: 0.04),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.store,
                    color: AppColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedStore?['name'] as String? ?? 'Chọn cửa hàng',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (_selectedStore?['address'] != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          _selectedStore!['address'] as String,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      if (_shippingResult?.distance != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          '~${_shippingResult!.distance!.toStringAsFixed(1)}km từ bạn',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.primary.withValues(alpha: 0.7),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.chevron_right,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _showStoreSelector() async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return const StoreSelectorBottomSheet(isClosable: true);
      },
    );
    if (mounted) {
      final store = context.read<StoreCubit>().state.selectedStore;
      if (store != null) {
        setState(() => _selectedStore = store);
        _recalcShipping();
      }
    }
  }

  // ── Section: Address ──

  Widget _buildAddressSection() {
    final selectedAddress = _selectedAddress;
    return _sectionCard(
      children: [
        _sectionTitle(Icons.location_on_outlined, 'Địa chỉ giao hàng'),
        const SizedBox(height: 10),
        if (selectedAddress != null) _buildAddressCard(selectedAddress),
        const SizedBox(height: 10),
        Row(
          children: [
            if (_addresses.length > 1)
              Expanded(
                child: _addressActionButton(
                  icon: Icons.list_alt_outlined,
                  label: 'Chọn địa chỉ khác',
                  onPressed: _showAddressPicker,
                ),
              ),
            Expanded(
              child: _addressActionButton(
                icon: Icons.add_location_outlined,
                label: 'Thêm địa chỉ',
                onPressed: () => _showAddAddressModal(),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _isLocating ? null : _locateAddress,
            icon: _isLocating
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.gps_fixed, size: 18),
            label: Text(
              _isLocating ? 'Đang định vị...' : 'Định vị địa chỉ của tôi',
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor:
                  _selectedAddress != null &&
                      _selectedAddress!['label'] == 'Vị trí hiện tại'
                  ? AppColors.success
                  : AppColors.primary,
              side: BorderSide(
                color:
                    _selectedAddress != null &&
                        _selectedAddress!['label'] == 'Vị trí hiện tại'
                    ? AppColors.success
                    : AppColors.primary,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _addressActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        side: BorderSide(color: AppColors.primary.withValues(alpha: 0.5)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    );
  }

  Widget _buildAddressCard(Map<String, dynamic> addr) {
    final isDefault = addr['isDefault'] == true;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
          width: 1.5,
        ),
        color: AppColors.primary.withValues(alpha: 0.03),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.location_on,
              color: AppColors.primary,
              size: 22,
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
                        '${addr['receiverName'] ?? ''} | ${Formatters.phone(addr['phone'] as String? ?? '')}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isDefault)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Mặc định',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${addr['detail'] ?? ''}, ${addr['ward'] ?? ''}, ${addr['city'] ?? ''}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Section: Items ──

  Widget _buildItemsSection() {
    return _sectionCard(
      children: [
        _sectionTitle(
          Icons.shopping_bag_outlined,
          'Món đã chọn (${_items.length})',
        ),
        const SizedBox(height: 10),
        ..._items.take(4).map(_itemTile),
        if (_items.length > 4)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Center(
              child: TextButton(
                onPressed: _showAllItemsDialog,
                child: Text('Xem chi tiết (+${_items.length - 4} sản phẩm)'),
              ),
            ),
          ),
      ],
    );
  }

  Widget _itemTile(Map<String, dynamic> item) {
    final prodRaw = item['productId'];
    final p = prodRaw is Map<String, dynamic>
        ? prodRaw
        : (item['product'] as Map<String, dynamic>? ?? item);
    final n =
        p['name'] as String? ??
        item['productName'] as String? ??
        item['name'] as String? ??
        'Món';
    final q = (item['quantity'] as num?)?.toInt() ?? 1;
    final pr =
        (item['price'] as num?)?.toDouble() ??
        (p['price'] as num?)?.toDouble() ??
        0;

    // Extract image URL
    String? imageUrl;
    final image = p['image'];
    if (image is String && image.isNotEmpty) {
      imageUrl = image;
    } else if (image is Map<String, dynamic>) {
      imageUrl = image['secureUrl'] as String? ?? image['url'] as String?;
    }

    final rawVariations = item['variations'] as List<dynamic>?;
    final variations =
        rawVariations?.whereType<Map<String, dynamic>>().toList() ?? [];

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(
              width: 52,
              height: 52,
              child: imageUrl != null
                  ? CachedNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      placeholder: (_, _) => Container(
                        color: Colors.grey[200],
                        child: const Icon(
                          Icons.image_outlined,
                          color: Colors.grey,
                          size: 20,
                        ),
                      ),
                      errorWidget: (_, _, _) => Container(
                        color: Colors.grey[200],
                        child: const Icon(
                          Icons.fastfood_outlined,
                          color: AppColors.primary,
                          size: 22,
                        ),
                      ),
                    )
                  : Container(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      child: const Icon(
                        Icons.fastfood_outlined,
                        color: AppColors.primary,
                        size: 22,
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
                  n,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (variations.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 3,
                    children: variations.map((v) {
                      final vName = v['name'] as String? ?? '';
                      final vChoice = v['choice'] as String? ?? '';
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$vName: $vChoice',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey[600],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                Formatters.currency(pr * q),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'x$q',
                style: TextStyle(fontSize: 11, color: Colors.grey[500]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAllItemsDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sản phẩm trong đơn'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: _items.length,
            itemBuilder: (_, i) => _itemTile(_items[i]),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  // ── Section: Voucher ──

  void _showVoucherPicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text(
                'Chọn mã giảm giá',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
            ),
            Flexible(
              child: _availableVouchers.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'Không có mã giảm giá khả dụng',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _availableVouchers.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final v = _availableVouchers[index];
                        final code = v['code'] as String? ?? '';
                        final title = v['title'] as String? ?? '';
                        final isPct =
                            v['discountPercent'] != null &&
                            (v['discountPercent'] as num) > 0;
                        final discountLabel = isPct
                            ? 'Giảm ${v['discountPercent']}%'
                            : 'Giảm ${Formatters.currency(v['discountAmount'] as num? ?? 0)}';
                        final minOrder =
                            (v['minOrderAmount'] as num?)?.toDouble() ??
                            (v['minOrderValue'] as num?)?.toDouble() ??
                            0;
                        final canApply = _subtotal >= minOrder;
                        final maxDiscount =
                            v['maxDiscountAmount'] as num? ??
                            v['maxDiscount'] as num?;

                        return Opacity(
                          opacity: canApply ? 1.0 : 0.5,
                          child: ListTile(
                            onTap: canApply
                                ? () {
                                    Navigator.pop(ctx);
                                    _selectVoucherChip(v);
                                  }
                                : null,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            tileColor: AppColors.primary.withValues(
                              alpha: 0.04,
                            ),
                            leading: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: canApply
                                    ? AppColors.primary.withValues(alpha: 0.1)
                                    : Colors.grey[100],
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.local_offer,
                                color: canApply
                                    ? AppColors.primary
                                    : Colors.grey,
                                size: 22,
                              ),
                            ),
                            title: Text(
                              title.isNotEmpty ? title : code,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: canApply
                                    ? AppColors.textPrimary
                                    : AppColors.textHint,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  discountLabel +
                                      (maxDiscount != null && maxDiscount > 0
                                          ? ' (tối đa ${Formatters.compactCurrency(maxDiscount)})'
                                          : ''),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: canApply
                                        ? AppColors.primary
                                        : Colors.grey[400],
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (minOrder > 0)
                                  Text(
                                    'Đơn tối thiểu ${Formatters.compactCurrency(minOrder)}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: canApply
                                          ? AppColors.textHint
                                          : Colors.grey[400],
                                    ),
                                  ),
                              ],
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  code,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: 'monospace',
                                    color: canApply
                                        ? AppColors.primary
                                        : Colors.grey[400],
                                  ),
                                ),
                                if (!canApply)
                                  const Padding(
                                    padding: EdgeInsets.only(left: 4),
                                    child: Icon(
                                      Icons.lock,
                                      size: 14,
                                      color: Colors.grey,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildVoucherSection() {
    final applicableVouchers = _availableVouchers.where((v) {
      final minOrder =
          (v['minOrderAmount'] as num?)?.toDouble() ??
          (v['minOrderValue'] as num?)?.toDouble() ??
          0;
      return _subtotal >= minOrder;
    }).toList();

    return _sectionCard(
      children: [
        Row(
          children: [
            Expanded(
              child: _sectionTitle(Icons.local_offer_outlined, 'Mã giảm giá'),
            ),
            TextButton.icon(
              onPressed: _showVoucherPicker,
              icon: const Icon(Icons.confirmation_number_outlined, size: 16),
              label: const Text(
                'Chọn mã',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _appliedVoucher != null
            ? _appliedVoucherWidget()
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (applicableVouchers.isNotEmpty) ...[
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: applicableVouchers.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final v = applicableVouchers[index];
                          final title = v['title'] as String? ?? '';
                          final isPct =
                              v['discountPercent'] != null &&
                              (v['discountPercent'] as num) > 0;
                          final label = isPct
                              ? '-${v['discountPercent']}%'
                              : '-${Formatters.compactCurrency(v['discountAmount'] as num? ?? 0)}';
                          return GestureDetector(
                            onTap: () => _selectVoucherChip(v),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppColors.primary.withValues(alpha: 0.08),
                                    AppColors.primary.withValues(alpha: 0.04),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: AppColors.primary.withValues(
                                    alpha: 0.25,
                                  ),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.local_offer,
                                    color: AppColors.primary,
                                    size: 14,
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      title.isNotEmpty ? title : label,
                                      style: const TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 11,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    label,
                                    style: TextStyle(
                                      color: AppColors.primary.withValues(
                                        alpha: 0.7,
                                      ),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                  _voucherInputWidget(),
                ],
              ),
      ],
    );
  }

  Widget _voucherInputWidget() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _voucherController,
                decoration: InputDecoration(
                  hintText: 'Nhập mã giảm giá',
                  filled: true,
                  fillColor: const Color(0xFFF5F5F5),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  isDense: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppColors.primary,
                      width: 1.5,
                    ),
                  ),
                  errorText: _voucherError,
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppColors.error,
                      width: 1.5,
                    ),
                  ),
                ),
                style: const TextStyle(fontSize: 14),
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _applyVoucher(),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 96,
              height: 46,
              child: ElevatedButton(
                onPressed: _isApplyingVoucher ? null : () => _applyVoucher(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                ),
                child: _isApplyingVoucher
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Áp dụng',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
              ),
            ),
          ],
        ),
        if (_voucherMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              _voucherMessage!,
              style: const TextStyle(color: AppColors.success, fontSize: 12),
            ),
          ),
      ],
    );
  }

  Widget _appliedVoucherWidget() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.check_circle,
              color: AppColors.success,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mã $_appliedVoucher',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                if (_discountAmount > 0)
                  Text(
                    'Giảm ${Formatters.currency(_discountAmount)}',
                    style: const TextStyle(
                      color: AppColors.success,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
              ],
            ),
          ),
          TextButton(
            onPressed: _removeVoucher,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.error,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: Size.zero,
            ),
            child: const Text(
              'Hủy',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  // ── Section: Payment ──

  Widget _buildPaymentSection() {
    return _sectionCard(
      children: [
        _sectionTitle(Icons.payment_outlined, 'Phương thức thanh toán'),
        const SizedBox(height: 12),
        _buildPaymentOption(
          value: 'cash',
          icon: Icons.payments_outlined,
          title: 'Tiền mặt (COD)',
          subtitle: 'Thanh toán khi nhận hàng',
        ),
        const SizedBox(height: 10),
        _buildPaymentOption(
          value: 'bank_transfer',
          icon: Icons.account_balance_outlined,
          title: 'Chuyển khoản (PayOS)',
          subtitle: _canUsePayos
              ? 'Quét mã QR qua ứng dụng ngân hàng'
              : 'Chỉ áp dụng cho đơn từ 2,000₫',
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required String value,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final isSelected = _paymentMethod == value;
    return GestureDetector(
      onTap: () {
        if (value == 'bank_transfer' && !_canUsePayos) {
          _snack(
            'PayOS chỉ áp dụng cho đơn hàng từ 2,000₫ trở lên. Đã chuyển sang COD.',
            AppColors.warning,
          );
          setState(() => _paymentMethod = 'cash');
        } else {
          setState(() => _paymentMethod = value);
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.06)
              : const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.divider,
            width: isSelected ? 1.8 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.12)
                    : const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 20,
                color: isSelected ? AppColors.primary : Colors.grey[500],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? AppColors.primary
                          : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.primary : AppColors.divider,
                  width: 2,
                ),
                color: isSelected ? AppColors.primary : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 12, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  // ── Section: Note ──

  Widget _buildNoteSection() {
    return _sectionCard(
      children: [
        _sectionTitle(Icons.edit_note_outlined, 'Ghi chú'),
        const SizedBox(height: 8),
        TextField(
          controller: _noteController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Ghi chú cho cửa hàng (không bắt buộc)',
            filled: true,
            fillColor: const Color(0xFFF5F5F5),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
            isDense: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 1.5,
              ),
            ),
          ),
          style: const TextStyle(fontSize: 14),
          textInputAction: TextInputAction.newline,
        ),
      ],
    );
  }

  // ── Bottom Bar ──

  Widget _buildBottomBar() {
    final validationMsg = _checkoutValidationMessage();
    final shippingLabel = _selectedAddress == null
        ? 'Vui lòng chọn địa chỉ'
        : _deliveryFee == 0
        ? 'Miễn phí'
        : Formatters.currency(_deliveryFee);

    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
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
          _summaryRow('Tạm tính', Formatters.currency(_subtotal)),
          if (_discountAmount > 0) ...[
            const SizedBox(height: 4),
            _summaryRow(
              'Giảm giá',
              '-${Formatters.currency(_discountAmount)}',
              valueColor: AppColors.success,
            ),
          ],
          const SizedBox(height: 4),
          _summaryRow(
            'Phí giao hàng',
            shippingLabel,
            valueColor: _deliveryFee == 0 && _selectedAddress != null
                ? AppColors.success
                : AppColors.textPrimary,
          ),
          const Divider(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Tổng cộng',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              Text(
                Formatters.currency(_total),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (validationMsg != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                validationMsg,
                style: const TextStyle(color: AppColors.warning, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _isPlacing || validationMsg != null
                  ? null
                  : _placeOrder,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                disabledBackgroundColor: Colors.grey[300],
                disabledForegroundColor: Colors.grey[500],
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                textStyle: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: _isPlacing
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Đặt hàng'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  // ── Shared Widgets ──

  Widget _sectionCard({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
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
        children: children,
      ),
    );
  }

  Widget _sectionTitle(IconData icon, String title) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 17, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
