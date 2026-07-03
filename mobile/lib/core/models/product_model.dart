class ProductModel {
  final String id;
  final String? storeId;
  final String name;
  final String description;
  final String imageUrl;
  final int price;
  final String category;
  final String? restaurant;
  final String? time;
  final double rating;
  final int reviewCount;
  final List<String> tags;
  final String? healthWarning;
  final List<String> healthTags;
  final int? campaignPrice;
  final bool isAvailable;
  final String status;
  final List<VariantGroupModel>? variants;

  ProductModel({
    required this.id,
    this.storeId,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.price,
    required this.category,
    this.restaurant,
    this.time,
    this.rating = 0.0,
    this.reviewCount = 0,
    this.tags = const [],
    this.healthWarning,
    this.healthTags = const [],
    this.campaignPrice,
    this.isAvailable = true,
    this.status = 'active',
    this.variants,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    String imageStr = '';
    final imageJson = json['image'];
    if (imageJson is String) {
      imageStr = imageJson;
    } else if (imageJson is Map<String, dynamic>) {
      imageStr = imageJson['secureUrl'] as String? ?? '';
    }

    return ProductModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      storeId: json['storeId'] as String?,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      imageUrl: imageStr,
      price: json['price'] as int? ?? 0,
      category: json['category'] as String? ?? '',
      restaurant: json['restaurant'] as String?,
      time: json['time'] as String?,
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      reviewCount: json['reviewCount'] as int? ?? 0,
      tags: (json['tags'] as List?)?.map((e) => e as String).toList() ?? [],
      healthWarning: json['healthWarning'] as String?,
      healthTags:
          (json['healthTags'] as List?)?.map((e) => e as String).toList() ?? [],
      campaignPrice: json['campaignPrice'] as int?,
      isAvailable: json['isAvailable'] as bool? ?? true,
      status: json['status'] as String? ?? 'active',
      variants: json['variants'] != null
          ? (json['variants'] as List)
                .map(
                  (e) => VariantGroupModel.fromJson(e as Map<String, dynamic>),
                )
                .toList()
          : (json['variationIds'] != null
                ? (json['variationIds'] as List)
                      .map(
                        (e) => VariantGroupModel.fromJson(
                          e as Map<String, dynamic>,
                        ),
                      )
                      .toList()
                : null),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'storeId': storeId,
      'name': name,
      'description': description,
      'image': {'secureUrl': imageUrl},
      'price': price,
      'category': category,
      'restaurant': restaurant,
      'time': time,
      'rating': rating,
      'reviewCount': reviewCount,
      'tags': tags,
      'healthWarning': healthWarning,
      'healthTags': healthTags,
      'campaignPrice': campaignPrice,
      'isAvailable': isAvailable,
      'status': status,
      'variants': variants?.map((e) => e.toJson()).toList(),
    };
  }
}

class VariantGroupModel {
  final String name;
  final bool? required;
  final bool? multiple;
  final int? maxChoices;
  final List<VariantOptionModel> options;

  VariantGroupModel({
    required this.name,
    this.required,
    this.multiple,
    this.maxChoices,
    required this.options,
  });

  factory VariantGroupModel.fromJson(Map<String, dynamic> json) {
    return VariantGroupModel(
      name: json['name'] as String? ?? '',
      required: json['required'] as bool?,
      multiple: json['multiple'] as bool?,
      maxChoices: json['maxChoices'] as int?,
      options: json['options'] != null
          ? (json['options'] as List)
                .map(
                  (e) => VariantOptionModel.fromJson(e as Map<String, dynamic>),
                )
                .toList()
          : const [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'required': required,
      'multiple': multiple,
      'maxChoices': maxChoices,
      'options': options.map((e) => e.toJson()).toList(),
    };
  }
}

class VariantOptionModel {
  final String choice;
  final int extraPrice;

  VariantOptionModel({required this.choice, required this.extraPrice});

  factory VariantOptionModel.fromJson(Map<String, dynamic> json) {
    return VariantOptionModel(
      choice: json['choice'] as String? ?? '',
      extraPrice: json['extraPrice'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {'choice': choice, 'extraPrice': extraPrice};
  }
}
