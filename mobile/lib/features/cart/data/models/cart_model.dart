/// JSON-serializable cart item model matching backend response.
class CartItemModel {
  final String? itemId;
  final String productId;
  final String? productName;
  final String? productImage;
  final double price;
  final int quantity;
  final String? note;
  final List<CartItemVariationModel> variations;

  const CartItemModel({
    this.itemId,
    required this.productId,
    this.productName,
    this.productImage,
    required this.price,
    this.quantity = 1,
    this.note,
    this.variations = const [],
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    return CartItemModel(
      itemId: json['itemId'] as String?,
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String?,
      productImage: json['productImage'] as String?,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] as int? ?? 1,
      note: json['note'] as String?,
      variations:
          (json['variations'] as List<dynamic>?)
              ?.map(
                (e) =>
                    CartItemVariationModel.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'itemId': itemId,
    'productId': productId,
    'productName': productName,
    'productImage': productImage,
    'price': price,
    'quantity': quantity,
    'note': note,
    'variations': variations.map((v) => v.toJson()).toList(),
  };
}

/// JSON-serializable cart item variation model.
class CartItemVariationModel {
  final String name;
  final String choice;
  final double extraPrice;

  const CartItemVariationModel({
    required this.name,
    required this.choice,
    this.extraPrice = 0.0,
  });

  factory CartItemVariationModel.fromJson(Map<String, dynamic> json) {
    return CartItemVariationModel(
      name: json['name'] as String? ?? '',
      choice: json['choice'] as String? ?? '',
      extraPrice: (json['extraPrice'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'choice': choice,
    'extraPrice': extraPrice,
  };
}
