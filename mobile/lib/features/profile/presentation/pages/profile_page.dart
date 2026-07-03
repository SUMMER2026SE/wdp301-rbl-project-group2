import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Customer profile page with settings and logout.
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _isUpdatingCampaignNotif = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AuthBloc>().state;
    final user = state is AuthAuthenticated ? state.user : <String, dynamic>{};
    final name = _displayName(user);
    final email = user['email'] as String? ?? '';
    final phone = user['phone'] as String? ?? '';
    final avatarUrl = user['avatar'] as String? ?? '';
    final points = user['collectedPoints'] is num
        ? (user['collectedPoints'] as num).toInt()
        : 0;

    // Membership tier — backend returns "tier" (bronze, silver, gold, diamond)
    final membershipRaw = user['tier'] as String? ?? '';

    // Stats come directly from backend /users/me response
    final ordersCount = user['ordersCount'] is num
        ? (user['ordersCount'] as num).toInt()
        : 0;
    final reviewsCount = user['reviewsCount'] is num
        ? (user['reviewsCount'] as num).toInt()
        : 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Tài khoản',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Chỉnh sửa hồ sơ',
            onPressed: () => context.push('/profile/edit'),
            icon: const Icon(Icons.more_horiz_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // Trigger auth check to re-fetch /users/me with fresh stats & tier
          context.read<AuthBloc>().add(const AuthCheckRequested());
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            _ProfileHeroCard(
              name: name,
              email: email,
              phone: phone,
              avatarUrl: avatarUrl,
              points: points,
              membershipTier: membershipRaw,
              ordersCount: ordersCount,
              reviewsCount: reviewsCount,
              statsLoading: false,
              onEdit: () => context.push('/profile/edit'),
            ),
            const SizedBox(height: 20),
            _ProfileSection(
              title: 'Ăn uống của tôi',
              children: [
                _ProfileMenuTile(
                  icon: Icons.favorite_outline_rounded,
                  title: 'Sức khỏe & dị ứng',
                  subtitle: 'Cá nhân hóa món ăn phù hợp với bạn',
                  onTap: () => context.push('/profile/health'),
                ),
                const _ProfileDivider(),
                _ProfileMenuTile(
                  icon: Icons.location_on_outlined,
                  title: 'Địa chỉ giao hàng',
                  subtitle: 'Quản lý nơi nhận đơn quen thuộc',
                  onTap: () => context.push('/profile/addresses'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _ProfileSection(
              title: 'Hỗ trợ & liên hệ',
              children: [
                _ProfileMenuTile(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'Tin nhắn hỗ trợ',
                  subtitle: 'Trò chuyện với nhân viên hỗ trợ',
                  onTap: () => context.push('/chat'),
                ),
                const _ProfileDivider(),
                _ProfileMenuTile(
                  icon: Icons.info_outline_rounded,
                  title: 'Về chúng tôi',
                  subtitle: 'Thông tin ứng dụng và liên hệ',
                  onTap: () => context.push('/profile/about'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _ProfileSection(
              title: 'Tài khoản',
              children: [
                _ProfileMenuTile(
                  icon: Icons.lock_outline_rounded,
                  title: 'Đổi mật khẩu',
                  subtitle: 'Cập nhật mật khẩu đăng nhập',
                  onTap: () => _showChangePasswordSheet(context),
                ),
                const _ProfileDivider(),
                SwitchListTile(
                  secondary: const _ProfileIconBadge(
                    icon: Icons.campaign_outlined,
                  ),
                  title: const Text(
                    'Thông báo khuyến mãi',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  subtitle: const Text(
                    'Nhận ưu đãi và voucher mới',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  value: user['receiveCampaignNotifications'] == true,
                  onChanged: _isUpdatingCampaignNotif
                      ? null
                      : (val) => _updateCampaignNotif(context, val),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 4,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _LogoutTile(
              onTap: () =>
                  context.read<AuthBloc>().add(const AuthLogoutRequested()),
            ),
          ],
        ),
      ),
    );
  }

  String _displayName(Map<String, dynamic> user) {
    final fullName = user['fullName'] as String?;
    final fullname = user['fullname'] as String?;
    final username = user['username'] as String?;
    final value = fullName?.trim().isNotEmpty == true
        ? fullName!.trim()
        : fullname?.trim().isNotEmpty == true
        ? fullname!.trim()
        : username?.trim().isNotEmpty == true
        ? username!.trim()
        : 'Người dùng';
    return value;
  }

  void _showChangePasswordSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => const _ChangePasswordSheet(),
    );
  }

  Future<void> _updateCampaignNotif(BuildContext context, bool value) async {
    final authBloc = context.read<AuthBloc>();
    final authState = authBloc.state;
    if (authState is! AuthAuthenticated) return;

    final previousUser = Map<String, dynamic>.from(authState.user);
    final previousValue = previousUser['receiveCampaignNotifications'] == true;
    final nextUser = {...previousUser, 'receiveCampaignNotifications': value};

    setState(() => _isUpdatingCampaignNotif = true);
    authBloc.add(AuthUserUpdated(nextUser));

    try {
      await ApiClient().dio.patch(
        ApiEndpoints.userProfile,
        data: {'receiveCampaignNotifications': value},
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              value
                  ? 'Đã bật thông báo khuyến mãi'
                  : 'Đã tắt thông báo khuyến mãi',
            ),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
          ),
        );
      }
    } on DioException catch (_) {
      authBloc.add(
        AuthUserUpdated({
          ...previousUser,
          'receiveCampaignNotifications': previousValue,
        }),
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể cập nhật thông báo khuyến mãi'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdatingCampaignNotif = false);
    }
  }
}

// ── Hero Card ──

class _ProfileHeroCard extends StatelessWidget {
  const _ProfileHeroCard({
    required this.name,
    required this.email,
    required this.phone,
    required this.avatarUrl,
    required this.points,
    required this.membershipTier,
    required this.ordersCount,
    required this.reviewsCount,
    required this.statsLoading,
    required this.onEdit,
  });

  final String name;
  final String email;
  final String phone;
  final String avatarUrl;
  final int points;
  final String membershipTier;
  final int ordersCount;
  final int reviewsCount;
  final bool statsLoading;
  final VoidCallback onEdit;

  /// Map tier key → display label & color
  static const _tierMeta = <String, Map<String, dynamic>>{
    'bronze': {'label': 'Đồng', 'color': Color(0xFFCD7F32)},
    'silver': {'label': 'Bạc', 'color': Color(0xFF9E9E9E)},
    'gold': {'label': 'Vàng', 'color': Color(0xFFF9A825)},
    'diamond': {'label': 'Kim cương', 'color': Color(0xFF64B5F6)},
  };

  @override
  Widget build(BuildContext context) {
    final tier = membershipTier.toLowerCase();
    final meta = _tierMeta[tier];
    final hasTier = meta != null;
    final tierColor = hasTier
        ? (meta['color'] as Color)
        : AppColors.primary;
    final tierLabel = hasTier ? (meta['label'] as String) : null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            height: 72,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary.withValues(alpha: 0.18),
                  AppColors.accent.withValues(alpha: 0.10),
                  Colors.white,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
          ),
          Transform.translate(
            offset: const Offset(0, -34),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 0),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _ProfileAvatar(name: name, avatarUrl: avatarUrl),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              if (email.isNotEmpty)
                                Text(
                                  email,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              if (phone.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  phone,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                      Tooltip(
                        message: 'Chỉnh sửa hồ sơ',
                        child: InkWell(
                          onTap: onEdit,
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Icon(
                              Icons.edit_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  // Membership tier chip (replaces redundant points badge)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: tierLabel != null
                        ? _MembershipChip(
                            label: tierLabel,
                            color: tierColor,
                          )
                        : _MembershipChip(
                            label: 'Thành viên',
                            color: AppColors.primary,
                            isBasic: true,
                          ),
                  ),
                  const SizedBox(height: 16),
                  const _ReceiptDivider(),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _ProfileStat(
                          value: statsLoading ? '...' : ordersCount.toString(),
                          label: 'Đơn hàng',
                          icon: Icons.receipt_long_outlined,
                        ),
                      ),
                      Expanded(
                        child: _ProfileStat(
                          value: statsLoading ? '...' : reviewsCount.toString(),
                          label: 'Đánh giá',
                          icon: Icons.star_outline_rounded,
                        ),
                      ),
                      Expanded(
                        child: _ProfileStat(
                          value: points.toString(),
                          label: 'Điểm thưởng',
                          icon: Icons.stars_rounded,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MembershipChip extends StatelessWidget {
  const _MembershipChip({
    required this.label,
    required this.color,
    this.isBasic = false,
  });

  final String label;
  final Color color;
  final bool isBasic;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isBasic ? 0.10 : 0.15),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.40)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isBasic ? Icons.card_membership_rounded : Icons.workspace_premium_rounded,
            color: color,
            size: 15,
          ),
          const SizedBox(width: 6),
          Text(
            isBasic ? label : 'Hạng $label',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({required this.name, required this.avatarUrl});

  final String name;
  final String avatarUrl;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 38,
      backgroundColor: Colors.white,
      child: CircleAvatar(
        radius: 34,
        backgroundColor: AppColors.primary,
        backgroundImage: avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
        child: avatarUrl.isEmpty
            ? Text(
                name.isNotEmpty ? name[0].toUpperCase() : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              )
            : null,
      ),
    );
  }
}

class _ReceiptDivider extends StatelessWidget {
  const _ReceiptDivider();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(
        18,
        (index) => Expanded(
          child: Container(
            height: 1,
            margin: const EdgeInsets.symmetric(horizontal: 2),
            color: index.isEven ? AppColors.divider : Colors.transparent,
          ),
        ),
      ),
    );
  }
}

class _ProfileStat extends StatelessWidget {
  const _ProfileStat({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: AppColors.shadow,
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(children: children),
        ),
      ],
    );
  }
}

class _ProfileMenuTile extends StatelessWidget {
  const _ProfileMenuTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      minVerticalPadding: 14,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      leading: _ProfileIconBadge(icon: icon),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textHint,
      ),
      onTap: onTap,
    );
  }
}

