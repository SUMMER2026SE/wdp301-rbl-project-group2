import 'package:foa_mobile/features/orders/data/models/order_item_model.dart';
import 'package:foa_mobile/features/orders/domain/entities/order_entity.dart';

/// JSON-serializable order model matching backend IOrder.
class OrderModel {
  final String id;
  final String code;
  final String storeId;
  final String cusId;
  final String? staffId;
  final String status;
  final List<OrderItemModel> items;
  final double subTotal;
  final double shippingFee;
  final double discountAmount;
  final double totalPrice;
  final String paymentMethod;
  final bool paid;
  final String? paidAt;
  final DeliveryAddressModel? deliveryAddress;
  final String? note;
  final String? voucherCode;
  final List<StatusHistoryModel> statusHistory;
  final CancellationInfoModel? cancellation;
  final DateTime createdAt;
  final DateTime updatedAt;

  const OrderModel({
    required this.id,
    required this.code,
    required this.storeId,
    required this.cusId,
    this.staffId,
    required this.status,
    this.items = const [],
    this.subTotal = 0.0,
    this.shippingFee = 0.0,
    this.discountAmount = 0.0,
    this.totalPrice = 0.0,
    this.paymentMethod = 'cash',
    this.paid = false,
    this.paidAt,
    this.deliveryAddress,
    this.note,
    this.voucherCode,
    this.statusHistory = const [],
    this.cancellation,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['_id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      storeId: json['storeId'] as String? ?? '',
      cusId: json['cusId'] as String? ?? '',
      staffId: json['staffId'] as String?,
      status: json['status'] as String? ?? 'pending',
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => OrderItemModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      subTotal: (json['subTotal'] as num?)?.toDouble() ?? 0.0,
      shippingFee: (json['shippingFee'] as num?)?.toDouble() ?? 0.0,
      discountAmount: (json['discountAmount'] as num?)?.toDouble() ?? 0.0,
      totalPrice: (json['totalPrice'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: _parsePaymentMethod(json),
      paid: json['paid'] as bool? ?? false,
      paidAt: _parsePaidAt(json),
      deliveryAddress: json['deliveryAddress'] != null
          ? DeliveryAddressModel.fromJson(
              json['deliveryAddress'] as Map<String, dynamic>,
            )
          : null,
      note: json['note'] as String?,
      voucherCode: json['voucherCode'] as String?,
      statusHistory:
          (json['statusHistory'] as List<dynamic>?)
              ?.map(
                (e) => StatusHistoryModel.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          [],
      cancellation: json['cancellation'] != null
          ? CancellationInfoModel.fromJson(
              json['cancellation'] as Map<String, dynamic>,
            )
          : null,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'code': code,
    'storeId': storeId,
    'cusId': cusId,
    'staffId': staffId,
    'status': status,
    'items': items.map((i) => i.toJson()).toList(),
    'subTotal': subTotal,
    'shippingFee': shippingFee,
    'discountAmount': discountAmount,
    'totalPrice': totalPrice,
    'paymentMethod': paymentMethod,
    'paid': paid,
    'paidAt': paidAt,
    'deliveryAddress': deliveryAddress?.toJson(),
    'note': note,
    'voucherCode': voucherCode,
    'statusHistory': statusHistory.map((s) => s.toJson()).toList(),
    'cancellation': cancellation?.toJson(),
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  OrderEntity toEntity() => OrderEntity(
    id: id,
    code: code,
    storeId: storeId,
    cusId: cusId,
    staffId: staffId,
    status: status,
    items: items.map((i) => i.toEntity()).toList(),
    subTotal: subTotal,
    shippingFee: shippingFee,
    discountAmount: discountAmount,
    totalPrice: totalPrice,
    paymentMethod: paymentMethod,
    paid: paid,
    paidAt: paidAt,
    deliveryAddress: deliveryAddress?.toEntity(),
    note: note,
    voucherCode: voucherCode,
    statusHistory: statusHistory.map((s) => s.toEntity()).toList(),
    cancellation: cancellation?.toEntity(),
    createdAt: createdAt.toIso8601String(),
    updatedAt: updatedAt.toIso8601String(),
  );

  /// Extract paymentMethod from either root or nested payment.method.
  static String _parsePaymentMethod(Map<String, dynamic> json) {
    if (json['paymentMethod'] != null) {
      return json['paymentMethod'] as String;
    }
    final payment = json['payment'] as Map<String, dynamic>?;
    return payment?['method'] as String? ?? 'cash';
  }

  /// Extract paidAt from either root or nested payment.paidAt.
  static String? _parsePaidAt(Map<String, dynamic> json) {
    if (json['paidAt'] != null) {
      return json['paidAt'] as String?;
    }
    final payment = json['payment'] as Map<String, dynamic>?;
    return payment?['paidAt'] as String?;
  }
}

class DeliveryAddressModel {
  final String receiverName;
  final String phone;
  final String detail;
  final String ward;
  final String? district;
  final String city;

  const DeliveryAddressModel({
    required this.receiverName,
    required this.phone,
    required this.detail,
    required this.ward,
    this.district,
    required this.city,
  });

  factory DeliveryAddressModel.fromJson(Map<String, dynamic> json) =>
      DeliveryAddressModel(
        receiverName: json['receiverName'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        detail: json['detail'] as String? ?? '',
        ward: json['ward'] as String? ?? '',
        district: json['district'] as String?,
        city: json['city'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
    'receiverName': receiverName,
    'phone': phone,
    'detail': detail,
    'ward': ward,
    'district': district,
    'city': city,
  };

  DeliveryAddressEntity toEntity() => DeliveryAddressEntity(
    receiverName: receiverName,
    phone: phone,
    detail: detail,
    ward: ward,
    district: district,
    city: city,
  );
}

class StatusHistoryModel {
  final String status;
  final String? changedBy;
  final String? actorRole;
  final String? reason;
  final DateTime createdAt;

  const StatusHistoryModel({
    required this.status,
    this.changedBy,
    this.actorRole,
    this.reason,
    required this.createdAt,
  });

  factory StatusHistoryModel.fromJson(Map<String, dynamic> json) =>
      StatusHistoryModel(
        status: json['status'] as String? ?? '',
        changedBy: json['changedBy'] as String?,
        actorRole: json['actorRole'] as String?,
        reason: json['reason'] as String?,
        createdAt:
            DateTime.tryParse(json['createdAt'] as String? ?? '') ??
            DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
    'status': status,
    'changedBy': changedBy,
    'actorRole': actorRole,
    'reason': reason,
    'createdAt': createdAt.toIso8601String(),
  };

  StatusHistoryEntity toEntity() => StatusHistoryEntity(
    status: status,
    changedBy: changedBy,
    actorRole: actorRole,
    reason: reason,
    createdAt: createdAt.toIso8601String(),
  );
}

class CancellationInfoModel {
  final String reason;
  final String cancelledBy;
  final bool refundRequired;
  final String? refundedAt;

  const CancellationInfoModel({
    required this.reason,
    required this.cancelledBy,
    this.refundRequired = false,
    this.refundedAt,
  });

  factory CancellationInfoModel.fromJson(Map<String, dynamic> json) =>
      CancellationInfoModel(
        reason: json['reason'] as String? ?? '',
        cancelledBy: json['cancelledBy'] as String? ?? 'customer',
        refundRequired: json['refundRequired'] as bool? ?? false,
        refundedAt: json['refundedAt'] as String?,
      );

  Map<String, dynamic> toJson() => {
    'reason': reason,
    'cancelledBy': cancelledBy,
    'refundRequired': refundRequired,
    'refundedAt': refundedAt,
  };

  CancellationInfoEntity toEntity() => CancellationInfoEntity(
    reason: reason,
    cancelledBy: cancelledBy,
    refundRequired: refundRequired,
    refundedAt: refundedAt,
  );
}
