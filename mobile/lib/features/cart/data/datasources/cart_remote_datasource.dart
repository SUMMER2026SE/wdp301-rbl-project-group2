import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for cart API calls.
class CartRemoteDataSource {
  final Dio _dio;

  CartRemoteDataSource() : _dio = ApiClient().dio;

  /// Get current user's cart.
  Future<Map<String, dynamic>> getCart() async {
    final response = await _dio.get(ApiEndpoints.cart);
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Add item to cart.
  Future<Map<String, dynamic>> addItem({
    required String productId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  }) async {
    final response = await _dio.post(
      ApiEndpoints.cartAdd,
      data: {
        'productId': productId,
        'quantity': quantity,
        if (variations != null) 'variations': variations,
        if (note != null) 'note': note,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Update cart item quantity or details.
  Future<Map<String, dynamic>> updateItem({
    required String itemId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  }) async {
    final response = await _dio.patch(
      ApiEndpoints.cartUpdate,
      data: {
        'itemId': itemId,
        'quantity': quantity,
        if (variations != null) 'variations': variations,
        if (note != null) 'note': note,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Remove item from cart.
  Future<void> removeItem(String itemId) async {
    await _dio.delete(
      ApiEndpoints.cartRemove,
      data: {'itemId': itemId},
    );
  }

  /// Clear all items from cart.
  Future<void> clearCart() async {
    await _dio.delete(ApiEndpoints.cartClear);
  }

  /// Merge local cart items into server cart after login.
  Future<Map<String, dynamic>> mergeCart(
    List<Map<String, dynamic>> items,
  ) async {
    final response = await _dio.post(
      ApiEndpoints.cartMerge,
      data: {'items': items},
    );
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }
}
