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

class _MembershipPageState extends State<MembershipPage> {
  final Dio _dio = ApiClient().dio;
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

  @override
  void initState() {
    super.initState();
    _loadData();
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
    final tier = (_membership?['tier'] as String? ?? 'Bronze').toLowerCase();
    for (int i = 0; i < _tiers.length; i++) {
      if (_tiers[i].toLowerCase() == tier) return i;
    }
    return 0;
  }

  int get _currentPoints => (_membership?['points'] as num? ?? 0).toInt();
  int get _nextTierPoints =>
      (_membership?['nextTierPoints'] as num? ?? 1000).toInt();
  double get _progress => _nextTierPoints > 0
      ? (_currentPoints / _nextTierPoints).clamp(0.0, 1.0)
      : 1.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Thành viên')),
      body: _loading
          ? _buildShimmer()
          : _error != null
          ? AppErrorWidget(message: _error!, onRetry: _loadData)
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildMembershipCard(),
                    const SizedBox(height: 20),
                    _buildTierSteps(),
                    const SizedBox(height: 20),
                    _buildBenefits(),
                    const SizedBox(height: 20),
                    _buildPointsHistory(),
                    const SizedBox(height: 12),
                    _buildReferralButton(),
                    const SizedBox(height: 24),
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
    final tierName = (_membership?['tier'] as String? ?? 'Bronze')
        .toUpperCase();
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
                tierName,
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
            _progress >= 1.0
                ? 'Bạn đã đạt hạng cao nhất!'
                : '$_currentPoints / $_nextTierPoints điểm lên hạng tiếp theo',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildTierSteps() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Hạng thành viên', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Row(
          children: List.generate(_tiers.length, (i) {
            final isActive = i <= _currentTierIndex;
            final isCurrent = i == _currentTierIndex;
            return Expanded(
              child: Column(
                children: [
                  Container(
                    width: 36,
                    height: 36,
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
                        size: 18,
                        color: isActive ? Colors.white : AppColors.textHint,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _tiers[i],
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                      color: isActive ? _tierColors[i] : AppColors.textHint,
                    ),
                  ),
                  // connector line
                  if (i < _tiers.length - 1)
                    Container(
                      height: 2,
                      margin: const EdgeInsets.only(top: -19, left: 18),
                      decoration: BoxDecoration(
                        color: i < _currentTierIndex
                            ? _tierColors[i]
                            : AppColors.divider,
                      ),
                    ),
                ],
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildBenefits() {
    final benefits = _membership?['benefits'] as List<dynamic>?;
    if (benefits == null || benefits.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quyền lợi', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...benefits.map((b) {
          final m = b as Map<String, dynamic>;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.check_circle,
                    color: AppColors.primary,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    m['description'] as String? ?? m['name'] as String? ?? '',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildPointsHistory() {
    if (_pointsHistory.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Lịch sử điểm', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ..._pointsHistory.take(10).map((item) {
          final m = item as Map<String, dynamic>;
          final pts = (m['points'] as num?)?.toInt() ?? 0;
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
                            '',
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
        }),
      ],
    );
  }

  Widget _buildReferralButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Tính năng chia sẻ đang phát triển')),
          );
        },
        icon: const Icon(Icons.share),
        label: const Text('Chia sẻ giới thiệu bạn bè'),
      ),
    );
  }
}
