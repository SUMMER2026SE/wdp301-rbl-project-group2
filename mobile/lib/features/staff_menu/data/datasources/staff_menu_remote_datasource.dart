import 'package:dio/dio.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/models/product_model.dart';
import 'package:foa_mobile/core/error/exceptions.dart';

abstract class StaffMenuRemoteDataSource {
  Future<List<ProductModel>> getStoreProducts({
    required String storeId,
    bool showAll = true,
  });

  Future<List<String>> getCategories();

  Future<ProductModel> updateProductAvailability({
    required String productId,
    required bool isAvailable,
    required String status,
  });
}

class StaffMenuRemoteDataSourceImpl implements StaffMenuRemoteDataSource {
  final ApiClient _apiClient;

  StaffMenuRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<ProductModel>> getStoreProducts({
    required String storeId,
    bool showAll = true,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.products,
        queryParameters: {'storeId': storeId, 'showAll': showAll, 'limit': 100},
      );

      final data = response.data;
      if (data != null && data['data'] != null) {
        final list = data['data'] as List;
        return list
            .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể tải danh sách thực đơn',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<List<String>> getCategories() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.productCategories);
      final data = response.data;
      if (data != null && data['data'] != null) {
        final list = data['data'] as List;
        return list.map((e) => e as String).toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể tải danh mục thực đơn',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<ProductModel> updateProductAvailability({
    required String productId,
    required bool isAvailable,
    required String status,
  }) async {
    try {
      final response = await _apiClient.dio.patch(
        ApiEndpoints.productAvailability(productId),
        data: {'isAvailable': isAvailable, 'status': status},
      );

      final data = response.data;
      if (data != null && data['data'] != null) {
        return ProductModel.fromJson(data['data'] as Map<String, dynamic>);
      }
      throw const ServerException(message: 'Cập nhật trạng thái thất bại');
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message:
            e.response?.data?['message'] as String? ??
            'Không thể cập nhật món ăn',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}
