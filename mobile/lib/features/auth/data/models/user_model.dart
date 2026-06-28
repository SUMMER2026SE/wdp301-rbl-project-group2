import 'package:foa_mobile/features/auth/domain/entities/user_entity.dart';

/// JSON-serializable user model matching backend response.
class UserModel {
  final String id;
  final String username;
  final String? fullName;
  final String email;
  final String? phone;
  final String? avatar;
  final String role;
  final bool isActive;
  final String? verifiedAt;
  final String? storeId;
  final int collectedPoints;
  final List<AddressModel> addresses;
  final UserPreferencesModel? preferences;

  const UserModel({
    required this.id,
    required this.username,
    this.fullName,
    required this.email,
    this.phone,
    this.avatar,
    required this.role,
    this.isActive = true,
    this.verifiedAt,
    this.storeId,
    this.collectedPoints = 0,
    this.addresses = const [],
    this.preferences,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] as String? ?? '',
      username: json['username'] as String? ?? '',
      fullName: json['fullName'] as String?,
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      avatar: json['avatar'] as String?,
      role: (json['role'] as String? ?? 'CUSTOMER').toUpperCase(),
      isActive: json['isActive'] as bool? ?? true,
      verifiedAt: json['verifiedAt'] as String?,
      storeId: json['storeId'] as String?,
      collectedPoints: json['collectedPoints'] as int? ?? 0,
      addresses: (json['addresses'] as List<dynamic>?)
              ?.map((e) => AddressModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      preferences: json['preferences'] != null
          ? UserPreferencesModel.fromJson(
              json['preferences'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'username': username,
        'fullName': fullName,
        'email': email,
        'phone': phone,
        'avatar': avatar,
        'role': role,
        'isActive': isActive,
        'verifiedAt': verifiedAt,
        'storeId': storeId,
        'collectedPoints': collectedPoints,
        'addresses': addresses.map((a) => a.toJson()).toList(),
        'preferences': preferences?.toJson(),
      };

  /// Convert to domain entity.
  UserEntity toEntity() => UserEntity(
        id: id,
        username: username,
        fullName: fullName,
        email: email,
        phone: phone,
        avatar: avatar,
        role: role,
        isActive: isActive,
        verifiedAt: verifiedAt,
        storeId: storeId,
        collectedPoints: collectedPoints,
        addresses: addresses.map((a) => a.toEntity()).toList(),
        preferences: preferences?.toEntity(),
      );
}

class AddressModel {
  final String? label;
  final String receiverName;
  final String phone;
  final String detail;
  final String ward;
  final String? district;
  final String city;
  final bool isDefault;

  const AddressModel({
    this.label,
    required this.receiverName,
    required this.phone,
    required this.detail,
    required this.ward,
    this.district,
    required this.city,
    this.isDefault = false,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) => AddressModel(
        label: json['label'] as String?,
        receiverName: json['receiverName'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        detail: json['detail'] as String? ?? '',
        ward: json['ward'] as String? ?? '',
        district: json['district'] as String?,
        city: json['city'] as String? ?? '',
        isDefault: json['isDefault'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'label': label,
        'receiverName': receiverName,
        'phone': phone,
        'detail': detail,
        'ward': ward,
        'district': district,
        'city': city,
        'isDefault': isDefault,
      };

  UserAddressEntity toEntity() => UserAddressEntity(
        label: label,
        receiverName: receiverName,
        phone: phone,
        detail: detail,
        ward: ward,
        district: district,
        city: city,
        isDefault: isDefault,
      );
}

class UserPreferencesModel {
  final List<String> dietary;
  final List<String> allergies;
  final List<String> healthGoals;

  const UserPreferencesModel({
    this.dietary = const [],
    this.allergies = const [],
    this.healthGoals = const [],
  });

  factory UserPreferencesModel.fromJson(Map<String, dynamic> json) =>
      UserPreferencesModel(
        dietary: (json['dietary'] as List<dynamic>?)
                ?.map((e) => e as String)
                .toList() ??
            [],
        allergies: (json['allergies'] as List<dynamic>?)
                ?.map((e) => e as String)
                .toList() ??
            [],
        healthGoals: (json['healthGoals'] as List<dynamic>?)
                ?.map((e) => e as String)
                .toList() ??
            [],
      );

  Map<String, dynamic> toJson() => {
        'dietary': dietary,
        'allergies': allergies,
        'healthGoals': healthGoals,
      };

  UserPreferencesEntity toEntity() => UserPreferencesEntity(
        dietary: dietary,
        allergies: allergies,
        healthGoals: healthGoals,
      );
}