class _ProfileIconBadge extends StatelessWidget {
  const _ProfileIconBadge({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Icon(icon, color: AppColors.primary, size: 21),
    );
  }
}

class _ProfileDivider extends StatelessWidget {
  const _ProfileDivider();

  @override
  Widget build(BuildContext context) {
    return const Divider(
      height: 1,
      indent: 66,
      endIndent: 14,
      color: AppColors.divider,
    );
  }
}

class _LogoutTile extends StatelessWidget {
  const _LogoutTile({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            children: [
              Icon(Icons.logout_rounded, color: AppColors.error),
              SizedBox(width: 12),
              Text(
                'Đăng xuất',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.error,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bottom sheet content with change password form.
class _ChangePasswordSheet extends StatefulWidget {
  const _ChangePasswordSheet();

  @override
  State<_ChangePasswordSheet> createState() => _ChangePasswordSheetState();
}

class _ChangePasswordSheetState extends State<_ChangePasswordSheet> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _showCurrentPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      await ApiClient().dio.post(
        ApiEndpoints.changePassword,
        data: {
          'currentPassword': _currentPasswordController.text,
          'newPassword': _newPasswordController.text,
        },
      );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đổi mật khẩu thành công'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.success,
          ),
        );
      }
    } on DioException catch (e) {
      final message = _messageFromErrorResponse(
        e.response?.data,
        'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã xảy ra lỗi. Vui lòng thử lại.'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _messageFromErrorResponse(dynamic responseData, String fallback) {
    if (responseData is Map<String, dynamic>) {
      final message = responseData['message'];
      if (message is String && message.trim().isNotEmpty) return message;
    }
    return fallback;
  }

  String? _validateNewPassword(String? value) {
    if (value == null || value.isEmpty) return 'Vui lòng nhập mật khẩu mới';
    if (value.contains(RegExp(r'\s'))) {
      return 'Mật khẩu không được chứa khoảng trắng';
    }
    if (value.length < 8) return 'Mật khẩu phải có tối thiểu 8 ký tự';
    if (!value.contains(RegExp(r'[A-Z]'))) {
      return 'Mật khẩu phải chứa ít nhất một chữ viết hoa';
    }
    if (!value.contains(RegExp(r'[0-9]'))) {
      return 'Mật khẩu phải chứa ít nhất một chữ số';
    }
    if (!value.contains(RegExp(r'[^a-zA-Z0-9]'))) {
      return 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt';
    }
    return null;
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required bool isVisible,
    required VoidCallback onToggleVisibility,
    required String? Function(String?) validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: !isVisible,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
        suffixIcon: IconButton(
          tooltip: isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu',
          onPressed: onToggleVisibility,
          icon: Icon(
            isVisible
                ? Icons.visibility_off_outlined
                : Icons.visibility_outlined,
            size: 20,
          ),
        ),
        filled: true,
        fillColor: AppColors.surfaceVariant.withValues(alpha: 0.55),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: AppColors.divider.withValues(alpha: 0.7),
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.error, width: 1.4),
        ),
      ),
      validator: validator,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.divider,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.admin_panel_settings_outlined,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Đổi mật khẩu',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Sử dụng mật khẩu mạnh để bảo vệ tài khoản của bạn.',
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.35,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                _buildPasswordField(
                  controller: _currentPasswordController,
                  label: 'Mật khẩu hiện tại',
                  hint: 'Nhập mật khẩu đang dùng',
                  isVisible: _showCurrentPassword,
                  onToggleVisibility: () => setState(
                    () => _showCurrentPassword = !_showCurrentPassword,
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Vui lòng nhập mật khẩu hiện tại';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                _buildPasswordField(
                  controller: _newPasswordController,
                  label: 'Mật khẩu mới',
                  hint: '8+ ký tự, chữ hoa, số và ký tự đặc biệt',
                  isVisible: _showNewPassword,
                  onToggleVisibility: () =>
                      setState(() => _showNewPassword = !_showNewPassword),
                  validator: _validateNewPassword,
                ),
                const SizedBox(height: 14),
                _buildPasswordField(
                  controller: _confirmPasswordController,
                  label: 'Xác nhận mật khẩu mới',
                  hint: 'Nhập lại mật khẩu mới',
                  isVisible: _showConfirmPassword,
                  onToggleVisibility: () => setState(
                    () => _showConfirmPassword = !_showConfirmPassword,
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Vui lòng xác nhận mật khẩu mới';
                    }
                    if (value != _newPasswordController.text) {
                      return 'Mật khẩu xác nhận không khớp';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 22),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _changePassword,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Cập nhật mật khẩu',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
