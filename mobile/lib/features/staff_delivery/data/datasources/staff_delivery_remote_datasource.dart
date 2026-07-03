import 'package:dio/dio.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/error/exceptions.dart';

abstract class StaffDeliveryRemoteDataSource {
  Future<List<OrderModel>> getAssignedDeliveries({
    required String storeId,
    required String driverId,
  });

  Future<void> assignDelivery({
    required String orderId,
    required String storeId,
  });

  Future<void> completeDelivery({
    required String orderId,
    required String storeId,
  });
}

class StaffDeliveryRemoteDataSourceImpl
    implements StaffDeliveryRemoteDataSource {
  final ApiClient _apiClient;

  StaffDeliveryRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<OrderModel>> getAssignedDeliveries({
    required String storeId,
    required String driverId,
  }) async {
    try {
      // First fetch all assigned-delivery statuses.
      final response = await _apiClient.dio.get(
        ApiEndpoints.staffOrders,
        queryParameters: {'storeId': storeId, 'status': 'shipping,delivering'},
      );

      final data = response.data;
      if (data != null && data['data'] != null) {
        final list = data['data'] as List;
        final orders = list
            .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
            .toList();
        // Filter locally to only those assigned to this driver
        return orders
            .where((o) => o.deliveryInfo?.driverId == driverId)
            .toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể tải danh sách chuyến giao',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> assignDelivery({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _apiClient.dio.patch(
        ApiEndpoints.staffDeliverOrder(orderId),
        data: {'storeId': storeId},
      );
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể nhận chuyến giao hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> completeDelivery({
    required String orderId,
    required String storeId,
  }) async {
    try {
      await _apiClient.dio.patch(
        ApiEndpoints.staffCompleteOrder(orderId),
        data: {'storeId': storeId},
      );
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể hoàn thành chuyến giao',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}
