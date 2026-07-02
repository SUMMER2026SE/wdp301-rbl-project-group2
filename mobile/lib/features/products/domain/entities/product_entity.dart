/// Pure domain entity for a product.
/// Free of any framework/JSON dependencies.
class ProductEntity {
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

  const ProductEntity({
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
}
