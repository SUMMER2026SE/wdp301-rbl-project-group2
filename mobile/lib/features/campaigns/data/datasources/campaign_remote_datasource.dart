import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for campaign API calls.
class CampaignRemoteDataSource {
  final Dio _dio;

  CampaignRemoteDataSource() : _dio = ApiClient().dio;

  /// Get list of active campaigns.
  Future<List<Map<String, dynamic>>> getCampaigns() async {
    final response = await _dio.get(ApiEndpoints.campaigns);
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  /// Get campaign detail with products.
  Future<Map<String, dynamic>> getCampaignById(String id) async {
    final response = await _dio.get(ApiEndpoints.campaignById(id));
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }
}
