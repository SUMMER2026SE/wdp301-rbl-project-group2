import 'package:permission_handler/permission_handler.dart';

/// Centralized runtime permission requests.
/// Must be called BEFORE using the corresponding feature.
class PermissionUtils {
  PermissionUtils._();

  /// Request camera + photo library permissions.
  /// Call before image_picker usage (upload avatar, review photos, chat images).
  static Future<bool> requestCameraAndPhotos() async {
    final cameraStatus = await Permission.camera.request();
    final photosStatus = await Permission.photos.request();
    return cameraStatus.isGranted && photosStatus.isGranted;
  }

  /// Request fine location permission.
  /// Call before geolocator usage (staff delivery tracking).
  static Future<bool> requestLocation() async {
    // Check if location services are enabled.
    if (!await Permission.location.serviceStatus.isEnabled) {
      return false;
    }

    final status = await Permission.location.request();
    if (status.isPermanentlyDenied) {
      // User chose "Never ask again" → open device settings.
      await openAppSettings();
      return false;
    }
    return status.isGranted;
  }

  /// Generic permission check + request.
  static Future<bool> ensurePermission(Permission permission) async {
    if (await permission.isGranted) return true;
    final status = await permission.request();
    return status.isGranted;
  }

  /// Check if location permission is granted without requesting.
  static Future<bool> hasLocationPermission() async {
    return await Permission.location.isGranted;
  }

  /// Check if camera permission is granted without requesting.
  static Future<bool> hasCameraPermission() async {
    return await Permission.camera.isGranted;
  }
}
