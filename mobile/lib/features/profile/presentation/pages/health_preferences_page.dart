import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/constants/allergy_options.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';

class HealthPreferencesPage extends StatefulWidget {
  const HealthPreferencesPage({super.key});

  @override
  State<HealthPreferencesPage> createState() => _HealthPreferencesPageState();
}

class _HealthPreferencesPageState extends State<HealthPreferencesPage> {
  late final Dio _dio;
  bool _saving = false;

  final Set<String> _allergies = {};
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _dio = ApiClient().dio;
    _allergies.addAll(LocalStorage.selectedAllergies);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await _dio.patch(
        ApiEndpoints.userPreferences,
        data: {'preferences': {'allergies': _allergies.toList()}},
      );
      await LocalStorage.setSelectedAllergies(_allergies.toList());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã lưu hồ sơ dị ứng'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on DioException catch (e) {
      final msg = (e.response?.data is Map)
          ? ((e.response?.data as Map)['message'] as String?) ?? 'Không thể lưu'
          : 'Không thể lưu';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.error),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã xảy ra lỗi'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<AllergyOptionData> get _filteredOptions {
    if (_searchQuery.isEmpty) return allergyOptions;
    final q = _searchQuery.toLowerCase();
    return allergyOptions
        .where((o) => o.label.toLowerCase().contains(q) || o.subtitle.toLowerCase().contains(q))
        .toList();
  }

  bool get _hasChanges {
    final initial = LocalStorage.selectedAllergies.toSet();
    if (initial.length != _allergies.length) return true;
    return !initial.containsAll(_allergies);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Dị ứng thực phẩm',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary,
                            AppColors.primary.withValues(alpha: 0.7),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.health_and_safety_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hồ sơ dị ứng của bạn',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Chúng tôi sẽ lọc món ăn phù hợp',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _allergies.isNotEmpty
                            ? AppColors.primary.withValues(alpha: 0.1)
                            : AppColors.surfaceVariant,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${_allergies.length} đã chọn',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: _allergies.isNotEmpty
                              ? AppColors.primary
                              : AppColors.textHint,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _searchController,
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: InputDecoration(
                    hintText: 'Tìm kiếm nguyên liệu...',
                    hintStyle: const TextStyle(fontSize: 14),
                    prefixIcon: const Icon(
                      Icons.search_rounded,
                      color: AppColors.textHint,
                      size: 22,
                    ),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(
                              Icons.close_rounded,
                              color: AppColors.textHint,
                              size: 20,
                            ),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: AppColors.surfaceVariant.withValues(alpha: 0.6),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _filteredOptions.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.search_off_rounded,
                          size: 48,
                          color: AppColors.textHint.withValues(alpha: 0.5),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Không tìm thấy nguyên liệu',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 2.2,
                    ),
                    itemCount: _filteredOptions.length,
                    itemBuilder: (context, index) {
                      final option = _filteredOptions[index];
                      final isSelected = _allergies.contains(option.id);
                      return Material(
                        color: isSelected
                            ? AppColors.primary.withValues(alpha: 0.08)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          onTap: () => setState(() {
                            isSelected
                                ? _allergies.remove(option.id)
                                : _allergies.add(option.id);
                          }),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary.withValues(alpha: 0.4)
                                    : AppColors.divider.withValues(alpha: 0.5),
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primary.withValues(alpha: 0.15)
                                        : AppColors.surfaceVariant,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    option.icon,
                                    size: 20,
                                    color: isSelected
                                        ? AppColors.primary
                                        : AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        option.label,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w800,
                                          color: isSelected
                                              ? AppColors.primary
                                              : AppColors.textPrimary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        option.subtitle,
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isSelected
                                              ? AppColors.primary.withValues(alpha: 0.7)
                                              : AppColors.textSecondary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  isSelected
                                      ? Icons.check_circle_rounded
                                      : Icons.add_circle_outline_rounded,
                                  size: 22,
                                  color: isSelected
                                      ? AppColors.primary
                                      : AppColors.textHint,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              8,
              16,
              MediaQuery.of(context).padding.bottom + 12,
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
                border: Border.all(
                  color: AppColors.divider.withValues(alpha: 0.3),
                  width: 0.8,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_allergies.length} dị ứng đã chọn',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _allergies.isEmpty
                              ? 'Chọn nguyên liệu bạn bị dị ứng'
                              : _allergies
                                  .map((id) => allergyOptions
                                      .firstWhere((o) => o.id == id)
                                      .label)
                                  .join(', '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: (_saving || !_hasChanges) ? null : _save,
                    icon: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Icon(
                            _hasChanges
                                ? Icons.save_rounded
                                : Icons.check_circle_rounded,
                            size: 18,
                            color: _hasChanges ? Colors.white : Colors.green[600],
                          ),
                    label: Text(
                      _saving
                          ? 'Đang lưu...'
                          : _hasChanges
                              ? 'Lưu thay đổi'
                              : 'Đã lưu',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        color: _hasChanges ? Colors.white : Colors.green[800],
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _hasChanges
                          ? AppColors.primary
                          : Colors.green[50],
                      foregroundColor: _hasChanges ? Colors.white : Colors.green[800],
                      elevation: 0,
                      minimumSize: const Size(0, 46),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: _hasChanges
                            ? BorderSide.none
                            : BorderSide(color: Colors.green.shade200),
                      ),
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
}
