/// Pure domain entity for authenticated user.
/// Free of any framework/JSON dependencies.
class UserEntity {
  final String id;
  final String username;
  final String? fullName;
  final String email;
  final String? phone;
  final String? avatar;
  final String role; // CUSTOMER | STAFF | ADMIN
  final bool isActive;
  final String? verifiedAt;
  final String? storeId;
  final int collectedPoints;
  final List<UserAddressEntity> addresses;
  final UserPreferencesEntity? preferences;

  const UserEntity({
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

  bool get isStaff => role == 'STAFF';
  bool get isCustomer => role == 'CUSTOMER';
  bool get isAdmin => role == 'ADMIN';
  bool get isEmailVerified => verifiedAt != null;

  /// Convert to a map compatible with [AuthAuthenticated] state.
  Map<String, dynamic> toMap() => {
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
        'addresses': addresses
            .map((a) => {
                  'label': a.label,
                  'receiverName': a.receiverName,
                  'phone': a.phone,
                  'detail': a.detail,
                  'ward': a.ward,
                  'district': a.district,
                  'city': a.city,
                  'isDefault': a.isDefault,
                })
            .toList(),
        'preferences': preferences != null
            ? {
                'dietary': preferences!.dietary,
                'allergies': preferences!.allergies,
                'healthGoals': preferences!.healthGoals,
              }
            : null,
      };
}

class UserAddressEntity {
  final String? label;
  final String receiverName;
  final String phone;
  final String detail;
  final String ward;
  final String? district;
  final String city;
  final bool isDefault;

  const UserAddressEntity({
    this.label,
    required this.receiverName,
    required this.phone,
    required this.detail,
    required this.ward,
    this.district,
    required this.city,
    this.isDefault = false,
  });
}

class UserPreferencesEntity {
  final List<String> dietary;
  final List<String> allergies;
  final List<String> healthGoals;

  const UserPreferencesEntity({
    this.dietary = const [],
    this.allergies = const [],
    this.healthGoals = const [],
  });
}
