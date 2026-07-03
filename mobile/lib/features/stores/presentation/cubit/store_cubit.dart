import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/features/stores/data/datasources/store_remote_datasource.dart';
import 'store_state.dart';

class StoreCubit extends Cubit<StoreState> {
  final StoreRemoteDataSource _remoteDataSource;

  StoreCubit(this._remoteDataSource) : super(const StoreState());

  /// Load selected store from LocalStorage when app launches
  void hydrateStore() {
    // Skip if already hydrated to prevent unnecessary emit.
    if (state.selectedStore != null) return;

    final savedId = LocalStorage.selectedStoreId;
    final savedName = LocalStorage.selectedStoreName;

    if (savedId != null && savedId.isNotEmpty) {
      // Create a map representation of the store from local storage properties
      final storedMap = {
        '_id': savedId,
        'name': savedName ?? 'Chi nhánh đã lưu',
      };
      emit(state.copyWith(selectedStore: storedMap));
    }
  }

  /// Fetch list of stores from API
  Future<void> fetchStores() async {
    emit(state.copyWith(isLoading: true, error: null));
    try {
      final stores = await _remoteDataSource.getStores();

      // If selectedStore is set, try to find the full data from the fetched stores
      Map<String, dynamic>? updatedSelectedStore = state.selectedStore;
      if (updatedSelectedStore != null && stores.isNotEmpty) {
        final fullStore = stores.firstWhere(
          (s) => s['_id'] == updatedSelectedStore!['_id'],
          orElse: () => <String, dynamic>{},
        );
        if (fullStore.isNotEmpty) {
          updatedSelectedStore = fullStore;
        }
      }

      emit(
        state.copyWith(
          stores: stores,
          selectedStore: updatedSelectedStore,
          isLoading: false,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          error: 'Không thể tải danh sách chi nhánh',
          isLoading: false,
        ),
      );
    }
  }

  /// Select a store, persist in LocalStorage and notify subscribers
  Future<void> selectStore(Map<String, dynamic> store) async {
    final id = store['_id'] as String? ?? '';
    final name = store['name'] as String? ?? '';
    await LocalStorage.setSelectedStore(id, name);
    emit(state.copyWith(selectedStore: store));
  }

  /// Clear selected store
  Future<void> clearSelectedStore() async {
    await LocalStorage.clearSelectedStore();
    emit(StoreState(stores: state.stores));
  }
}
