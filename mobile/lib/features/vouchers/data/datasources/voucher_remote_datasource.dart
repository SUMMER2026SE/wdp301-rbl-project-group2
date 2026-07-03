import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for voucher API calls.
class VoucherRemoteDataSource {
  final Dio _dio;

  VoucherRemoteDataSource() : _dio = ApiClient().dio;

  /// List available vouchers.
  Future<List<Map<String, dynamic>>> getVouchers() async {
    final response = await _dio.get(ApiEndpoints.vouchers);
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  /// Get user's wallet vouchers.
  Future<List<Map<String, dynamic>>> getWalletVouchers() async {
    final response = await _dio.get(
      ApiEndpoints.voucherWallet,
      queryParameters: {'ownerId': 'me'},
    );
    final data = response.data as Map<String, dynamic>;
    final list = data['data'] as List<dynamic>;
    return list.cast<Map<String, dynamic>>();
  }

  /// Get voucher by id.
  Future<Map<String, dynamic>> getVoucherById(String id) async {
    final response = await _dio.get(ApiEndpoints.voucherById(id));
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Redeem reward voucher by id.
  Future<Map<String, dynamic>> redeemVoucher(String id) async {
    final response = await _dio.post(ApiEndpoints.voucherRedeem(id));
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }

  /// Validate voucher for an order total.
  Future<Map<String, dynamic>> validateVoucher({
    required String code,
    required double orderTotal,
  }) async {
    final response = await _dio.post(
      ApiEndpoints.voucherValidate,
      data: {'code': code, 'orderAmount': orderTotal},
    );
    final data = response.data as Map<String, dynamic>;
    return data['data'] as Map<String, dynamic>;
  }
}
