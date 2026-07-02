/// JSON-serializable voucher model matching backend response.
class VoucherModel {
  final String id;
  final String code;
  final String title;
  final String? description;
  final String discountType; // percentage, fixed
  final double discountValue;
  final double? minOrder;
  final String? validFrom;
  final String? validTo;
  final bool isActive;

  const VoucherModel({
    required this.id,
    required this.code,
    required this.title,
    this.description,
    required this.discountType,
    required this.discountValue,
    this.minOrder,
    this.validFrom,
    this.validTo,
    this.isActive = true,
  });

  factory VoucherModel.fromJson(Map<String, dynamic> json) {
    return VoucherModel(
      id: json['_id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      discountType: json['discountType'] as String? ?? 'percentage',
      discountValue: (json['discountValue'] as num?)?.toDouble() ?? 0.0,
      minOrder: (json['minOrder'] as num?)?.toDouble(),
      validFrom: json['validFrom'] as String?,
      validTo: json['validTo'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'code': code,
        'title': title,
        'description': description,
        'discountType': discountType,
        'discountValue': discountValue,
        'minOrder': minOrder,
        'validFrom': validFrom,
        'validTo': validTo,
        'isActive': isActive,
      };
}
