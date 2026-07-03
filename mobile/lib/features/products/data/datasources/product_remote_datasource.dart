import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/features/products/data/models/product_model.dart';
import 'package:foa_mobile/features/products/data/models/category_model.dart';

/// Remote data source for product API calls.
class ProductRemoteDataSource {
  final Dio _dio;

  ProductRemoteDataSource() : _dio = ApiClient().dio;

  /// Get paginated products, optionally filtered by category.
  Future<ProductListResponse> getProducts({
    String? category,
    String? search,
    double? minRating,
    String? sort,
    double? minPrice,
    double? maxPrice,
    bool? isAvailable,
    int page = 1,
    int limit = 12,
  }) async {
    final queryParams = <String, dynamic>{'page': page, 'limit': limit};
    if (category != null && category.isNotEmpty) {
      queryParams['category'] = category;
    }
    if (search != null && search.isNotEmpty) {
      queryParams['search'] = search;
    }
    if (minRating != null) {
      queryParams['minRating'] = minRating;
    }
    if (sort != null && sort.isNotEmpty) {
      queryParams['sort'] = sort;
    }
    if (minPrice != null) {
      queryParams['minPrice'] = minPrice;
    }
    if (maxPrice != null) {
      queryParams['maxPrice'] = maxPrice;
    }
    if (isAvailable != null) {
      queryParams['isAvailable'] = isAvailable;
    }

    final storeId = LocalStorage.selectedStoreId;
    if (storeId != null && storeId.isNotEmpty) {
      queryParams['storeId'] = storeId;
    }

    final response = await _dio.get(
      ApiEndpoints.products,
      queryParameters: queryParams,
    );

    return _parseProductListResponse(response.data as Map<String, dynamic>);
  }

  /// Get a single product by ID.
  Future<ProductModel> getProductById(String id) async {
    final response = await _dio.get(ApiEndpoints.productById(id));
    final data = response.data as Map<String, dynamic>;
    final productData = data['data'] as Map<String, dynamic>;
    return ProductModel.fromJson(productData);
  }

  /// Get all product categories.
  Future<List<CategoryModel>> getCategories() async {
    final response = await _dio.get(ApiEndpoints.productCategories);
    final data = response.data as Map<String, dynamic>;

    // Backend returns a flat array of category strings inside { data: [...] }
    // or an array of objects with _id and name.
    final rawData = data['data'];
    if (rawData is List) {
      if (rawData.isEmpty) return [];
      // Check if it's a list of strings (category names directly).
      if (rawData.first is String) {
        return rawData.map((e) => CategoryModel(id: e, name: e)).toList();
      }
      // Otherwise it's a list of objects.
      return rawData
          .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Get products filtered by category (shorthand).
  Future<ProductListResponse> getProductsByCategory(String category) async {
    return getProducts(category: category);
  }

  /// Get safe foods based on user allergies.
  Future<Map<String, dynamic>> getSafeFoods(List<String> allergies) async {
    final queryParams = <String, dynamic>{'allergies': allergies};
    final storeId = LocalStorage.selectedStoreId;
    if (storeId != null && storeId.isNotEmpty) {
      queryParams['storeId'] = storeId;
    }

    final response = await _dio.get(
      ApiEndpoints.safeFoods,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  /// Get AI-powered product recommendations.
  Future<Map<String, dynamic>> getRecommendations() async {
    final queryParams = <String, dynamic>{};
    final storeId = LocalStorage.selectedStoreId;
    if (storeId != null && storeId.isNotEmpty) {
      queryParams['storeId'] = storeId;
    }

    final response = await _dio.get(
      ApiEndpoints.recommendations,
      queryParameters: queryParams,
    );
    return response.data as Map<String, dynamic>;
  }

  /// Get the allergen catalog.
  Future<List<dynamic>> getAllergens() async {
    final response = await _dio.get('/allergens');
    final data = response.data as Map<String, dynamic>;
    return data['data'] as List<dynamic>? ?? [];
  }

  /// Parse the common backend paginated list response.
  ProductListResponse _parseProductListResponse(Map<String, dynamic> json) {
    final List<ProductModel> products = (json['data'] as List<dynamic>? ?? [])
        .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
        .toList();

    final paginationRaw = json['pagination'] as Map<String, dynamic>?;

    return ProductListResponse(
      products: products,
      pagination: paginationRaw != null
          ? ProductPagination(
              page: paginationRaw['page'] as int? ?? 1,
              limit: paginationRaw['limit'] as int? ?? 12,
              total: paginationRaw['total'] as int? ?? products.length,
              totalPages: paginationRaw['totalPages'] as int? ?? 1,
            )
          : null,
    );
  }
}

/// Paginated product list response.
class ProductListResponse {
  final List<ProductModel> products;
  final ProductPagination? pagination;

  const ProductListResponse({required this.products, this.pagination});
}

/// Pagination metadata.
class ProductPagination {
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  const ProductPagination({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });
}
