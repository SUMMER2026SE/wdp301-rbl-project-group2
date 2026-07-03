import 'dart:math';

/// FSS-34: Shipping fee utility (Dart port from frontend/src/utils/shipping.ts)
/// Delivery is available within supported wards of Đà Nẵng.
/// Matching is case-insensitive and trim-safe.

const String deliverableCity = 'Đà Nẵng';

const List<String> innerWards = [
  'Hải Châu I',
  'Hải Châu II',
  'Thạch Thang',
  'Thanh Bình',
  'Thuận Phước',
  'Hòa Thuận Đông',
  'Hòa Thuận Tây',
  'Nam Dương',
  'Phước Ninh',
  'Bình Hiên',
  'Bình Thuận',
  'Hòa Cường Bắc',
  'Hòa Cường Nam',
  'Hải Châu',
  'Hòa Cường',
  'Vĩnh Trung',
  'Tân Chính',
  'Thạc Gián',
  'Chính Gián',
  'Tam Thuận',
  'Xuân Hà',
  'An Khê',
  'Hòa Khê',
  'Thanh Khê Đông',
  'Thanh Khê Tây',
  'Thanh Khê',
  'An Hải Bắc',
  'An Hải Tây',
  'An Hải Đông',
  'Phước Mỹ',
  'Nại Hiên Đông',
  'Mân Thái',
  'Thọ Quang',
  'Sơn Trà',
  'An Hải',
  'Mỹ An',
  'Khuê Mỹ',
  'Hòa Hải',
  'Hòa Quý',
  'Ngũ Hành Sơn',
  'Khuê Trung',
  'Hòa Thọ Đông',
  'Hòa An',
  'Hòa Phát',
  'Cẩm Lệ',
];

const List<String> outerWards = [
  'Hòa Thọ Tây',
  'Hòa Xuân',
  'Hòa Minh',
  'Hòa Khánh Nam',
  'Hòa Khánh Bắc',
  'Hòa Hiệp Nam',
  'Hòa Hiệp Bắc',
  'Liên Chiểu',
  'Hòa Khánh',
  'Hải Vân',
];

const List<String> deliverableWards = [...innerWards, ...outerWards];

const Map<String, List<double>> wardCentroids = {
  // Hải Châu
  'Hải Châu I': [108.2210, 16.0660],
  'Hải Châu II': [108.2170, 16.0620],
  'Thạch Thang': [108.2160, 16.0730],
  'Thanh Bình': [108.2110, 16.0750],
  'Thuận Phước': [108.2150, 16.0850],
  'Hòa Thuận Đông': [108.2190, 16.0480],
  'Hòa Thuận Tây': [108.2030, 16.0460],
  'Nam Dương': [108.2170, 16.0590],
  'Phước Ninh': [108.2200, 16.0580],
  'Bình Hiên': [108.2190, 16.0550],
  'Bình Thuận': [108.2180, 16.0510],
  'Hòa Cường Bắc': [108.2180, 16.0370],
  'Hòa Cường Nam': [108.2190, 16.0260],
  'Hải Châu': [108.2200, 16.0600],
  'Hòa Cường': [108.2200, 16.0300],
  // Thanh Khê
  'Vĩnh Trung': [108.2110, 16.0600],
  'Tân Chính': [108.2100, 16.0660],
  'Thạc Gián': [108.2080, 16.0580],
  'Chính Gián': [108.2000, 16.0610],
  'Tam Thuận': [108.2040, 16.0710],
  'Xuân Hà': [108.1960, 16.0670],
  'An Khê': [108.1720, 16.0540],
  'Hòa Khê': [108.1810, 16.0560],
  'Thanh Khê Đông': [108.1830, 16.0680],
  'Thanh Khê Tây': [108.1700, 16.0660],
  'Thanh Khê': [108.1800, 16.0600],
  // Sơn Trà
  'An Hải Bắc': [108.2370, 16.0690],
  'An Hải Tây': [108.2290, 16.0610],
  'An Hải Đông': [108.2360, 16.0580],
  'Phước Mỹ': [108.2430, 16.0590],
  'Nại Hiên Đông': [108.2340, 16.0880],
  'Mân Thái': [108.2440, 16.0760],
  'Thọ Quang': [108.2580, 16.1040],
  'Sơn Trà': [108.2400, 16.0700],
  'An Hải': [108.2300, 16.0600],
  // Ngũ Hành Sơn
  'Mỹ An': [108.2450, 16.0450],
  'Khuê Mỹ': [108.2480, 16.0230],
  'Hòa Hải': [108.2600, 15.9850],
  'Hòa Quý': [108.2320, 15.9800],
  'Ngũ Hành Sơn': [108.2500, 16.0100],
  // Cẩm Lệ
  'Khuê Trung': [108.2110, 16.0220],
  'Hòa Thọ Đông': [108.1990, 16.0140],
  'Hòa Thọ Tây': [108.1670, 16.0090],
  'Hòa An': [108.1760, 16.0330],
  'Hòa Phát': [108.1820, 16.0230],
  'Hòa Xuân': [108.2180, 15.9920],
  'Cẩm Lệ': [108.2100, 16.0100],
  // Liên Chiểu
  'Hòa Minh': [108.1740, 16.0710],
  'Hòa Khánh Nam': [108.1480, 16.0600],
  'Hòa Khánh Bắc': [108.1500, 16.0810],
  'Hòa Hiệp Nam': [108.1390, 16.0960],
  'Hòa Hiệp Bắc': [108.1180, 16.1430],
  'Liên Chiểu': [108.1600, 16.0800],
  'Hòa Khánh': [108.1500, 16.0800],
  'Hải Vân': [108.1300, 16.1800],
};

