/// Pure domain entity for a product category.
class CategoryEntity {
  final String id;
  final String name;
  final String? imageUrl;

  const CategoryEntity({
    required this.id,
    required this.name,
    this.imageUrl,
  });
}
