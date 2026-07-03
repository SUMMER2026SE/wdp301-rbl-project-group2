import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';

/// Staff settings page with logout and support settings.
class StaffSettingsPage extends StatefulWidget {
  const StaffSettingsPage({super.key});

  @override
  State<StaffSettingsPage> createState() => _StaffSettingsPageState();
}

class _StaffSettingsPageState extends State<StaffSettingsPage> {
  bool _loadingSettings = true;
  bool _isOnline = false;
  bool _autoReply = false;
  String _greetingMsg = '';
  late final TextEditingController _greetingController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _greetingController = TextEditingController();
    _fetchSettings();
  }

  @override
  void dispose() {
    _greetingController.dispose();
    super.dispose();
  }

  Future<void> _fetchSettings() async {
    setState(() => _loadingSettings = true);
    try {
      final response = await ApiClient().dio.get(ApiEndpoints.supportSettings);
      final data = response.data?['data'] ?? response.data;
      if (!mounted) return;
      if (data != null) {
        setState(() {
          _isOnline = data['isOnline'] as bool? ?? false;
          _autoReply = data['autoReply'] as bool? ?? false;
          _greetingMsg = data['greetingMessage'] as String? ?? '';
          _greetingController.text = _greetingMsg;
          _loadingSettings = false;
        });
      } else {
        setState(() => _loadingSettings = false);
      }
    } catch (e) {
      if (mounted) setState(() => _loadingSettings = false);
    }
  }

  Future<void> _toggleOnline(bool value) async {
    setState(() => _isOnline = value);
    try {
      await ApiClient().dio.put(
        '${ApiEndpoints.supportSettings}/status',
        data: {'isOnline': value},
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isOnline = !value);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Kh\xF4ng thể cập nhật trạng th\xE1i'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _saving = true);
    try {
      await ApiClient().dio.put(
        ApiEndpoints.supportSettings,
        data: {'autoReply': _autoReply, 'greetingMessage': _greetingMsg},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Đ\xE3 lưu c\xE0i đặt'),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Kh\xF4ng thể lưu c\xE0i đặt'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthBloc>().state;
    final name = auth is AuthAuthenticated
        ? (auth.user['fullName'] as String? ?? auth.username)
        : 'Nh\xE2n vi\xEAn';
    final email = auth is AuthAuthenticated ? auth.email : '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'C\xE0i đặt',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Staff Info Card
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'N',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            email,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Nh\xE2n vi\xEAn',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Online/Offline Toggle
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    Icon(
                      _isOnline ? Icons.wifi : Icons.wifi_off,
                      color: _isOnline ? AppColors.success : AppColors.textHint,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Trạng th\xE1i hỗ trợ',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            _isOnline ? 'Đang trực tuyến' : 'Đang ngoại tuyến',
                            style: TextStyle(
                              fontSize: 12,
                              color: _isOnline
                                  ? AppColors.success
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _isOnline,
                      onChanged: _loadingSettings ? null : _toggleOnline,
                      activeThumbColor: AppColors.success,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Support Settings
            Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(
                          Icons.settings_outlined,
                          color: AppColors.primary,
                          size: 20,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'C\xE0i đặt hỗ trợ',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Tự động trả lời',
                        style: TextStyle(fontSize: 14),
                      ),
                      subtitle: const Text(
                        'Gửi tin nhắn chào mừng khi kh\xE1ch bắt đầu hỗ trợ',
                        style: TextStyle(fontSize: 12),
                      ),
                      value: _autoReply,
                      onChanged: _loadingSettings
                          ? null
                          : (val) => setState(() => _autoReply = val),
                      activeThumbColor: AppColors.primary,
                    ),
                    const Divider(),
                    const SizedBox(height: 8),
                    const Text(
                      'Lời ch\xE0o tự động',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _greetingController,
                      onChanged: (val) => _greetingMsg = val,
                      decoration: InputDecoration(
                        hintText: 'Nhập lời ch\xE0o...',
                        filled: true,
                        fillColor: AppColors.surfaceVariant,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loadingSettings || _saving
                            ? null
                            : _saveSettings,
                        child: _saving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Lưu c\xE0i đặt'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Logout button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: () =>
                    context.read<AuthBloc>().add(const AuthLogoutRequested()),
                icon: const Icon(Icons.logout_rounded, size: 20),
                label: const Text('Đăng xuất'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.error,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  textStyle: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
