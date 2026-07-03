import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/utils/permission_utils.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_cubit.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_state.dart';

class StoreSelectorBottomSheet extends StatefulWidget {
  final bool isClosable;

  const StoreSelectorBottomSheet({super.key, this.isClosable = true});

  @override
  State<StoreSelectorBottomSheet> createState() =>
      _StoreSelectorBottomSheetState();
}

class _StoreSelectorBottomSheetState extends State<StoreSelectorBottomSheet> {
  bool _isLocating = false;
  Position? _currentPosition;
  String? _locationError;

  // Haversine formula to compute exact distance in kilometers
  double _calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const p = 0.017453292519943295; // Pi / 180
    final a =
        0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742 * asin(sqrt(a)); // Diameter of earth: 2 * 6371 km
  }

  Future<void> _handleLocate(List<Map<String, dynamic>> stores) async {
    setState(() {
      _isLocating = true;
      _locationError = null;
    });

    try {
      final granted = await PermissionUtils.requestLocation();
      if (!granted) {
        setState(() {
          _isLocating = false;
          _locationError =
              'Quyền vị trí bị từ chối. Vui lòng tự chọn chi nhánh.';
        });
        return;
      }

      // 1. Fast Path: Use last known position if available for instant load
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) {
        setState(() {
          _currentPosition = lastKnown;
        });
      }

      // 2. Active Request: Query position with medium/balanced accuracy (much faster than high) and a timeout
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 4),
        ),
      );

      setState(() {
        _currentPosition = position;
        _isLocating = false;
      });
    } catch (e) {
      setState(() {
        _isLocating = false;
        // Keep the last known position if active request failed
        if (_currentPosition == null) {
          _locationError = 'Không thể xác định vị trí của bạn.';
        }
      });
    }
  }

  String _formatDistance(double km) {
    if (km < 1) {
      return '${(km * 1000).round()}m';
    }
    return '${km.toStringAsFixed(1)}km';
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<StoreCubit, StoreState>(
      builder: (context, state) {
        final stores = state.stores;
        final selectedStore = state.selectedStore;

        // Calculate nearest store dynamically (pure render calculation, avoids setState rebuild loops)
        Map<String, dynamic>? nearestStore;
        double? nearestDistance;

        if (_currentPosition != null && stores.isNotEmpty) {
          double minDistance = double.infinity;
          for (final store in stores) {
            final location = store['location'];
            if (location != null && location['coordinates'] is List) {
              final coordinates = location['coordinates'] as List;
              if (coordinates.length >= 2) {
                final double storeLng = (coordinates[0] as num).toDouble();
                final double storeLat = (coordinates[1] as num).toDouble();

                final distance = _calculateDistance(
                  _currentPosition!.latitude,
                  _currentPosition!.longitude,
                  storeLat,
                  storeLng,
                );

                if (distance < minDistance) {
                  minDistance = distance;
                  nearestStore = store;
                }
              }
            }
          }
          nearestDistance = minDistance;
        }

        Widget content;
        if (state.isLoading) {
          content = const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          );
        } else if (state.error != null && stores.isEmpty) {
          content = Padding(
            padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 20),
            child: Column(
              children: [
                const Icon(
                  Icons.error_outline,
                  color: AppColors.error,
                  size: 48,
                ),
                const SizedBox(height: 12),
                Text(
                  state.error!,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.read<StoreCubit>().fetchStores(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Thử lại',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ],
            ),
          );
        } else if (stores.isEmpty) {
          content = const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(
              child: Text(
                'Không tìm thấy chi nhánh nào.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ),
          );
        } else {
          content = _buildStoresList(stores, selectedStore);
        }

        final mainCard = Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).padding.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Bottom Sheet handle indicator
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title and close button
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 4,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '📍 Chọn Chi Nhánh',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: AppColors.textPrimary,
                              letterSpacing: -0.5,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Vui lòng chọn chi nhánh FoodieDash tại Đà Nẵng',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (widget.isClosable)
                      IconButton(
                        icon: const Icon(
                          Icons.close_rounded,
                          color: AppColors.textHint,
                        ),
                        onPressed: () => Navigator.pop(context),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.grey[100],
                          padding: const EdgeInsets.all(8),
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 8),
              const Divider(height: 1),

              // Location error warning
              if (_locationError != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber[50],
                    border: Border.all(color: Colors.amber[200]!, width: 0.5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        color: Colors.amber[800],
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _locationError!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.amber[900],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Nearest store suggestion banner (Gradient banner like web)
              if (nearestStore != null && nearestDistance != null)
                _buildNearestBanner(nearestStore, nearestDistance),

              // Stores list header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'DANH SÁCH CHI NHÁNH',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textHint,
                        letterSpacing: 0.8,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _isLocating
                          ? null
                          : () => _handleLocate(stores),
                      icon: _isLocating
                          ? const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.primary,
                              ),
                            )
                          : const Icon(Icons.my_location_rounded, size: 14),
                      label: Text(
                        _currentPosition != null
                            ? 'Định vị lại'
                            : 'Tìm gần nhất',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                  ],
                ),
              ),

              // Main content
              Flexible(child: SingleChildScrollView(child: content)),

              // Footer information
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                child: Center(
                  child: Text(
                    '💡 Bạn có thể thay đổi chi nhánh bất kỳ lúc nào bằng cách bấm vào Header.',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey[500],
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ],
          ),
        );

        if (!widget.isClosable) {
          // If forced selection, intercept Android back button
          return PopScope(canPop: false, child: mainCard);
        }

        return mainCard;
      },
    );
  }

  Widget _buildNearestBanner(Map<String, dynamic> store, double distance) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.orange[600]!, Colors.amber[50]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.orange.withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Decorative circles
          Positioned(
            right: -20,
            top: -20,
            child: CircleAvatar(
              radius: 40,
              backgroundColor: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              '⭐ GẦN BẠN NHẤT (ĐỀ XUẤT)',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.location_on,
                            color: Colors.amber[50],
                            size: 12,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            _formatDistance(distance),
                            style: TextStyle(
                              color: Colors.amber[50],
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        store['name'] as String? ?? '',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        store['address'] as String? ?? '',
                        style: TextStyle(
                          color: Colors.orange[50],
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: () {
                    context.read<StoreCubit>().selectStore(store);
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.orange[800],
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Chọn',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_rounded, size: 14),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStoresList(
    List<Map<String, dynamic>> stores,
    Map<String, dynamic>? selectedStore,
  ) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: stores.length,
      separatorBuilder: (context, index) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final store = stores[index];
        final isSelected =
            selectedStore != null && selectedStore['_id'] == store['_id'];
        final isActive = store['isActive'] as bool? ?? false;
        final district = store['district'] as String? ?? '';

        // Calculate distance if position is available
        double? distance;
        if (_currentPosition != null &&
            store['location']?['coordinates'] is List) {
          final coordinates = store['location']['coordinates'] as List;
          if (coordinates.length >= 2) {
            distance = _calculateDistance(
              _currentPosition!.latitude,
              _currentPosition!.longitude,
              (coordinates[1] as num).toDouble(),
              (coordinates[0] as num).toDouble(),
            );
          }
        }

        return InkWell(
          onTap: () {
            context.read<StoreCubit>().selectStore(store);
            Navigator.pop(context);
          },
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isSelected ? AppColors.primary : Colors.grey[200]!,
                width: isSelected ? 2 : 1,
              ),
              color: isSelected
                  ? AppColors.primary.withValues(alpha: 0.03)
                  : Colors.grey[50]?.withValues(alpha: 0.5),
            ),
            child: Row(
              children: [
                // Store logo icon container
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : Colors.orange[50],
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    Icons.storefront_outlined,
                    color: isSelected ? Colors.white : AppColors.primary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),

                // Info details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (district.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              margin: const EdgeInsets.only(right: 6),
                              decoration: BoxDecoration(
                                color: Colors.orange[50],
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Quận $district',
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          if (distance != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.green[50],
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.navigation_rounded,
                                    color: Colors.green[700],
                                    size: 8,
                                  ),
                                  const SizedBox(width: 2),
                                  Text(
                                    _formatDistance(distance),
                                    style: TextStyle(
                                      color: Colors.green[700],
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          const Spacer(),
                          // Active status
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: isActive ? Colors.green : Colors.red,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isActive ? 'Mở cửa' : 'Đóng cửa',
                            style: TextStyle(
                              color: isActive
                                  ? Colors.green[700]
                                  : Colors.red[700],
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        store['name'] as String? ?? '',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        store['address'] as String? ?? '',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // Selected Checkmark
                if (isSelected) ...[
                  const SizedBox(width: 10),
                  const CircleAvatar(
                    radius: 10,
                    backgroundColor: AppColors.primary,
                    child: Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
