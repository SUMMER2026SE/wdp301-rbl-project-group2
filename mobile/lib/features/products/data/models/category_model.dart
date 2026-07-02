import 'package:foa_mobile/features/products/domain/entities/category_entity.dart';

/// JSON-serializable category model matching backend response.
class CategoryModel {
  final String id;
  final String name;
  final String? imageUrl;

  const CategoryModel({
    required this.id,
    required this.name,
    this.imageUrl,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      imageUrl: json['imageUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'imageUrl': imageUrl,
      };

  /// Convert to domain entity.
  CategoryEntity toEntity() => CategoryEntity(
        id: id,
        name: name,
        imageUrl: imageUrl,
      );
}
