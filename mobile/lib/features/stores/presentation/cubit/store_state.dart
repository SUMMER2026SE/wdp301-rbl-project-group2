import 'package:equatable/equatable.dart';

class StoreState extends Equatable {
  final Map<String, dynamic>? selectedStore;
  final List<Map<String, dynamic>> stores;
  final bool isLoading;
  final String? error;

  const StoreState({
    this.selectedStore,
    this.stores = const [],
    this.isLoading = false,
    this.error,
  });

  StoreState copyWith({
    Map<String, dynamic>? selectedStore,
    List<Map<String, dynamic>>? stores,
    bool? isLoading,
    String? error,
  }) {
    return StoreState(
      selectedStore: selectedStore ?? this.selectedStore,
      stores: stores ?? this.stores,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }

  @override
  List<Object?> get props => [selectedStore, stores, isLoading, error];
}
