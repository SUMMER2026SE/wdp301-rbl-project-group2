import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Abstract repository interface for voucher operations.
/// Implemented in the data layer.
abstract class VoucherRepository {
  /// List available vouchers.
  Future<Either<Failure, List<Map<String, dynamic>>>> getVouchers();

  /// Get user's wallet vouchers.
  Future<Either<Failure, List<Map<String, dynamic>>>> getWalletVouchers();

  /// Get voucher by id.
  Future<Either<Failure, Map<String, dynamic>>> getVoucherById(String id);

  /// Redeem voucher by code.
  Future<Either<Failure, Map<String, dynamic>>> redeemVoucher(String code);

  /// Validate voucher for an order total.
  Future<Either<Failure, Map<String, dynamic>>> validateVoucher({
    required String code,
    required double orderTotal,
  });
}
