import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/features/orders/data/models/order_model.dart';

/// Remote data source for customer order API calls.
class OrderRemoteDataSource {
  final Dio _dio;

  OrderRemoteDataSource() : _dio = ApiClient().dio;

  /// Get paginated orders for the current user, optionally filtered by status.
  /// Backend returns: { success, data: Order[], pagination }.
  Future<OrderListResponse> getMyOrders({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    final queryParams = <String, dynamic>{'page': page, 'limit': limit};
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }

    final response = await _dio.get(
      ApiEndpoints.myOrders,
      queryParameters: queryParams,
    );

    final body = response.data as Map<String, dynamic>;
    final ordersData = body['data'] as List<dynamic>;
    final orders = ordersData
        .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
        .toList();

    final pagination = body['pagination'] as Map<String, dynamic>?;

    return OrderListResponse(orders: orders, pagination: pagination);
  }

  /// Get a single order by ID.
  Future<OrderModel> getOrderById(String id) async {
    final response = await _dio.get(ApiEndpoints.orderById(id));
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }

  /// Cancel an order. Backend returns the updated order.
  Future<OrderModel> cancelOrder(String id, {String? reason}) async {
    final response = await _dio.patch(
      ApiEndpoints.cancelOrder(id),
      data: reason != null ? {'reason': reason} : {},
    );
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }

  /// Customer confirms receipt of the order.
  Future<OrderModel> customerConfirmReceived(String id) async {
    final response = await _dio.patch(ApiEndpoints.customerConfirm(id));
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }
}

/// Response container for paginated order list.
class OrderListResponse {
  final List<OrderModel> orders;
  final Map<String, dynamic>? pagination;

  const OrderListResponse({required this.orders, this.pagination});
}
