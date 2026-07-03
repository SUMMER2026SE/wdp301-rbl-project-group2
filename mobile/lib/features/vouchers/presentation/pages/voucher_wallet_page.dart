import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/utils/formatters.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'package:shimmer/shimmer.dart';

class VoucherWalletPage extends StatefulWidget {
  const VoucherWalletPage({super.key});

  @override
  State<VoucherWalletPage> createState() => _VoucherWalletPageState();
}

class _VoucherWalletPageState extends State<VoucherWalletPage>
    with SingleTickerProviderStateMixin {
  final Dio _dio = ApiClient().dio;
  late TabController _tabController;

  List<dynamic> _available = [];
  List<dynamic> _used = [];
  List<dynamic> _expired = [];
  List<dynamic> _rewardVouchers = [];
  int _userPoints = 0;
  String? _referralCode;
  bool _loading = true;
  String? _error;
  String? _redeemingId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadWallet();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadWallet() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _dio.get(
          ApiEndpoints.voucherWallet,
          queryParameters: {'ownerId': 'me'},
        ),
        _dio.get(ApiEndpoints.userMembership),
        _dio.get(ApiEndpoints.vouchers, queryParameters: {'isReward': true}),
        _dio.get(ApiEndpoints.userMembership),
      ]);

      // ── Wallet (tab 1-3) ──
      final walletData =
          results[0].data['data'] as List<dynamic>? ??
          results[0].data as List<dynamic>;
      final now = DateTime.now();
      final available = <dynamic>[];
      final used = <dynamic>[];
      final expired = <dynamic>[];
      for (final item in walletData) {
        final m = item as Map<String, dynamic>;
        final status = m['status'] as String?;
        if (status == 'used') {
          used.add(item);
        } else if (status == 'expired') {
          expired.add(item);
        } else {
          final validUntil = Formatters.parseDate(m['validUntil'] as String?);
          if (validUntil != null && validUntil.isBefore(now)) {
            expired.add(item);
          } else {
            available.add(item);
          }
        }
      }

      // ── Points balance ──
      final pointsData = results[1].data['data'];
      int points = 0;
      if (pointsData is Map<String, dynamic>) {
        points =
            (pointsData['collectedPoints'] ?? pointsData['points'] ?? 0) as int;
      } else if (pointsData is int) {
        points = pointsData;
      }

      // ── Reward vouchers (tab 4) ──
      final rewardData =
          results[2].data['data'] as List<dynamic>? ??
          results[2].data as List<dynamic>;

      // ── Membership / referral code ──
      final membershipData =
          results[3].data['data'] as Map<String, dynamic>? ??
          results[3].data as Map<String, dynamic>;
      final referralCode = membershipData['referralCode'] as String?;

      setState(() {
        _available = available;
        _used = used;
        _expired = expired;
        _userPoints = points;
        _rewardVouchers = rewardData;
        _referralCode = referralCode;
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _error =
            e.response?.data['message'] as String? ??
            'Không thể tải ví voucher';
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Đã xảy ra lỗi';
        _loading = false;
      });
    }
  }

  void _shareReferral() {
    final code = _referralCode ?? 'FOA-REFERRAL';
    final link = 'https://foa.app/refer?code=$code';
    Clipboard.setData(ClipboardData(text: link));
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đã copy link giới thiệu')));
    }
  }

  Future<void> _redeemVoucher(String voucherId) async {
    setState(() => _redeemingId = voucherId);
    try {
      await _dio.post('/vouchers/$voucherId/redeem');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đổi voucher thành công!')),
        );
        unawaited(_loadWallet());
      }
    } on DioException catch (e) {
      final msg =
          e.response?.data['message'] as String? ?? 'Không thể đổi voucher';
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
    } finally {
      if (mounted) setState(() => _redeemingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Ví voucher'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          isScrollable: true,
          tabs: [
            Tab(text: 'Có thể dùng (${_available.length})'),
            Tab(text: 'Đã dùng (${_used.length})'),
            Tab(text: 'Đã hết hạn (${_expired.length})'),
            const Tab(text: 'Đổi thưởng'),
          ],
        ),
      ),
      body: _loading
          ? _buildShimmer()
          : _error != null
          ? AppErrorWidget(message: _error!, onRetry: _loadWallet)
          : Column(
              children: [
                _buildPointsHeader(),
                _buildReferralCard(),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildTabContent(_available, 'Chưa có voucher nào'),
                      _buildTabContent(_used, 'Chưa có voucher nào'),
                      _buildTabContent(_expired, 'Chưa có voucher nào'),
                      _buildRewardShop(),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildPointsHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: AppColors.primary.withValues(alpha: 0.08),
      child: Row(
        children: [
          Icon(Icons.monetization_on, color: AppColors.primary, size: 28),
          const SizedBox(width: 10),
          const Text(
            'Điểm thưởng:',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            '$_userPoints điểm',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReferralCard() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.secondary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.people_alt_outlined,
              color: AppColors.secondary,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Giới thiệu bạn bè',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: _shareReferral,
            icon: const Icon(Icons.share, size: 18),
            label: const Text(
              'Chia sẻ',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.secondary,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRewardShop() {
    if (_rewardVouchers.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.card_giftcard_outlined, size: 64, color: Colors.black26),
            SizedBox(height: 12),
            Text(
              'Chưa có voucher đổi thưởng',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadWallet,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: 210,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _rewardVouchers.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (_, i) =>
                _buildRewardCard(_rewardVouchers[i] as Map<String, dynamic>),
          ),
        ),
      ),
    );
  }

  Widget _buildRewardCard(Map<String, dynamic> v) {
    final id = v['_id'] as String? ?? '';
    final title = v['title'] as String? ?? '';
    final description = v['description'] as String? ?? '';
    final pointCost = v['pointCost'] as int? ?? 0;
    final canAfford = _userPoints >= pointCost;
    final isRedeeming = _redeemingId == id;

    return Container(
      width: 170,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.card_giftcard,
              color: AppColors.primary,
              size: 26,
            ),
          ),
          const Spacer(),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              description,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 6),
          Text(
            '$pointCost điểm',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canAfford && !isRedeeming
                  ? () => _redeemVoucher(id)
                  : null,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(0, 32),
                padding: const EdgeInsets.symmetric(vertical: 6),
                textStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: isRedeeming
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(canAfford ? 'Đổi' : 'Thiếu điểm'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent(List<dynamic> items, String emptyMsg) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wallet_outlined, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text(
              emptyMsg,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadWallet,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        itemBuilder: (_, i) => _buildCard(items[i] as Map<String, dynamic>),
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
          height: 140,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildCard(Map<String, dynamic> v) {
    final status = v['status'] as String? ?? 'available';
    final isUsed = status == 'used';
    final isExpired = status == 'expired';
    final isAvailable = !isUsed && !isExpired;
    final validUntil = Formatters.parseDate(v['validUntil'] as String?);

    final Color bgColor;
    final Color textColor;
    String? overlayLabel;

    if (isUsed) {
      bgColor = Colors.grey[100]!;
      textColor = Colors.grey[500]!;
      overlayLabel = 'Đã dùng';
    } else if (isExpired) {
      bgColor = Colors.grey[100]!;
      textColor = Colors.grey[500]!;
      overlayLabel = 'Đã hết hạn';
    } else {
      bgColor = Colors.white;
      textColor = AppColors.textPrimary;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: isAvailable
                        ? AppColors.primary.withValues(alpha: 0.1)
                        : Colors.grey[200],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.local_offer,
                    color: isAvailable ? AppColors.primary : Colors.grey[400],
                    size: 28,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        v['title'] as String? ?? '',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: textColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        v['description'] as String? ?? '',
                        style: TextStyle(
                          fontSize: 12,
                          color: isAvailable
                              ? AppColors.textSecondary
                              : Colors.grey[400],
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (validUntil != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'HSD: ${Formatters.date(validUntil)}',
                          style: TextStyle(
                            fontSize: 11,
                            color: isAvailable
                                ? AppColors.textHint
                                : Colors.grey[400],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (isAvailable)
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(80, 32),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    child: const Text('Dùng ngay'),
                  ),
              ],
            ),
          ),
          if (overlayLabel != null)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isUsed ? AppColors.info : Colors.grey[400],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  overlayLabel,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
