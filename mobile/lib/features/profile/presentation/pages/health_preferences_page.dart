import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/constants/allergy_options.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';

class HealthPreferencesPage extends StatefulWidget {
  const HealthPreferencesPage({super.key});

  @override
  State<HealthPreferencesPage> createState() => _HealthPreferencesPageState();
}

class _HealthPreferencesPageState extends State<HealthPreferencesPage> {
  final Dio _dio = ApiClient().dio;

  bool _loading = true;
  bool _saving = false;
  String? _error;

  final Set<String> _allergies = {};
  Map<String, dynamic> _preferences = <String, dynamic>{};
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _extractUserMap(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      final wrappedData = responseData['data'];
      if (wrappedData is Map<String, dynamic>) return wrappedData;
      return responseData;
    }
    return <String, dynamic>{};
  }

  Map<String, dynamic> _extractPreferences(Map<String, dynamic> user) {
    final preferences = user['preferences'];
    if (preferences is Map<String, dynamic>) {
      return Map<String, dynamic>.from(preferences);
    }
    return <String, dynamic>{};
  }

  Iterable<String> _extractAllergies(Map<String, dynamic> preferences) {
    final allergies = preferences['allergies'];
    if (allergies is List) {
      return allergies
          .map((item) => item.toString())
          .where((item) => item.trim().isNotEmpty);
    }
    return const <String>[];
  }

  String _messageFromErrorResponse(dynamic responseData, String fallback) {
    if (responseData is Map<String, dynamic>) {
      final message = responseData['message'];
      if (message is String && message.trim().isNotEmpty) return message;
    }
    return fallback;
  }

  Future<void> _loadPreferences() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _dio.get(ApiEndpoints.userPreferences);
      if (!mounted) return;
      final user = _extractUserMap(res.data);
      final data = _extractPreferences(user);
      setState(() {
        _preferences = data;
        _allergies
          ..clear()
          ..addAll(_extractAllergies(data));
        _loading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _messageFromErrorResponse(
          e.response?.data,
          'Không thể tải tuỳ chọn sức khỏe',
        );
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

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final nextPreferences = {
        ..._preferences,
        'allergies': _allergies.toList(),
      };
      await _dio.patch(
        ApiEndpoints.userPreferences,
        data: {'preferences': nextPreferences},
      );
      _preferences = nextPreferences;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã lưu'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } on DioException catch (e) {
      final msg = _messageFromErrorResponse(e.response?.data, 'Không thể lưu');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Đã xảy ra lỗi')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<AllergyOptionData> get _filteredOptions {
    if (_searchQuery.isEmpty) return allergyOptions;
    final q = _searchQuery.toLowerCase();
    return allergyOptions
        .where(
          (o) =>
              o.label.toLowerCase().contains(q) ||
              o.subtitle.toLowerCase().contains(q),
        )
        .toList();
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
      body: _loading
          ? _buildShimmer()
          : _error != null
          ? AppErrorWidget(message: _error!, onRetry: _loadPreferences)
          : RefreshIndicator(
              onRefresh: _loadPreferences,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildIntroCard(),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _searchController,
                      onChanged: (v) => setState(() => _searchQuery = v),
                      decoration: InputDecoration(
                        hintText: 'Tìm kiếm nguyên liệu dị ứng...',
                        prefixIcon: const Icon(
                          Icons.search,
                          color: AppColors.textHint,
                        ),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: AppColors.divider),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: AppColors.divider),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(
                            color: AppColors.primary,
                            width: 1.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_filteredOptions.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.divider),
                        ),
                        child: const Text(
                          'Không tìm thấy dị ứng phù hợp',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      )
                    else
                      ..._filteredOptions.map(_buildAllergyOption),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : SafeArea(
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Đã chọn ${_allergies.length} dị ứng',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Lưu dị ứng'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildIntroCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: Colors.amber.shade700, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Chọn các nguyên liệu bạn bị dị ứng để chúng tôi cảnh báo và gợi ý món ăn phù hợp.',
              style: TextStyle(
                fontSize: 13,
                color: Colors.amber.shade900,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAllergyOption(AllergyOptionData option) {
    final isSelected = _allergies.contains(option.id);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => setState(() {
          if (isSelected) {
            _allergies.remove(option.id);
          } else {
            _allergies.add(option.id);
          }
        }),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isSelected ? Colors.red.shade50 : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? Colors.red.shade300 : AppColors.divider,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.red.shade100
                      : AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  option.icon,
                  color: isSelected ? Colors.red : AppColors.textSecondary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      option.label,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: isSelected
                            ? Colors.red.shade900
                            : AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      option.subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: isSelected
                            ? Colors.red.shade700
                            : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                isSelected ? Icons.check_circle : Icons.circle_outlined,
                color: isSelected ? Colors.red : AppColors.textHint,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildShimmer() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: List.generate(
        3,
        (_) => Shimmer.fromColors(
          baseColor: AppColors.shimmerBase,
          highlightColor: AppColors.shimmerHighlight,
          child: Container(
            margin: const EdgeInsets.only(bottom: 16),
            height: 100,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ),
    );
  }
}
