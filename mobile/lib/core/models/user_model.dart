class UserModel {
  final String id;
  final String username;
  final String email;
  final String? fullName;
  final String? phone;
  final String? avatar;
  final String role;
  final String? storeId;
  final int? collectedPoints;
  final String? tier;
  final double? cancellationRate;
  final int? totalOrders;
  final int? cancelledOrders;
  final List<UserAddressModel>? addresses;
  final UserPreferencesModel? preferences;
  final UserHealthModel? health;
  final DateTime? createdAt;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    this.fullName,
    this.phone,
    this.avatar,
    required this.role,
    this.storeId,
    this.collectedPoints,
    this.tier,
    this.cancellationRate,
    this.totalOrders,
    this.cancelledOrders,
    this.addresses,
    this.preferences,
    this.health,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      username: json['username'] as String? ?? '',
      email: json['email'] as String? ?? '',
      fullName: json['fullName'] as String?,
      phone: json['phone'] as String?,
      avatar: json['avatar'] as String?,
      role: json['role'] as String? ?? 'CUSTOMER',
      storeId: json['storeId'] as String?,
      collectedPoints: json['collectedPoints'] as int?,
      tier: json['tier'] as String?,
      cancellationRate: (json['cancellationRate'] as num?)?.toDouble(),
      totalOrders: json['totalOrders'] as int?,
      cancelledOrders: json['cancelledOrders'] as int?,
      addresses: json['addresses'] != null
          ? (json['addresses'] as List)
                .map(
                  (e) => UserAddressModel.fromJson(e as Map<String, dynamic>),
                )
                .toList()
          : null,
      preferences: json['preferences'] != null
          ? UserPreferencesModel.fromJson(
              json['preferences'] as Map<String, dynamic>,
            )
          : null,
      health: json['health'] != null
          ? UserHealthModel.fromJson(json['health'] as Map<String, dynamic>)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'username': username,
      'email': email,
      'fullName': fullName,
      'phone': phone,
      'avatar': avatar,
      'role': role,
      'storeId': storeId,
      'collectedPoints': collectedPoints,
      'tier': tier,
      'cancellationRate': cancellationRate,
      'totalOrders': totalOrders,
      'cancelledOrders': cancelledOrders,
      'addresses': addresses?.map((e) => e.toJson()).toList(),
      'preferences': preferences?.toJson(),
      'health': health?.toJson(),
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}

class UserAddressModel {
  final String? id;
  final String? label;
  final String receiverName;
  final String phone;
  final String detail;
  final String ward;
  final String? district;
  final String city;
  final bool isDefault;

  UserAddressModel({
    this.id,
    this.label,
    required this.receiverName,
    required this.phone,
    required this.detail,
    required this.ward,
    this.district,
    required this.city,
    this.isDefault = false,
  });

  factory UserAddressModel.fromJson(Map<String, dynamic> json) {
    return UserAddressModel(
      id: json['_id'] as String?,
      label: json['label'] as String?,
      receiverName: json['receiverName'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      detail: json['detail'] as String? ?? '',
      ward: json['ward'] as String? ?? '',
      district: json['district'] as String?,
      city: json['city'] as String? ?? '',
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'label': label,
      'receiverName': receiverName,
      'phone': phone,
      'detail': detail,
      'ward': ward,
      'district': district,
      'city': city,
      'isDefault': isDefault,
    };
  }
}

class UserPreferencesModel {
  final List<String> allergies;
  final List<String> dietary;
  final List<String> healthGoals;

  UserPreferencesModel({
    this.allergies = const [],
    this.dietary = const [],
    this.healthGoals = const [],
  });

  factory UserPreferencesModel.fromJson(Map<String, dynamic> json) {
    return UserPreferencesModel(
      allergies:
          (json['allergies'] as List?)?.map((e) => e as String).toList() ?? [],
      dietary:
          (json['dietary'] as List?)?.map((e) => e as String).toList() ?? [],
      healthGoals:
          (json['healthGoals'] as List?)?.map((e) => e as String).toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'allergies': allergies,
      'dietary': dietary,
      'healthGoals': healthGoals,
    };
  }
}

class UserHealthModel {
  final List<String> allergies;

  UserHealthModel({this.allergies = const []});

  factory UserHealthModel.fromJson(Map<String, dynamic> json) {
    return UserHealthModel(
      allergies:
          (json['allergies'] as List?)?.map((e) => e as String).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {'allergies': allergies};
  }
}
