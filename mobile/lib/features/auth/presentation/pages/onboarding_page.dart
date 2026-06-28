import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';

class AllergyOptionData {
  final String id;
  final String label;
  final IconData icon;
  final String subtitle;

  const AllergyOptionData({
    required this.id,
    required this.label,
    required this.icon,
    required this.subtitle,
  });
}

/// Redesigned Onboarding Screen matching Web Frontend health profile setup.
class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final _searchController = TextEditingController();
  final List<String> _selectedAllergies = [];
  String _searchQuery = '';

  static const List<AllergyOptionData> _allergyOptions = [
    // Seafood
    AllergyOptionData(id: 'fish', label: 'Cá', icon: Icons.set_meal, subtitle: 'Cá hồi, cá ngừ, cá thu...'),
    AllergyOptionData(id: 'shrimp', label: 'Tôm', icon: Icons.water, subtitle: 'Tôm sú, tôm hùm, tôm khô...'),
    AllergyOptionData(id: 'crab', label: 'Cua', icon: Icons.waves, subtitle: 'Cua biển, ghẹ, gạch cua...'),
    AllergyOptionData(id: 'shellfish', label: 'Hải sản có vỏ', icon: Icons.bubble_chart, subtitle: 'Nghêu, sò, ốc, hàu...'),
    AllergyOptionData(id: 'squid', label: 'Mực / Bạch tuộc', icon: Icons.water_drop, subtitle: 'Mực ống, mực khô, bạch tuộc...'),
    
    // Meat
    AllergyOptionData(id: 'beef', label: 'Thịt Bò', icon: Icons.restaurant, subtitle: 'Thịt bò phi lê, nạm bò...'),
    AllergyOptionData(id: 'pork', label: 'Thịt Heo', icon: Icons.savings, subtitle: 'Thịt heo, mỡ heo, sườn...'),
    AllergyOptionData(id: 'chicken', label: 'Thịt Gà / Gia cầm', icon: Icons.dining, subtitle: 'Thịt gà, thịt vịt, thịt ngan...'),
    
    // Plants & Nuts
    AllergyOptionData(id: 'peanuts', label: 'Đậu phộng (Lạc)', icon: Icons.grain, subtitle: 'Hạt đậu phộng, dầu phộng...'),
    AllergyOptionData(id: 'tree_nuts', label: 'Các loại hạt', icon: Icons.forest, subtitle: 'Macca, hạnh nhân, hạt dẻ...'),
    AllergyOptionData(id: 'soy', label: 'Đậu nành', icon: Icons.eco, subtitle: 'Đậu phụ, nước tương, sữa đậu...'),
    AllergyOptionData(id: 'gluten', label: 'Gluten / Lúa mì', icon: Icons.bakery_dining, subtitle: 'Bột mì, bánh mì, mì sợi...'),
    AllergyOptionData(id: 'allium', label: 'Hành / Tỏi', icon: Icons.spa, subtitle: 'Hành lá, hành tây, tỏi củ...'),
    
    // Dairy & Others
    AllergyOptionData(id: 'eggs', label: 'Trứng', icon: Icons.egg, subtitle: 'Trứng gà, trứng vịt, sốt bơ...'),
    AllergyOptionData(id: 'dairy', label: 'Sữa & Lactose', icon: Icons.local_drink, subtitle: 'Sữa tươi, phô mai, bơ sữa...'),
    AllergyOptionData(id: 'msg', label: 'Bột ngọt (MSG)', icon: Icons.science, subtitle: 'Mì chính, hạt nêm chứa MSG...'),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleAllergy(String id) {
    setState(() {
      if (_selectedAllergies.contains(id)) {
        _selectedAllergies.remove(id);
      } else {
        _selectedAllergies.add(id);
      }
    });
  }

  Future<void> _handleComplete() async {
    await LocalStorage.setSelectedAllergies(_selectedAllergies);
    await LocalStorage.setOnboardingComplete();
    if (mounted) {
      context.go('/login');
    }
  }

  void _handleSkip() {
    LocalStorage.setSelectedAllergies([]);
    LocalStorage.setOnboardingComplete();
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final filteredOptions = _allergyOptions.where((option) {
      final query = _searchQuery.trim().toLowerCase();
      if (query.isEmpty) return true;
      return option.label.toLowerCase().contains(query) ||
          option.subtitle.toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Thiết lập Hồ sơ Sức khỏe'),
        elevation: 0,
        backgroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _handleSkip,
            child: const Text('Bỏ qua'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top informative header
            Container(
              color: Colors.white,
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Thiết lập Dữ liệu Dị ứng',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Hãy chọn các nguyên liệu bạn mẫn cảm. Ứng dụng sẽ cảnh báo hoặc lọc các món ăn chứa thành phần này.',
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Allergy commitment banner (like website)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.orange[50],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange[100]!),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.health_and_safety, color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Cam kết an toàn thực phẩm',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.orange[900],
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Các món ăn chứa thành phần dị ứng sẽ được dán nhãn đỏ cảnh báo hoặc ẩn trên thực đơn của bạn.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.orange[850],
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Search input field
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextField(
                controller: _searchController,
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                  });
                },
                decoration: InputDecoration(
                  hintText: 'Tìm kiếm nguyên liệu dị ứng...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _searchQuery = '';
                            });
                          },
                        )
                      : null,
                ),
              ),
            ),

            // Allergy options grid
            Expanded(
              child: filteredOptions.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text(
                            'Không tìm thấy nguyên liệu phù hợp',
                            style: TextStyle(color: Colors.grey[600], fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 2.1,
                      ),
                      itemCount: filteredOptions.length,
                      itemBuilder: (context, index) {
                        final option = filteredOptions[index];
                        final isSelected = _selectedAllergies.contains(option.id);

                        return InkWell(
                          onTap: () => _toggleAllergy(option.id),
                          borderRadius: BorderRadius.circular(16),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.red[50] : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected ? Colors.red[300]! : AppColors.divider,
                                width: isSelected ? 1.5 : 1.0,
                              ),
                            ),
                            padding: const EdgeInsets.all(10),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: isSelected ? Colors.red[100] : AppColors.surfaceVariant,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    option.icon,
                                    color: isSelected ? Colors.red : AppColors.textSecondary,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        option.label,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: isSelected ? Colors.red[900] : AppColors.textPrimary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        option.subtitle,
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isSelected ? Colors.red[700] : AppColors.textSecondary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(
                                    Icons.error_outline,
                                    color: Colors.red,
                                    size: 16,
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),

            // Sticky Bottom Panel
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_selectedAllergies.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Colors.red[700], size: 18),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Đang chặn ${_selectedAllergies.length} nguyên liệu gây dị ứng.',
                              style: TextStyle(
                                color: Colors.red[900],
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          TextButton(
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            onPressed: () {
                              setState(() {
                                _selectedAllergies.clear();
                              });
                            },
                            child: const Text('Xóa tất cả'),
                          ),
                        ],
                      ),
                    ),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _handleComplete,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _selectedAllergies.isNotEmpty
                            ? AppColors.primary
                            : Colors.black,
                      ),
                      child: Text(
                        _selectedAllergies.isNotEmpty
                            ? 'Lưu hồ sơ dị ứng (${_selectedAllergies.length})'
                            : 'Tiếp tục không dị ứng',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}