import 'package:foa_mobile/features/products/domain/entities/product_entity.dart';

/// JSON-serializable product model matching backend response.
class ProductModel {
  final String id;
  final String name;
  final String? description;
  final String? image;
  final double price;
  final double? originalPrice;
  final String category;
  final double? rating;
  final int? reviewCount;
  final bool isAvailable;
  final String status;
  final List<String> allergenTags;
  final List<String>? healthTags;
  final List<String> variationIds;
  final List<String>? tags;

  const ProductModel({
    required this.id,
    required this.name,
    this.description,
    this.image,
    required this.price,
    this.originalPrice,
    required this.category,
    this.rating,
    this.reviewCount,
    this.isAvailable = true,
    this.status = 'active',
    this.allergenTags = const [],
    this.healthTags,
    this.variationIds = const [],
    this.tags,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      image: json['image'] as String?,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      originalPrice: (json['originalPrice'] as num?)?.toDouble(),
      category: json['category'] as String? ?? '',
      rating: (json['rating'] as num?)?.toDouble(),
      reviewCount: json['reviewCount'] as int?,
      isAvailable: json['isAvailable'] as bool? ?? true,
      status: json['status'] as String? ?? 'active',
      allergenTags:
          (json['allergenTags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      healthTags: (json['healthTags'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      variationIds:
          (json['variationIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      tags: (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'name': name,
    'description': description,
    'image': image,
    'price': price,
    'originalPrice': originalPrice,
    'category': category,
    'rating': rating,
    'reviewCount': reviewCount,
    'isAvailable': isAvailable,
    'status': status,
    'allergenTags': allergenTags,
    'healthTags': healthTags,
    'variationIds': variationIds,
    'tags': tags,
  };

  /// Convert to domain entity.
  ProductEntity toEntity() => ProductEntity(
    id: id,
    name: name,
    description: description,
    image: image,
    price: price,
    originalPrice: originalPrice,
    category: category,
    rating: rating,
    reviewCount: reviewCount,
    isAvailable: isAvailable,
    status: status,
    allergenTags: allergenTags,
    healthTags: healthTags,
    variationIds: variationIds,
    tags: tags,
  );
}
