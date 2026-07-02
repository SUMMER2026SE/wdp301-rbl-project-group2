import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for store API calls.
class StoreRemoteDataSource {
  final Dio _dio;

  StoreRemoteDataSource() : _dio = ApiClient().dio;

  /// Get list of all stores.
  Future<List<Map<String, dynamic>>> getStores() async {
    final response = await _dio.get(ApiEndpoints.stores);
    final body = response.data as Map<String, dynamic>;
    final data = body['data'] as List<dynamic>? ?? [];
    return data.cast<Map<String, dynamic>>();
  }
}
