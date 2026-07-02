import 'package:foa_mobile/features/vouchers/data/models/voucher_model.dart';

/// JSON-serializable user voucher (wallet) model matching backend response.
class UserVoucherModel {
  final String id;
  final VoucherModel voucher;
  final bool used;
  final String? usedAt;
  final String? expiresAt;
  final String receivedAt;

  const UserVoucherModel({
    required this.id,
    required this.voucher,
    this.used = false,
    this.usedAt,
    this.expiresAt,
    required this.receivedAt,
  });

  factory UserVoucherModel.fromJson(Map<String, dynamic> json) {
    return UserVoucherModel(
      id: json['_id'] as String? ?? '',
      voucher: VoucherModel.fromJson(
          json['voucher'] as Map<String, dynamic>? ?? {}),
      used: json['used'] as bool? ?? false,
      usedAt: json['usedAt'] as String?,
      expiresAt: json['expiresAt'] as String?,
      receivedAt: json['receivedAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'voucher': voucher.toJson(),
        'used': used,
        'usedAt': usedAt,
        'expiresAt': expiresAt,
        'receivedAt': receivedAt,
      };
}
