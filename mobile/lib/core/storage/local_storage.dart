import 'package:shared_preferences/shared_preferences.dart';

/// Local storage for non-sensitive data using SharedPreferences.
class LocalStorage {
  static SharedPreferences? _prefs;

  /// Initialize SharedPreferences instance.
  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static SharedPreferences get _instance {
    if (_prefs == null) {
      throw StateError('LocalStorage not initialized. Call init() first.');
    }
    return _prefs!;
  }

  // ── Onboarding ──
  static const _onboardingCompleteKey = 'onboarding_complete';

  static bool get isOnboardingComplete =>
      _instance.getBool(_onboardingCompleteKey) ?? false;

  static Future<void> setOnboardingComplete() =>
      _instance.setBool(_onboardingCompleteKey, true);

  // ── Selected Store ──
  static const _selectedStoreIdKey = 'selected_store_id';
  static const _selectedStoreNameKey = 'selected_store_name';

  static String? get selectedStoreId =>
      _instance.getString(_selectedStoreIdKey);

  static String? get selectedStoreName =>
      _instance.getString(_selectedStoreNameKey);

  static Future<void> setSelectedStore(String id, String name) async {
    await _instance.setString(_selectedStoreIdKey, id);
    await _instance.setString(_selectedStoreNameKey, name);
  }

  static Future<void> clearSelectedStore() async {
    await _instance.remove(_selectedStoreIdKey);
    await _instance.remove(_selectedStoreNameKey);
  }

  // ── Allergies ──
  static const _allergiesKey = 'user_allergies';

  static List<String> get selectedAllergies =>
      _instance.getStringList(_allergiesKey) ?? [];

  static Future<void> setSelectedAllergies(List<String> allergies) =>
      _instance.setStringList(_allergiesKey, allergies);

  // ── Generic ──
  static Future<void> clearAll() => _instance.clear();
}
