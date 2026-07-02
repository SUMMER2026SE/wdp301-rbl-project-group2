import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/features/products/domain/entities/product_entity.dart';
import 'package:foa_mobile/features/products/domain/entities/category_entity.dart';
import 'package:dartz/dartz.dart';

/// Abstract repository interface for products.
/// Implemented in the data layer.
abstract class ProductRepository {
  /// Get paginated products, optionally filtered by category.
  Future<Either<Failure, ProductListResult>> getProducts({
    String? category,
    String? search,
    double? minRating,
    String? sort,
    double? minPrice,
    double? maxPrice,
    bool? isAvailable,
    int page = 1,
    int limit = 12,
  });

  /// Get a single product by ID.
  Future<Either<Failure, ProductEntity>> getProductById(String id);

  /// Get all product categories.
  Future<Either<Failure, List<CategoryEntity>>> getCategories();

  /// Get safe foods based on user allergies.
  Future<Either<Failure, Map<String, dynamic>>> getSafeFoods(
      List<String> allergies);

  /// Get AI-powered product recommendations.
  Future<Either<Failure, Map<String, dynamic>>> getRecommendations();

  /// Get the allergen catalog.
  Future<Either<Failure, List<dynamic>>> getAllergens();
}

/// Result container for paginated product list.
class ProductListResult {
  final List<ProductEntity> products;
  final int currentPage;
  final int totalPages;
  final int total;

  const ProductListResult({
    required this.products,
    required this.currentPage,
    required this.totalPages,
    required this.total,
  });
}
