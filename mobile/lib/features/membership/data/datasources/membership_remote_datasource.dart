import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for membership and points API calls.
class MembershipRemoteDataSource {
  final Dio _dio;

  MembershipRemoteDataSource() : _dio = ApiClient().dio;

  /// Get user membership details.
  Future<Map<String, dynamic>> getMembership() async {
    final response = await _dio.get(ApiEndpoints.userMembership);
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Get user points balance and summary from membership info.
  Future<Map<String, dynamic>> getPoints() async {
    final response = await _dio.get(ApiEndpoints.userMembership);
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Get points transaction history.
  Future<List<Map<String, dynamic>>> getPointsHistory() async {
    final response = await _dio.get(ApiEndpoints.userPointsHistory);
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }
}
