import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/shared/widgets/error_widget.dart';
import 'dart:io';

class EditProfilePage extends StatefulWidget {
  const EditProfilePage({super.key});

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  final Dio _dio = ApiClient().dio;
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController();
  final _fullnameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  File? _avatarFile;
  String? _avatarUrl;
  bool _saving = false;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _fullnameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  void _loadUserData() {
    final authState = context.read<AuthBloc>().state;
    if (authState is AuthAuthenticated) {
      final user = authState.user;
      _usernameCtrl.text = user['username'] as String? ?? '';
      _fullnameCtrl.text = user['fullname'] as String? ?? user['fullName'] as String? ?? '';
      _phoneCtrl.text = user['phone'] as String? ?? '';
      _emailCtrl.text = authState.email;
      _avatarUrl = user['avatar'] as String?;
    } else {
      _loadError = 'Không thể tải thông tin người dùng';
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, maxWidth: 512, maxHeight: 512);
    if (!mounted) return;
    if (picked != null) {
      setState(() => _avatarFile = File(picked.path));
    }
  }

  void _showImagePicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Chọn ảnh', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Chụp ảnh'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Chọn từ thư viện'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _validatePhone(String? value) {
    if (value == null || value.isEmpty) return 'Vui lòng nhập số điện thoại';
    final cleaned = value.replaceAll(RegExp(r'\s+'), '');
    if (cleaned.length < 9 || cleaned.length > 11) return 'Số điện thoại không hợp lệ';
    if (!RegExp(r'^0\d{8,10}$').hasMatch(cleaned)) return 'Số điện thoại không hợp lệ';
    return null;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      final fd = FormData();
      if (_usernameCtrl.text.isNotEmpty) fd.fields.add(MapEntry('username', _usernameCtrl.text));
      if (_fullnameCtrl.text.isNotEmpty) fd.fields.add(MapEntry('fullName', _fullnameCtrl.text));
      if (_phoneCtrl.text.isNotEmpty) fd.fields.add(MapEntry('phone', _phoneCtrl.text.replaceAll(RegExp(r'\s+'), '')));
      if (_avatarFile != null) {
        fd.files.add(MapEntry('avatar', await MultipartFile.fromFile(_avatarFile!.path)));
      }

      final res = await _dio.patch(ApiEndpoints.userProfile, data: fd);
      final updatedUser = res.data['data'] as Map<String, dynamic>? ?? res.data as Map<String, dynamic>;

      if (mounted) {
        context.read<AuthBloc>().add(AuthUserUpdated(updatedUser));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cập nhật thành công'), backgroundColor: AppColors.success),
        );
        Navigator.pop(context);
      }
    } on DioException catch (e) {
      final msg = e.response?.data['message'] as String? ?? 'Không thể cập nhật hồ sơ';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã xảy ra lỗi')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadError != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chỉnh sửa hồ sơ')),
        body: AppErrorWidget(message: _loadError!),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Chỉnh sửa hồ sơ', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Avatar card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 14, offset: const Offset(0, 6))],
                ),
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: _showImagePicker,
                      child: Stack(
                        children: [
                          CircleAvatar(
                            radius: 50,
                            backgroundColor: AppColors.surfaceVariant,
                            backgroundImage: _avatarFile != null
                                ? FileImage(_avatarFile!)
                                : (_avatarUrl != null && _avatarUrl!.isNotEmpty ? NetworkImage(_avatarUrl!) : null),
                            child: (_avatarFile == null && (_avatarUrl == null || _avatarUrl!.isEmpty))
                                ? const Icon(Icons.person, size: 48, color: AppColors.textHint)
                                : null,
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 3),
                              ),
                              child: const Icon(Icons.camera_alt_rounded, size: 18, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text('Nhấn để thay đổi ảnh đại diện', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Info card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: AppColors.shadow, blurRadius: 14, offset: const Offset(0, 6))],
                ),
                child: Column(
                  children: [
                    _profileField(controller: _usernameCtrl, label: 'Tên đăng nhập', hint: 'Nhập tên đăng nhập', icon: Icons.person_outline, validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập tên đăng nhập' : null),
                    const SizedBox(height: 16),
                    _profileField(controller: _fullnameCtrl, label: 'Họ và tên', hint: 'Nhập họ và tên', icon: Icons.badge_outlined, validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ và tên' : null),
                    const SizedBox(height: 16),
                    _profileField(controller: _phoneCtrl, label: 'Số điện thoại', hint: 'Nhập số điện thoại', icon: Icons.phone_outlined, keyboardType: TextInputType.phone, validator: _validatePhone),
                    const SizedBox(height: 16),
                    _profileField(controller: _emailCtrl, label: 'Email', hint: 'Email', icon: Icons.email_outlined, readOnly: true),
                  ],
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10)],
          ),
          child: SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Lưu thay đổi'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _profileField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    bool readOnly = false,
    IconData? icon,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      readOnly: readOnly,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: icon == null ? null : Icon(icon),
      ),
    );
  }
}
