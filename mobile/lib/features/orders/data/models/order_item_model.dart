import 'package:foa_mobile/features/orders/domain/entities/order_entity.dart';

/// JSON-serializable order item model matching backend order item fields.
class OrderItemModel {
  final String productId;
  final String name;
  final int quantity;
  final double subTotal;
  final List<OrderItemVariationModel> variations;

  const OrderItemModel({
    required this.productId,
    required this.name,
    required this.quantity,
    this.subTotal = 0.0,
    this.variations = const [],
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      productId: json['productId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 0,
      subTotal: (json['subTotal'] as num?)?.toDouble() ?? 0.0,
      variations:
          (json['variations'] as List<dynamic>?)
              ?.map(
                (e) =>
                    OrderItemVariationModel.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'name': name,
    'quantity': quantity,
    'subTotal': subTotal,
    'variations': variations.map((v) => v.toJson()).toList(),
  };

  OrderItemEntity toEntity() => OrderItemEntity(
    productId: productId,
    name: name,
    quantity: quantity,
    subTotal: subTotal,
    variations: variations.map((v) => v.toEntity()).toList(),
  );
}

class OrderItemVariationModel {
  final String name;
  final String choice;
  final double? extraPrice;

  const OrderItemVariationModel({
    required this.name,
    required this.choice,
    this.extraPrice,
  });

  factory OrderItemVariationModel.fromJson(Map<String, dynamic> json) {
    return OrderItemVariationModel(
      name: json['name'] as String? ?? '',
      choice: json['choice'] as String? ?? '',
      extraPrice: (json['extraPrice'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'choice': choice,
    'extraPrice': extraPrice,
  };

  OrderItemVariationEntity toEntity() => OrderItemVariationEntity(
    name: name,
    choice: choice,
    extraPrice: extraPrice,
  );
}
