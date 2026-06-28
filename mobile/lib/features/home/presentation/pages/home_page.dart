import 'dart:async';
import 'package:flutter/material.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

class FoodMockData {
  final String id;
  final String name;
  final String image;
  final double originalPrice;
  final double price;
  final String category;
  final List<String> allergens; // e.g. ['fish', 'peanuts']
  final double rating;
  final int salesCount;

  const FoodMockData({
    required this.id,
    required this.name,
    required this.image,
    required this.originalPrice,
    required this.price,
    required this.category,
    required this.allergens,
    required this.rating,
    required this.salesCount,
  });
}

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

/// Redesigned premium Home Screen representing FoodieDash features on Mobile.
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final PageController _bannerController = PageController();
  int _currentBanner = 0;
  Timer? _bannerTimer;
  List<String> _userAllergies = [];

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

  static const List<Map<String, dynamic>> _categories = [
    {'name': 'Món chính', 'icon': Icons.restaurant_menu},
    {'name': 'Đồ uống', 'icon': Icons.local_bar},
    {'name': 'Ăn chay', 'icon': Icons.eco},
    {'name': 'Tráng miệng', 'icon': Icons.icecream},
    {'name': 'Healthy', 'icon': Icons.favorite},
  ];

  static const List<FoodMockData> _mockFoods = [
    FoodMockData(
      id: 'food_1',
      name: 'Mì Quảng Gà Ta Sợi Đỏ',
      image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=500&fit=crop',
      originalPrice: 65000,
      price: 49000,
      category: 'Món chính',
      allergens: ['gluten', 'chicken'],
      rating: 4.8,
      salesCount: 154,
    ),
    FoodMockData(
      id: 'food_2',
      name: 'Salad Tôm Bơ Sốt Kem',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&fit=crop',
      originalPrice: 85000,
      price: 68000,
      category: 'Healthy',
      allergens: ['shrimp', 'dairy'],
      rating: 4.9,
      salesCount: 92,
    ),
    FoodMockData(
      id: 'food_3',
      name: 'Nộm sứa tai heo rắc lạc',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&fit=crop',
      originalPrice: 75000,
      price: 60000,
      category: 'Món chính',
      allergens: ['peanuts', 'shellfish'],
      rating: 4.6,
      salesCount: 88,
    ),
    FoodMockData(
      id: 'food_4',
      name: 'Bánh Mì Ngũ Cốc Bơ Tỏi',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&fit=crop',
      originalPrice: 45000,
      price: 32000,
      category: 'Healthy',
      allergens: ['gluten', 'allium'],
      rating: 4.7,
      salesCount: 120,
    ),
    FoodMockData(
      id: 'food_5',
      name: 'Cá Hồi Áp Chảo Sốt Cam',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&fit=crop',
      originalPrice: 155000,
      price: 135000,
      category: 'Healthy',
      allergens: ['fish'],
      rating: 4.9,
      salesCount: 64,
    ),
  ];

  static const List<Map<String, dynamic>> _vouchers = [
    {'code': 'FREESHIP3K', 'title': 'Freeship đơn từ 50k', 'discount': 'Tối đa 15k'},
    {'code': 'FOANEW20', 'title': 'Giảm 20% cho bạn mới', 'discount': 'Đơn đầu tiên'},
    {'code': 'AISUGGEST', 'title': 'Giảm 10% thực đơn AI', 'discount': 'Tối đa 20k'},
  ];

  @override
  void initState() {
    super.initState();
    _loadUserAllergies();
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_bannerController.hasClients) {
        int next = _currentBanner + 1;
        if (next >= _banners.length) next = 0;
        _bannerController.animateToPage(
          next,
          duration: const Duration(milliseconds: 550),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  void _loadUserAllergies() {
    setState(() {
      _userAllergies = LocalStorage.selectedAllergies;
    });
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    _bannerController.dispose();
    super.dispose();
  }

  // Translates allergy backend id to Vietnamese friendly string
  String _getAllergenLabel(String id) {
    switch (id) {
      case 'fish': return 'Cá';
      case 'shrimp': return 'Tôm';
      case 'crab': return 'Cua';
      case 'shellfish': return 'Hải sản có vỏ';
      case 'squid': return 'Mực / Bạch tuộc';
      case 'beef': return 'Thịt bò';
      case 'pork': return 'Thịt heo';
      case 'chicken': return 'Gia cầm';
      case 'peanuts': return 'Đậu phộng';
      case 'tree_nuts': return 'Hạt cây';
      case 'soy': return 'Đậu nành';
      case 'gluten': return 'Gluten / Lúa mì';
      case 'allium': return 'Hành / Tỏi';
      case 'eggs': return 'Trứng';
      case 'dairy': return 'Sữa';
      case 'msg': return 'Bột ngọt';
      default: return id;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Premium Header
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                      child: const Icon(Icons.person, color: AppColors.primary),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Giao đến địa chỉ',
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                          Row(
                            children: [
                              Icon(Icons.location_on, size: 14, color: AppColors.primary),
                              SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  'Đại học FPT, Hòa Lạc, Hà Nội',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Badge(
                        label: Text('3'),
                        child: Icon(Icons.notifications_outlined, color: AppColors.textPrimary),
                      ),
                      onPressed: () => context.push('/notifications'),
                    ),
                  ],
                ),
              ),

              // 2. Search Box
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: TextField(
                  readOnly: true,
                  onTap: () => context.push('/menu'),
                  decoration: const InputDecoration(
                    hintText: 'Thèm gì hôm nay? Tìm món ngay...',
                    prefixIcon: Icon(Icons.search, color: AppColors.textHint),
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),

              // 3. Hero Carousel Banner
              Container(
                height: 160,
                margin: const EdgeInsets.symmetric(vertical: 16),
                child: Stack(
                  children: [
                    PageView.builder(
                      controller: _bannerController,
                      onPageChanged: (idx) {
                        setState(() {
                          _currentBanner = idx;
                        });
                      },
                      itemCount: _banners.length,
                      itemBuilder: (context, index) {
                        final banner = _banners[index];
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: Stack(
                              children: [
                                CachedNetworkImage(
                                  imageUrl: banner.image,
                                  fit: BoxFit.cover,
                                  width: double.infinity,
                                  height: double.infinity,
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
                                      begin: Alignment.centerLeft,
                                      end: Alignment.centerRight,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(16),
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
                                        child: Text(
                                          banner.tag,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 9,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        banner.highlight,
                                        style: TextStyle(
                                          color: banner.highlightColor,
                                          fontSize: 18,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      SizedBox(
                                        width: 180,
                                        child: Text(
                                          banner.description,
                                          style: const TextStyle(
                                            color: Colors.white70,
                                            fontSize: 10,
                                            height: 1.3,
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
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
                      bottom: 12,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _banners.length,
                          (i) => AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: _currentBanner == i ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: _currentBanner == i ? Colors.white : Colors.white.withValues(alpha: 0.55),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // 4. Categories horizontal scroll
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(
                  'Danh mục món ăn',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
              ),
              SizedBox(
                height: 84,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: InkWell(
                        onTap: () => context.push('/menu'),
                        borderRadius: BorderRadius.circular(16),
                        child: Column(
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.divider),
                              ),
                              child: Icon(cat['icon'] as IconData, color: AppColors.primary),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              cat['name'] as String,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              // 5. Flash Sale Section
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.flash_on, color: Colors.red),
                        const SizedBox(width: 4),
                        const Text(
                          'Flash Sale',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.red[100],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '01:24:50',
                            style: TextStyle(fontSize: 10, color: Colors.red, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => context.push('/menu'),
                      child: const Text('Xem tất cả'),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 220,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  itemCount: 3,
                  itemBuilder: (context, index) {
                    final food = _mockFoods[index];
                    final conflictingAllergies = food.allergens
                        .where((allergen) => _userAllergies.contains(allergen))
                        .toList();

                    return Container(
                      width: 140,
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.divider),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Stack(
                              children: [
                                CachedNetworkImage(
                                  imageUrl: food.image,
                                  height: 100,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                ),
                                if (conflictingAllergies.isNotEmpty)
                                  Container(
                                    color: Colors.red.withValues(alpha: 0.85),
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                    child: const Text(
                                      'CẢNH BÁO DỊ ỨNG',
                                      style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w800),
                                    ),
                                  ),
                                Positioned(
                                  bottom: 6,
                                  right: 6,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.red,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '-${(((food.originalPrice - food.price) / food.originalPrice) * 100).round()}%',
                                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    food.name,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text(
                                        '${(food.price / 1000).round()}k',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.primary),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${(food.originalPrice / 1000).round()}k',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: AppColors.textHint,
                                          decoration: TextDecoration.lineThrough,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  // Progress Bar remaining quantity
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: 0.6,
                                      backgroundColor: Colors.grey[200],
                                      valueColor: const AlwaysStoppedAnimation<Color>(Colors.red),
                                      minHeight: 4,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    'Đã bán 60%',
                                    style: TextStyle(fontSize: 8, color: AppColors.textSecondary),
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

              // 6. AI Recommended Section with Allergy Alerts
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.auto_awesome, color: AppColors.primary),
                        SizedBox(width: 6),
                        Text(
                          'Gợi ý từ trợ lý AI',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => context.push('/menu'),
                      child: const Text('Xem tất cả'),
                    ),
                  ],
                ),
              ),

              // List of AI Foods
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _mockFoods.length,
                itemBuilder: (context, index) {
                  final food = _mockFoods[index];
                  final conflictingAllergies = food.allergens
                      .where((allergen) => _userAllergies.contains(allergen))
                      .toList();

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(
                        color: conflictingAllergies.isNotEmpty ? Colors.red[200]! : AppColors.divider,
                        width: conflictingAllergies.isNotEmpty ? 1.5 : 1.0,
                      ),
                    ),
                    child: InkWell(
                      onTap: () => context.push('/food/${food.id}'),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CachedNetworkImage(
                                imageUrl: food.image,
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.green[50],
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          food.category,
                                          style: TextStyle(color: Colors.green[700], fontSize: 9, fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Icon(Icons.star, color: Colors.amber, size: 12),
                                      const SizedBox(width: 2),
                                      Text(
                                        '${food.rating}',
                                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    food.name,
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${(food.price / 1000).round()}k',
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: AppColors.primary),
                                  ),

                                  // AI Allergy warning block
                                  if (conflictingAllergies.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: Colors.red[50],
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: Colors.red[100]!),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.warning, color: Colors.red, size: 14),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              'Chứa nguyên liệu dị ứng: ${conflictingAllergies.map(_getAllergenLabel).join(", ")}',
                                              style: TextStyle(color: Colors.red[900], fontSize: 9.5, fontWeight: FontWeight.w700),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),

              // 7. Voucher Section
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Text(
                  'Mã giảm giá hấp dẫn',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                ),
              ),
              SizedBox(
                height: 70,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  itemCount: _vouchers.length,
                  itemBuilder: (context, index) {
                    final v = _vouchers[index];
                    return Container(
                      width: 190,
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.divider),
                      ),
                      padding: const EdgeInsets.all(10),
                      child: Row(
                        children: [
                          Icon(Icons.local_offer, color: AppColors.primary, size: 28),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  v['title'] as String,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  v['discount'] as String,
                                  style: const TextStyle(fontSize: 9, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              minimumSize: const Size(0, 26),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Đã thu thập mã ${v['code']}!'),
                                  backgroundColor: AppColors.success,
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              );
                            },
                            child: const Text('Nhận', style: TextStyle(fontSize: 10)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
