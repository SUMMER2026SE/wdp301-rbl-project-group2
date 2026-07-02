class DanangLocations {
  DanangLocations._();

  static const String deliverableCity = 'Đà Nẵng';

  static const List<String> innerWards = [
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

  static const List<String> outerWards = [
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

  static const List<String> deliverableWards = [...innerWards, ...outerWards];

  static bool isDeliverableCity(String city) =>
      city.trim().toLowerCase() == deliverableCity.toLowerCase();

  static bool isDeliverableWard(String ward) {
    final normalized = ward.trim().toLowerCase();
    return deliverableWards.any((item) => item.toLowerCase() == normalized);
  }
}
