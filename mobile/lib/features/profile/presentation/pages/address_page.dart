import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/constants/danang_locations.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';

class AddressPage extends StatefulWidget {
  const AddressPage({super.key});

  @override
  State<AddressPage> createState() => _AddressPageState();
}

class _AddressPageState extends State<AddressPage> {
  final Dio _dio = ApiClient().dio;
  List<dynamic> _addresses = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _dio.get(ApiEndpoints.userAddresses);
      if (!mounted) return;
      final user = res.data['data'] as Map<String, dynamic>? ??
          res.data as Map<String, dynamic>;
      setState(() {
        _addresses = user['addresses'] as List<dynamic>? ?? [];
        _loading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.response?.data['message'] as String? ?? 'Không thể tải địa chỉ';
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Đã xảy ra lỗi';
        _loading = false;
      });
    }
  }

  Map<String, dynamic> _normalizeAddress(Map<String, dynamic> source) {
    return {
      'label': source['label'] as String? ?? 'home',
      'receiverName': source['receiverName'] as String? ?? source['name'] as String? ?? '',
      'phone': (source['phone'] as String? ?? '').replaceAll(RegExp(r'\s+'), ''),
      'detail': source['detail'] as String? ?? source['address'] as String? ?? '',
      'ward': source['ward'] as String? ?? '',
      'city': source['city'] as String? ?? DanangLocations.deliverableCity,
      'isDefault': source['isDefault'] == true,
    };
  }

  List<Map<String, dynamic>> _normalizeAddressList(List<dynamic> addresses) {
    return addresses.whereType<Map<String, dynamic>>().map(_normalizeAddress).toList();
  }

  Future<void> _saveAddresses(List<Map<String, dynamic>> addresses) async {
    await _dio.patch(ApiEndpoints.userAddresses, data: {'addresses': addresses});
  }

  Future<void> _deleteAddress(String id) async {
    final previous = List<dynamic>.from(_addresses);
    final filtered = previous
        .where((e) {
          final m = e as Map<String, dynamic>;
          return (m['_id'] as String? ?? m['id'] as String? ?? '') != id;
        }).toList();
    final updated = _normalizeAddressList(filtered);

    setState(() => _addresses = previous.where((e) {
          final m = e as Map<String, dynamic>;
          return (m['_id'] as String? ?? m['id'] as String? ?? '') != id;
        }).toList());

    try {
      await _saveAddresses(updated);
      if (mounted) await _loadAddresses();
    } catch (_) {
      if (mounted) {
        setState(() => _addresses = previous);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể xoá địa chỉ')),
        );
      }
    }
  }

  Future<void> _setDefault(String id) async {
    try {
      final updated = _normalizeAddressList(_addresses).map((m) {
        final itemId = m['_id'] as String? ?? m['id'] as String? ?? m.hashCode.toString();
        return {
          ...m,
          'isDefault': itemId == id || m.hashCode.toString() == id,
        };
      }).toList();
      await _saveAddresses(updated);
      if (!mounted) return;
      await _loadAddresses();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể đặt làm mặc định')),
        );
      }
    }
  }

  void _showAddressForm({Map<String, dynamic>? existing}) {
    final isEdit = existing != null;
    final nameCtrl = TextEditingController(text: existing?['receiverName'] as String? ?? existing?['name'] as String? ?? '');
    final phoneCtrl = TextEditingController(text: existing?['phone'] as String? ?? '');
    final detailCtrl = TextEditingController(text: existing?['detail'] as String? ?? existing?['address'] as String? ?? '');
    final wardCtrl = TextEditingController(text: existing?['ward'] as String? ?? '');
    var selectedWard = existing?['ward'] as String? ?? '';
    var isDefault = existing?['isDefault'] == true;

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
              left: 20, right: 20, top: 14,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40, height: 4,
                      decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    isEdit ? 'Sửa địa chỉ' : 'Thêm địa chỉ',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 16),
                  TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Người nhận *', hintText: 'Nhập tên người nhận')),
                  const SizedBox(height: 12),
                  TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Số điện thoại *', hintText: '0xxxxxxxxx')),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: DanangLocations.deliverableCity,
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
                    onChanged: saving ? null : (value) {
                      setSheetState(() {
                        selectedWard = value ?? '';
                        wardCtrl.text = value ?? '';
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
                    onChanged: (value) => setSheetState(() => isDefault = value ?? false),
                    title: const Text('Đặt làm địa chỉ mặc định', style: TextStyle(fontSize: 14)),
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

                              // Validation
                              final receiverName = nameCtrl.text.trim();
                              final phone = phoneCtrl.text.replaceAll(RegExp(r'\s+'), '');
                              final detail = detailCtrl.text.trim();
                              final ward = selectedWard;

                              String? msg;
                              if (receiverName.isEmpty) {
                                msg = 'Vui lòng nhập người nhận';
                              } else if (!RegExp(r'^0\d{8,10}$').hasMatch(phone)) {
                                msg = 'Số điện thoại không hợp lệ';
                              } else if (ward.isEmpty) {
                                msg = 'Vui lòng chọn phường/xã';
                              } else if (detail.isEmpty) {
                                msg = 'Vui lòng nhập địa chỉ chi tiết';
                              }
                              if (msg != null) {
                                setSheetState(() => saving = false);
                                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(msg)));
                                return;
                              }

                              final data = <String, dynamic>{
                                'label': existing?['label'] as String? ?? 'home',
                                'receiverName': receiverName,
                                'phone': phone,
                                'detail': detail,
                                'ward': ward,
                                'city': DanangLocations.deliverableCity,
                                'isDefault': isDefault,
                              };
                              try {
                                final updated = _addresses.map((e) {
                                  final m = e as Map<String, dynamic>;
                                  final existingId = m['_id'] as String? ?? m['id'] as String? ?? '';
                                  final editingId = existing?['_id'] as String? ?? existing?['id'] as String? ?? '';
                                  if (isEdit && existingId == editingId) {
                                    return data;
                                  }
                                  return _normalizeAddress(m);
                                }).toList();
                                if (!isEdit) {
                                  updated.add(data);
                                }
                                await _saveAddresses(updated);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                if (mounted) await _loadAddresses();
                              } on DioException catch (e) {
                                if (!ctx.mounted) return;
                                final msg2 = e.response?.data['message'] as String? ?? 'Lưu thất bại';
                                setSheetState(() => saving = false);
                                ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(msg2)));
                              } catch (_) {
                                if (!ctx.mounted) return;
                                setSheetState(() => saving = false);
                                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Đã xảy ra lỗi')));
                              }
                            },
                      child: saving
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(isEdit ? 'Cập nhật' : 'Thêm địa chỉ'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Địa chỉ giao hàng', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddressForm(),
        icon: const Icon(Icons.add),
        label: const Text('Thêm'),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return _buildShimmer();
    if (_error != null) return AppErrorWidget(message: _error!, onRetry: _loadAddresses);
    if (_addresses.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.location_off, size: 72, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('Chưa có địa chỉ', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            Text('Thêm địa chỉ giao hàng để dễ dàng đặt hàng', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textHint)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _showAddressForm(),
              icon: const Icon(Icons.add),
              label: const Text('Thêm địa chỉ'),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadAddresses,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
        itemCount: _addresses.length,
        itemBuilder: (_, i) => _buildAddressCard(_addresses[i] as Map<String, dynamic>),
      ),
    );
  }

  Widget _buildShimmer() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 3,
      itemBuilder: (_, _) => Shimmer.fromColors(
        baseColor: AppColors.shimmerBase,
        highlightColor: AppColors.shimmerHighlight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 120,
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }

  Widget _buildAddressCard(Map<String, dynamic> addr) {
    final id = addr['_id'] as String? ?? addr['id'] as String? ?? '';
    final isDefault = addr['isDefault'] == true;
    final name = addr['receiverName'] as String? ?? addr['name'] as String? ?? '';
    final phone = addr['phone'] as String? ?? '';
    final detail = addr['detail'] as String? ?? addr['address'] as String? ?? '';
    final ward = addr['ward'] as String? ?? '';
    final city = addr['city'] as String? ?? '';

    return Dismissible(
      key: ValueKey(id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      confirmDismiss: (_) => showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Xoá địa chỉ?'),
          content: const Text('Bạn có chắc muốn xoá địa chỉ này?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Xoá', style: TextStyle(color: AppColors.error))),
          ],
        ),
      ).then((v) => v ?? false),
      onDismissed: (_) => _deleteAddress(id),
      child: InkWell(
        onTap: () => _showAddressForm(existing: addr),
        onLongPress: () => _showAddressForm(existing: addr),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.location_on, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(width: 8),
                        Text(phone, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      [detail, ward, city].where((s) => s.isNotEmpty).join(', '),
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (isDefault)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('Mặc định', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary)),
                          ),
                        if (!isDefault)
                          TextButton(
                            onPressed: () => _setDefault(id),
                            style: TextButton.styleFrom(
                              minimumSize: const Size(48, 48),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                            ),
                            child: const Text('Đặt làm mặc định', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textHint),
            ],
          ),
        ),
      ),
    );
  }
}
