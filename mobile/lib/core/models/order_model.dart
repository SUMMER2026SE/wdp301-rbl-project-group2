import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/models/product_model.dart';
import 'package:foa_mobile/core/constants/order_status.dart';

class OrderModel {
  final String id;
  final String code;
  final String? storeId;
  final String? storeName;
  final UserModel? customer; // Expanded user details
  final String? customerId; // Raw user ID if not expanded
  final List<OrderItemModel> items;
  final String? note;
  final List<String> staffNoteItems;
  final OrderStatus status;
  final int subTotal;
  final int shippingFee;
  final int totalPrice;
  final OrderPaymentModel payment;
  final UserAddressModel deliveryAddress;
  final OrderDeliveryInfoModel? deliveryInfo;
  final String? voucher;
  final int? discountAmount;
  final OrderCancellationModel? cancellation;
  final DateTime createdAt;
  final DateTime updatedAt;

  OrderModel({
    required this.id,
    required this.code,
    this.storeId,
    this.storeName,
    this.customer,
    this.customerId,
    required this.items,
    this.note,
    this.staffNoteItems = const [],
    required this.status,
    required this.subTotal,
    required this.shippingFee,
    required this.totalPrice,
    required this.payment,
    required this.deliveryAddress,
    this.deliveryInfo,
    this.voucher,
    this.discountAmount,
    this.cancellation,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    // Determine customer
    UserModel? customer;
    String? customerId;
    final cusJson = json['cusId'];
    if (cusJson is Map<String, dynamic>) {
      customer = UserModel.fromJson(cusJson);
    } else if (cusJson is String) {
      customerId = cusJson;
    }

    // Determine store
    String? storeId;
    String? storeName;
    final storeJson = json['storeId'];
    if (storeJson is Map<String, dynamic>) {
      storeId = storeJson['_id'] as String?;
      storeName = storeJson['storeName'] as String?;
    } else if (storeJson is String) {
      storeId = storeJson;
    }

    return OrderModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      storeId: storeId,
      storeName: storeName,
      customer: customer,
      customerId: customerId,
      items: json['items'] != null
          ? (json['items'] as List)
                .map((e) => OrderItemModel.fromJson(e as Map<String, dynamic>))
                .toList()
          : const [],
      note: json['note'] as String?,
      staffNoteItems:
          (json['staffNoteItems'] as List?)?.map((e) => e as String).toList() ??
          [],
      status: OrderStatus.fromString(json['status'] as String? ?? 'pending'),
      subTotal: json['subTotal'] as int? ?? 0,
      shippingFee: json['shippingFee'] as int? ?? 0,
      totalPrice: json['totalPrice'] as int? ?? 0,
      payment: json['payment'] != null
          ? OrderPaymentModel.fromJson(json['payment'] as Map<String, dynamic>)
          : OrderPaymentModel(method: 'cash', paidAt: null),
      deliveryAddress: json['deliveryAddress'] != null
          ? UserAddressModel.fromJson(
              json['deliveryAddress'] as Map<String, dynamic>,
            )
          : UserAddressModel(
              receiverName: '',
              phone: '',
              detail: '',
              ward: '',
              city: '',
            ),
      deliveryInfo: json['deliveryInfo'] != null
          ? OrderDeliveryInfoModel.fromJson(
              json['deliveryInfo'] as Map<String, dynamic>,
            )
          : null,
      voucher: json['voucher'] as String?,
      discountAmount: json['discountAmount'] as int?,
      cancellation: json['cancellation'] != null
          ? OrderCancellationModel.fromJson(
              json['cancellation'] as Map<String, dynamic>,
            )
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String).toLocal()
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String).toLocal()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'code': code,
      'storeId': storeId,
      'cusId': customer?.toJson() ?? customerId,
      'items': items.map((e) => e.toJson()).toList(),
      'note': note,
      'staffNoteItems': staffNoteItems,
      'status': status.toApiString(),
      'subTotal': subTotal,
      'shippingFee': shippingFee,
      'totalPrice': totalPrice,
      'payment': payment.toJson(),
      'deliveryAddress': deliveryAddress.toJson(),
      'deliveryInfo': deliveryInfo?.toJson(),
      'voucher': voucher,
      'discountAmount': discountAmount,
      'cancellation': cancellation?.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class OrderItemModel {
  final String? name;
  final ProductModel? product;
  final String? productId;
  final int quantity;
  final List<OrderItemVariationModel> variations;
  final int subTotal;

  OrderItemModel({
    this.name,
    this.product,
    this.productId,
    required this.quantity,
    this.variations = const [],
    required this.subTotal,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    ProductModel? product;
    String? productId;
    final prodJson = json['productId'];
    if (prodJson is Map<String, dynamic>) {
      product = ProductModel.fromJson(prodJson);
    } else if (prodJson is String) {
      productId = prodJson;
    }

    return OrderItemModel(
      name: json['name'] as String?,
      product: product,
      productId: productId,
      quantity: json['quantity'] as int? ?? 1,
      variations: json['variations'] != null
          ? (json['variations'] as List)
                .map(
                  (e) => OrderItemVariationModel.fromJson(
                    e as Map<String, dynamic>,
                  ),
                )
                .toList()
          : const [],
      subTotal: json['subTotal'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'productId': product?.toJson() ?? productId,
      'quantity': quantity,
      'variations': variations.map((e) => e.toJson()).toList(),
      'subTotal': subTotal,
    };
  }
}

class OrderItemVariationModel {
  final String name;
  final String choice;
  final int extraPrice;

  OrderItemVariationModel({
    required this.name,
    required this.choice,
    this.extraPrice = 0,
  });

  factory OrderItemVariationModel.fromJson(Map<String, dynamic> json) {
    return OrderItemVariationModel(
      name: json['name'] as String? ?? '',
      choice: json['choice'] as String? ?? '',
      extraPrice: json['extraPrice'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'name': name, 'choice': choice, 'extraPrice': extraPrice};
  }
}

class OrderPaymentModel {
  final String method;
  final DateTime? paidAt;

  OrderPaymentModel({required this.method, this.paidAt});

  factory OrderPaymentModel.fromJson(Map<String, dynamic> json) {
    return OrderPaymentModel(
      method: json['method'] as String? ?? 'cash',
      paidAt: json['paidAt'] != null
          ? DateTime.parse(json['paidAt'] as String).toLocal()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {'method': method, 'paidAt': paidAt?.toIso8601String()};
  }
}

class OrderDeliveryInfoModel {
  final DateTime? shippedAt;
  final DateTime? deliveredAt;
  final String? driverId;

  OrderDeliveryInfoModel({this.shippedAt, this.deliveredAt, this.driverId});

  factory OrderDeliveryInfoModel.fromJson(Map<String, dynamic> json) {
    return OrderDeliveryInfoModel(
      shippedAt: json['shippedAt'] != null
          ? DateTime.parse(json['shippedAt'] as String).toLocal()
          : null,
      deliveredAt: json['deliveredAt'] != null
          ? DateTime.parse(json['deliveredAt'] as String).toLocal()
          : null,
      driverId: json['driverId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'shippedAt': shippedAt?.toIso8601String(),
      'deliveredAt': deliveredAt?.toIso8601String(),
      'driverId': driverId,
    };
  }
}

class OrderCancellationModel {
  final String reason;
  final String cancelledBy;
  final bool? refundRequired;
  final DateTime? refundedAt;

  OrderCancellationModel({
    required this.reason,
    required this.cancelledBy,
    this.refundRequired,
    this.refundedAt,
  });

  factory OrderCancellationModel.fromJson(Map<String, dynamic> json) {
    return OrderCancellationModel(
      reason: json['reason'] as String? ?? '',
      cancelledBy: json['cancelledBy'] as String? ?? 'staff',
      refundRequired: json['refundRequired'] as bool?,
      refundedAt: json['refundedAt'] != null
          ? DateTime.parse(json['refundedAt'] as String).toLocal()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'reason': reason,
      'cancelledBy': cancelledBy,
      'refundRequired': refundRequired,
      'refundedAt': refundedAt?.toIso8601String(),
    };
  }
}
