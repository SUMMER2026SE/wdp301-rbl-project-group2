import 'package:dio/dio.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/error/exceptions.dart';

abstract class StaffOrdersRemoteDataSource {
  Future<List<OrderModel>> getStaffOrders({
    required String storeId,
    String? status,
    int? page,
    int? limit,
  });

  Future<OrderModel> getStaffOrderById({
    required String orderId,
    required String storeId,
  });

  Future<void> confirmOrder({
    required String orderId,
    required String storeId,
  });

  Future<void> rejectOrder({
    required String orderId,
    required String storeId,
    required String reason,
  });

  Future<void> readyOrder({
    required String orderId,
    required String storeId,
  });
}

class StaffOrdersRemoteDataSourceImpl implements StaffOrdersRemoteDataSource {
  final ApiClient _apiClient;

  StaffOrdersRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<OrderModel>> getStaffOrders({
    required String storeId,
    String? status,
    int? page,
    int? limit,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.staffOrders,
        queryParameters: {
          'storeId': storeId,
          if (status != null) 'status': status,
          if (page != null) 'page': page,
          if (limit != null) 'limit': limit,
        },
      );

      final data = response.data;
      if (data != null && data['data'] != null) {
        final list = data['data'] as List;
        return list.map((e) => OrderModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể tải danh sách đơn hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<OrderModel> getStaffOrderById({
    required String orderId,
    required String storeId,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.staffOrderById(orderId),
        queryParameters: {'storeId': storeId},
      );

      final data = response.data;
      if (data != null && data['data'] != null) {
        return OrderModel.fromJson(data['data'] as Map<String, dynamic>);
      }
      throw const ServerException(message: 'Không tìm thấy thông tin đơn hàng');
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể tải chi tiết đơn hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> confirmOrder({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _apiClient.dio.patch(
        ApiEndpoints.staffConfirmOrder(orderId),
        data: {'storeId': storeId},
      );
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể xác nhận đơn hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> rejectOrder({
    required String orderId,
    required String storeId,
    required String reason,
  }) async {
    try {
      await _apiClient.dio.patch(
        ApiEndpoints.staffRejectOrder(orderId),
        data: {
          'storeId': storeId,
          'reason': reason,
        },
      );
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể từ chối đơn hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> readyOrder({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _apiClient.dio.patch(
        ApiEndpoints.staffReadyOrder(orderId),
        data: {'storeId': storeId},
      );
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể cập nhật trạng thái',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}