class ShippingConfig {
  final double baseDeliveryFee;
  final double feePerKm;
  final bool freeDeliveryEnabled;
  final double freeDeliveryThreshold;

  const ShippingConfig({
    this.baseDeliveryFee = 15000,
    this.feePerKm = 5000,
    this.freeDeliveryEnabled = true,
    this.freeDeliveryThreshold = 300000,
  });
}

class ShippingResult {
  final double fee;
  final bool blocked;
  final String? reason;
  final String? zone;
  final double? distance;

  const ShippingResult({
    required this.fee,
    required this.blocked,
    this.reason,
    this.zone,
    this.distance,
  });
}

double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
  const r = 6371.0;
  final dLat = (lat2 - lat1) * pi / 180;
  final dLon = (lon2 - lon1) * pi / 180;
  final a =
      sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1 * pi / 180) *
          cos(lat2 * pi / 180) *
          sin(dLon / 2) *
          sin(dLon / 2);
  final c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return r * c;
}

List<double>? getWardCentroid(String wardName) {
  final normalized = wardName.trim().toLowerCase();
  for (final entry in wardCentroids.entries) {
    if (entry.key.toLowerCase() == normalized) {
      return entry.value;
    }
  }
  return null;
}

ShippingResult calculateShippingFee({
  required String ward,
  required String city,
  required double subtotal,
  List<double>? storeCoordinates,
  ShippingConfig config = const ShippingConfig(),
}) {
  final normalCity = city.trim();
  final normalWard = ward.trim();

  if (normalCity.toLowerCase() != deliverableCity.toLowerCase()) {
    return const ShippingResult(
      fee: 0,
      blocked: true,
      reason: 'Hiện tại chỉ giao hàng trong khu vực Đà Nẵng',
    );
  }

  final isInner = innerWards.any(
    (w) => w.toLowerCase() == normalWard.toLowerCase(),
  );
  final isOuter = outerWards.any(
    (w) => w.toLowerCase() == normalWard.toLowerCase(),
  );

  if (!isInner && !isOuter) {
    return ShippingResult(
      fee: 0,
      blocked: true,
      reason: 'Phường/Xã "$normalWard" nằm ngoài vùng giao hàng',
    );
  }

  double distance = isInner ? 2.0 : 5.0;
  if (storeCoordinates != null && storeCoordinates.length == 2) {
    final wardCentroid = getWardCentroid(normalWard);
    if (wardCentroid != null) {
      final storeLng = storeCoordinates[0];
      final storeLat = storeCoordinates[1];
      final wardLng = wardCentroid[0];
      final wardLat = wardCentroid[1];
      final rawDistance = calculateDistance(
        storeLat,
        storeLng,
        wardLat,
        wardLng,
      );
      distance = (rawDistance * 10).roundToDouble() / 10;
    }
  }

  if (config.freeDeliveryEnabled && subtotal >= config.freeDeliveryThreshold) {
    return ShippingResult(
      fee: 0,
      blocked: false,
      zone: 'free',
      distance: distance,
    );
  }

  final fee = ((config.baseDeliveryFee + config.feePerKm * distance) / 2)
      .round();
  return ShippingResult(
    fee: fee.toDouble(),
    blocked: false,
    zone: isInner ? 'inner' : 'outer',
    distance: distance,
  );
}
