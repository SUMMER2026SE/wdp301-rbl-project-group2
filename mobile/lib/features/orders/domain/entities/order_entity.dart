/// Pure domain entities for orders.
/// Free of any framework/JSON dependencies.
class OrderEntity {
  final String id;
  final String code;
  final String storeId;
  final String cusId;
  final String? staffId;
  final String status;
  final List<OrderItemEntity> items;
  final double subTotal;
  final double shippingFee;
  final double discountAmount;
  final double totalPrice;
  final String paymentMethod;
  final bool paid;
  final String? paidAt;
  final DeliveryAddressEntity? deliveryAddress;
  final String? note;
  final String? voucherCode;
  final List<StatusHistoryEntity> statusHistory;
  final CancellationInfoEntity? cancellation;
  final String createdAt;
  final String updatedAt;

  const OrderEntity({
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
}

class OrderItemEntity {
  final String productId;
  final String name;
  final int quantity;
  final double subTotal;
  final List<OrderItemVariationEntity> variations;

  const OrderItemEntity({
    required this.productId,
    required this.name,
    required this.quantity,
    this.subTotal = 0.0,
    this.variations = const [],
  });
}

class OrderItemVariationEntity {
  final String name;
  final String choice;
  final double? extraPrice;

  const OrderItemVariationEntity({
    required this.name,
    required this.choice,
    this.extraPrice,
  });
}

class DeliveryAddressEntity {
  final String receiverName;
  final String phone;
  final String detail;
  final String ward;
  final String? district;
  final String city;

  const DeliveryAddressEntity({
    required this.receiverName,
    required this.phone,
    required this.detail,
    required this.ward,
    this.district,
    required this.city,
  });
}

class StatusHistoryEntity {
  final String status;
  final String? changedBy;
  final String? actorRole;
  final String? reason;
  final String createdAt;

  const StatusHistoryEntity({
    required this.status,
    this.changedBy,
    this.actorRole,
    this.reason,
    required this.createdAt,
  });
}

class CancellationInfoEntity {
  final String reason;
  final String cancelledBy;
  final bool refundRequired;
  final String? refundedAt;

  const CancellationInfoEntity({
    required this.reason,
    required this.cancelledBy,
    this.refundRequired = false,
    this.refundedAt,
  });
}
