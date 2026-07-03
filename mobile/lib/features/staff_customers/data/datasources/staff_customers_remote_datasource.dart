import 'package:dio/dio.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/error/exceptions.dart';

abstract class StaffCustomersRemoteDataSource {
  Future<List<UserModel>> getCustomers({int? page, int? limit, String? search});

  Future<UserModel> getCustomerById({required String customerId});

  Future<List<OrderModel>> getCustomerOrders({required String customerId});
}

class StaffCustomersRemoteDataSourceImpl
    implements StaffCustomersRemoteDataSource {
  final ApiClient _apiClient;

  StaffCustomersRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<UserModel>> getCustomers({
    int? page,
    int? limit,
    String? search,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        '/admin/customers',
        queryParameters: {'page': ?page, 'limit': ?limit, 'search': ?search},
      );

      final data = response.data;
      if (data != null &&
          data['data'] != null &&
          data['data']['users'] != null) {
        final list = data['data']['users'] as List;
        return list
            .map((e) => UserModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể tải danh sách khách hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<UserModel> getCustomerById({required String customerId}) async {
    try {
      final response = await _apiClient.dio.get('/admin/customers/$customerId');
      final data = response.data;
      if (data != null && data['data'] != null) {
        return UserModel.fromJson(data['data'] as Map<String, dynamic>);
      }
      throw const ServerException(message: 'Không tìm thấy hồ sơ khách hàng');
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể tải chi tiết khách hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<List<OrderModel>> getCustomerOrders({
    required String customerId,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.orders,
        queryParameters: {'cusId': customerId, 'limit': 100},
      );

      final data = response.data;
      if (data != null && data['data'] != null) {
        final list = data['data'] as List;
        return list
            .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể tải lịch sử mua hàng',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}
