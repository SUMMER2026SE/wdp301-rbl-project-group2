import 'package:intl/intl.dart';

/// Common formatters for currency, date, phone.
class Formatters {
  Formatters._();

  /// Format price in Vietnamese Đồng.
  /// e.g. 150000 → "150.000₫"
  static String currency(num amount) {
    final formatter = NumberFormat('#,###', 'vi_VN');
    return '${formatter.format(amount)}₫';
  }

  /// Compact price format (shorter) for card/layout use.
  /// e.g. 150000 → "150k", 49000 → "49k"
  static String compactCurrency(num amount) {
    if (amount >= 1000000) {
      final formatted = (amount / 1000000).toStringAsFixed(
        amount % 1000000 == 0 ? 0 : 1,
      );
      return '${formatted}tr₫';
    }
    if (amount >= 1000) {
      final formatted = (amount / 1000).toStringAsFixed(
        amount % 1000 == 0 ? 0 : 0,
      );
      return '${formatted}k₫';
    }
    return currency(amount);
  }

  /// Format a DateTime to Vietnamese date string.
  /// e.g. "25/06/2026"
  static String date(DateTime dt) {
    return DateFormat('dd/MM/yyyy').format(dt);
  }

  /// Format a DateTime to Vietnamese date + time.
  /// e.g. "25/06/2026 14:30"
  static String dateTime(DateTime dt) {
    return DateFormat('dd/MM/yyyy HH:mm').format(dt);
  }

  /// Format a DateTime to time only.
  /// e.g. "14:30"
  static String time(DateTime dt) {
    return DateFormat('HH:mm').format(dt);
  }

  /// Relative time ago string.
  /// e.g. "2 phút trước", "1 giờ trước"
  static String timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Vừa xong';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    if (diff.inDays < 7) return '${diff.inDays} ngày trước';
    return date(dt);
  }

  /// Parse ISO 8601 date string from backend.
  static DateTime? parseDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return null;
    return DateTime.tryParse(dateStr)?.toLocal();
  }

  /// Format phone number for display.
  /// e.g. "0901234567" → "090 123 4567"
  static String phone(String phone) {
    if (phone.length != 10) return phone;
    return '${phone.substring(0, 3)} ${phone.substring(3, 6)} ${phone.substring(6)}';
  }
}
