import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';

class MembershipPage extends StatefulWidget {
  const MembershipPage({super.key});

  @override
  State<MembershipPage> createState() => _MembershipPageState();
}

class _MembershipPageState extends State<MembershipPage>
    with SingleTickerProviderStateMixin {
  late final Dio _dio;
  late final TabController _tabController;
  Map<String, dynamic>? _membership;
  List<dynamic> _pointsHistory = [];
  bool _loading = true;
  String? _error;

  static const _tiers = ['Bronze', 'Silver', 'Gold', 'Diamond'];
  static const _tierColors = [
    Color(0xFFCD7F32), // Bronze
    Color(0xFFC0C0C0), // Silver
    Color(0xFFFFD700), // Gold
    Color(0xFF00BFFF), // Diamond
  ];
  static const _tierLabels = ['Đồng', 'Bạc', 'Vàng', 'Kim cương'];

  /// Points needed to reach each tier.
  static const _tierThresholds = [1000, 3000, 6000];

  @override
  void initState() {
    super.initState();
    _dio = ApiClient().dio;
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _dio.get(ApiEndpoints.userMembership),
        _dio.get(ApiEndpoints.userPointsHistory),
      ]);
      setState(() {
        _membership =
            results[0].data['data'] as Map<String, dynamic>? ??
            results[0].data as Map<String, dynamic>;
        _pointsHistory =
            results[1].data['data'] as List<dynamic>? ??
            results[1].data as List<dynamic>;
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _error =
            e.response?.data['message'] as String? ??
            'Không thể tải thông tin thành viên';
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Đã xảy ra lỗi';
        _loading = false;
      });
    }
  }

  int get _currentTierIndex {
    final tier = (_membership?['tier'] as String? ?? 'bronze').toLowerCase();
    for (int i = 0; i < _tiers.length; i++) {
      if (_tiers[i].toLowerCase() == tier) return i;
    }
    return 0;
  }

  /// Backend returns `collectedPoints` and `accumulatedPoints` in membership.
  int get _currentPoints {
    final pts = _membership?['collectedPoints'] as num? ??
        _membership?['accumulatedPoints'] as num? ??
        0;
    return pts.toInt();
  }

  int get _nextTierPoints {
    if (_currentTierIndex >= _tierThresholds.length) return _currentPoints;
    return _tierThresholds[_currentTierIndex];
  }

  double get _progress => _nextTierPoints > 0
      ? (_currentPoints / _nextTierPoints).clamp(0.0, 1.0)
      : 1.0;

  String get _tierLabel =>
      _currentTierIndex < _tierLabels.length
          ? _tierLabels[_currentTierIndex]
          : 'Thành viên';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Thành viên'),
        bottom: _loading || _error != null
            ? null
            : PreferredSize(
                preferredSize: const Size.fromHeight(48),
                child: TabBar(
                  controller: _tabController,
                  isScrollable: false,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                  tabs: const [
                    Tab(text: 'Tổng quan'),
                    Tab(text: 'Hạng'),
                    Tab(text: 'Lịch sử'),
                    Tab(text: 'Quyền lợi'),
                  ],
                ),
              ),
      ),
      body: _loading
          ? _buildShimmer()
          : _error != null
              ? AppErrorWidget(message: _error!, onRetry: _loadData)
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildOverviewTab(),
                      _buildTierTab(),
                      _buildHistoryTab(),
                      _buildBenefitsTab(),
                    ],
                  ),
                ),
    );
  }

  // ── Tab 1: Tổng quan ──

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildMembershipCard(),
          const SizedBox(height: 16),
          _buildStatsRow(),
          const SizedBox(height: 16),
          _buildRecentPoints(),
          const SizedBox(height: 24),
          _buildReferralButton(),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            '$_currentPoints',
            'Điểm hiện tại',
            Icons.stars_rounded,
            _tierColors[_currentTierIndex],
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            '${_pointsHistory.length}',
            'Giao dịch',
            Icons.swap_horiz_rounded,
            AppColors.primary,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String value,
    String label,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 8)],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentPoints() {
    if (_pointsHistory.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Giao dịch gần đây',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (_pointsHistory.length > 5)
              GestureDetector(
                onTap: () => _tabController.animateTo(2),
                child: const Text(
                  'Xem tất cả',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        ..._pointsHistory.take(5).map(_buildPointTransaction),
      ],
    );
  }

  // ── Tab 2: Hạng thành viên ──

  Widget _buildTierTab() {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildTierSteps(),
          const SizedBox(height: 24),
          _buildTierComparison(),
        ],
      ),
    );
  }

  Widget _buildTierComparison() {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'So sánh các hạng',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 16,
                columns: const [
                  DataColumn(label: Text('Quyền lợi')),
                  DataColumn(label: Text('Đồng')),
                  DataColumn(label: Text('Bạc')),
                  DataColumn(label: Text('Vàng')),
                  DataColumn(label: Text('KC')),
                ],
                rows: const [
                  DataRow(cells: [
                    DataCell(Text('Giảm giá')),
                    DataCell(Text('0%')),
                    DataCell(Text('5%')),
                    DataCell(Text('10%')),
                    DataCell(Text('15%')),
                  ]),
                  DataRow(cells: [
                    DataCell(Text('Tích điểm')),
                    DataCell(Text('x1')),
                    DataCell(Text('x1.5')),
                    DataCell(Text('x2')),
                    DataCell(Text('x3')),
                  ]),
                  DataRow(cells: [
                    DataCell(Text('Ưu đãi SN')),
                    DataCell(Icon(Icons.close, size: 16, color: Colors.red)),
                    DataCell(Icon(Icons.check, size: 16, color: Colors.green)),
                    DataCell(Icon(Icons.check, size: 16, color: Colors.green)),
                    DataCell(Icon(Icons.check, size: 16, color: Colors.green)),
                  ]),
                  DataRow(cells: [
                    DataCell(Text('Hỗ trợ ưu tiên')),
                    DataCell(Icon(Icons.close, size: 16, color: Colors.red)),
                    DataCell(Icon(Icons.close, size: 16, color: Colors.red)),
                    DataCell(Icon(Icons.check, size: 16, color: Colors.green)),
                    DataCell(Icon(Icons.check, size: 16, color: Colors.green)),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Tab 3: Lịch sử điểm ──

  Widget _buildHistoryTab() {
    if (_pointsHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.history_rounded,
              size: 64,
              color: AppColors.textHint.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 12),
            const Text(
              'Chưa có giao dịch điểm nào',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _pointsHistory.length,
      itemBuilder: (context, index) =>
          _buildPointTransaction(_pointsHistory[index]),
    );
  }

  Widget _buildPointTransaction(dynamic item) {
    final m = item as Map<String, dynamic>;
    final pts = (m['amount'] as num?)?.toInt() ?? 0;
    final isEarned = pts > 0;
    final date = Formatters.parseDate(
      m['createdAt'] as String? ?? m['date'] as String?,
    );
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 4)],
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: isEarned
                  ? AppColors.success.withValues(alpha: 0.1)
                  : AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isEarned
                  ? Icons.add_circle_outline
                  : Icons.remove_circle_outline,
              color: isEarned ? AppColors.success : AppColors.error,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  m['description'] as String? ??
                      m['reason'] as String? ??
                      (isEarned ? 'Tích điểm' : 'Dùng điểm'),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (date != null)
                  Text(
                    Formatters.date(date),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textHint,
                    ),
                  ),
              ],
            ),
          ),
          Text(
            '${isEarned ? '+' : ''}$pts',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: isEarned ? AppColors.success : AppColors.error,
            ),
          ),
        ],
      ),
    );
  }

  // ── Tab 4: Quyền lợi ──

  Widget _buildBenefitsTab() {
    final benefits = _membership?['benefits'] as List<dynamic>?;
    if (benefits == null || benefits.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.workspace_premium_outlined,
              size: 64,
              color: AppColors.textHint.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 12),
            const Text(
              'Chưa có quyền lợi nào',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                _tierColors[_currentTierIndex],
                _tierColors[_currentTierIndex].withValues(alpha: 0.7),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.workspace_premium,
                color: Colors.white,
                size: 32,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Quyền lợi hạng $_tierLabel',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    '${benefits.length} quyền lợi đang kích hoạt',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ...benefits.map((b) {
          final m = b is Map<String, dynamic> ? b : <String, dynamic>{};
          final desc = m['description'] as String? ??
              m['name'] as String? ??
              m.toString();
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Card(
              margin: EdgeInsets.zero,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.check_circle,
                        color: AppColors.primary,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        desc,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  // ── Shared Widgets ──

  Widget _buildShimmer() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: List.generate(
        4,
        (_) => Shimmer.fromColors(
          baseColor: AppColors.shimmerBase,
          highlightColor: AppColors.shimmerHighlight,
          child: Container(
            margin: const EdgeInsets.only(bottom: 16),
            height: 120,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMembershipCard() {
    final tierColor = _tierColors[_currentTierIndex];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [tierColor, tierColor.withValues(alpha: 0.7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: tierColor.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.card_membership,
                color: Colors.white.withValues(alpha: 0.9),
                size: 28,
              ),
              const SizedBox(width: 8),
              Text(
                _tierLabel.toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$_currentPoints',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(width: 6),
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: Text(
                  'điểm',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: _progress,
              backgroundColor: Colors.white.withValues(alpha: 0.3),
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _progress >= 1.0 && _currentTierIndex >= _tierThresholds.length
                ? 'Bạn đã đạt hạng cao nhất!'
                : '$_currentPoints / $_nextTierPoints điểm lên hạng tiếp theo',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildTierSteps() {
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hạng thành viên',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            Row(
              children: List.generate(_tiers.length, (i) {
                final isActive = i <= _currentTierIndex;
                final isCurrent = i == _currentTierIndex;
                return Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: isActive
                              ? _tierColors[i]
                              : AppColors.surfaceVariant,
                          shape: BoxShape.circle,
                          border: isCurrent
                              ? Border.all(color: _tierColors[i], width: 3)
                              : null,
                          boxShadow: isCurrent
                              ? [
                                  BoxShadow(
                                    color: _tierColors[i].withValues(alpha: 0.4),
                                    blurRadius: 8,
                                  ),
                                ]
                              : null,
                        ),
                        child: Center(
                          child: Icon(
                            i < _currentTierIndex ? Icons.check : Icons.star,
                            size: 20,
                            color: isActive ? Colors.white : AppColors.textHint,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _tierLabels[i],
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight:
                              isCurrent ? FontWeight.w700 : FontWeight.w500,
                          color: isActive ? _tierColors[i] : AppColors.textHint,
                        ),
                      ),
                      Text(
                        '${_tierThresholds[i.clamp(0, _tierThresholds.length - 1)]} đ',
                        style: TextStyle(
                          fontSize: 10,
                          color:
                              isActive ? _tierColors[i] : AppColors.textHint,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReferralButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tính năng chia sẻ đang phát triển'),
            ),
          );
        },
        icon: const Icon(Icons.share),
        label: const Text('Chia sẻ giới thiệu bạn bè'),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }
}
