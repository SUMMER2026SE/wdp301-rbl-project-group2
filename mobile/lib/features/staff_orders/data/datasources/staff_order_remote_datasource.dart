import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/features/orders/data/models/order_model.dart';

/// Remote data source for staff order management API calls.
class StaffOrderRemoteDataSource {
  final Dio _dio;

  StaffOrderRemoteDataSource() : _dio = ApiClient().dio;

  /// Get paginated staff order list, optionally filtered by status.
  /// Backend returns: { success, data: Order[], pagination }.
  Future<StaffOrderListResponse> getStaffOrders({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }

    final response = await _dio.get(
      ApiEndpoints.staffOrders,
      queryParameters: queryParams,
    );

    final body = response.data as Map<String, dynamic>;
    final ordersData = body['data'] as List<dynamic>;
    final orders = ordersData
        .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
        .toList();

    final pagination = body['pagination'] as Map<String, dynamic>?;

    return StaffOrderListResponse(orders: orders, pagination: pagination);
  }

  /// Get a single order by ID (staff view).
  Future<OrderModel> getStaffOrderById(String id) async {
    final response = await _dio.get(ApiEndpoints.staffOrderById(id));
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }

  /// Confirm a pending order.
  Future<OrderModel> confirmOrder(String id) async {
    final response = await _dio.patch(ApiEndpoints.staffConfirmOrder(id));
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }

  /// Reject a pending order.
  Future<OrderModel> rejectOrder(
    String id, {
    String? reason,
  }) async {
    final response = await _dio.patch(
      ApiEndpoints.staffRejectOrder(id),
      data: reason != null ? {'reason': reason} : {},
    );
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }

  /// Mark an order as ready for delivery.
  Future<OrderModel> readyOrder(String id) async {
    final response = await _dio.patch(ApiEndpoints.staffReadyOrder(id));
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }

  /// Mark an order as being delivered.
  Future<OrderModel> deliverOrder(String id) async {
    final response = await _dio.patch(ApiEndpoints.staffDeliverOrder(id));
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }

  /// Mark an order as completed.
  Future<OrderModel> completeOrder(String id) async {
    final response = await _dio.patch(ApiEndpoints.staffCompleteOrder(id));
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as Map<String, dynamic>;
    return OrderModel.fromJson(data);
  }
}

/// Response container for paginated staff order list.
class StaffOrderListResponse {
  final List<OrderModel> orders;
  final Map<String, dynamic>? pagination;

  const StaffOrderListResponse({
    required this.orders,
    this.pagination,
  });
}
