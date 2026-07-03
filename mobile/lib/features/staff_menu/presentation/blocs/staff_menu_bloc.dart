import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:foa_mobile/core/models/product_model.dart';
import 'package:foa_mobile/features/staff_menu/domain/usecases/get_store_products.dart';
import 'package:foa_mobile/features/staff_menu/domain/usecases/get_categories.dart';
import 'package:foa_mobile/features/staff_menu/domain/usecases/update_product_availability.dart';

// ── Events ──
abstract class StaffMenuEvent extends Equatable {
  const StaffMenuEvent();

  @override
  List<Object?> get props => [];
}

class FetchStaffMenuEvent extends StaffMenuEvent {
  final String storeId;
  final bool showLoader;
  final int page;
  final int limit;
  final bool append;

  const FetchStaffMenuEvent({
    required this.storeId,
    this.showLoader = true,
    this.page = 1,
    this.limit = 50,
    this.append = false,
  });

  @override
  List<Object?> get props => [storeId, showLoader, page, limit, append];
}

class ToggleProductAvailabilityEvent extends StaffMenuEvent {
  final String productId;
  final bool isAvailable;
  final String status;

  const ToggleProductAvailabilityEvent({
    required this.productId,
    required this.isAvailable,
    required this.status,
  });

  @override
  List<Object?> get props => [productId, isAvailable, status];
}

// ── States ──
abstract class StaffMenuState extends Equatable {
  const StaffMenuState();

  @override
  List<Object?> get props => [];
}

class StaffMenuInitial extends StaffMenuState {
  const StaffMenuInitial();
}

class StaffMenuLoading extends StaffMenuState {
  const StaffMenuLoading();
}

class StaffMenuLoaded extends StaffMenuState {
  final List<ProductModel> products;
  final List<String> categories;
  final String? actioningProductId;
  final String? message;
  final int page;
  final bool hasMore;
  final bool isLoadingMore;

  const StaffMenuLoaded({
    required this.products,
    required this.categories,
    this.actioningProductId,
    this.message,
    this.page = 1,
    this.hasMore = true,
    this.isLoadingMore = false,
  });

  StaffMenuLoaded copyWith({
    List<ProductModel>? products,
    List<String>? categories,
    String? actioningProductId,
    String? message,
    int? page,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return StaffMenuLoaded(
      products: products ?? this.products,
      categories: categories ?? this.categories,
      actioningProductId: actioningProductId,
      message: message,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [
    products,
    categories,
    actioningProductId,
    message,
    page,
    hasMore,
    isLoadingMore,
  ];
}

class StaffMenuError extends StaffMenuState {
  final String message;

  const StaffMenuError(this.message);

  @override
  List<Object?> get props => [message];
}

// ── BLoC ──
class StaffMenuBloc extends Bloc<StaffMenuEvent, StaffMenuState> {
  final GetStoreProductsUseCase _getStoreProductsUseCase;
  final GetCategoriesUseCase _getCategoriesUseCase;
  final UpdateProductAvailabilityUseCase _updateProductAvailabilityUseCase;

  StaffMenuBloc({
    required GetStoreProductsUseCase getStoreProductsUseCase,
    required GetCategoriesUseCase getCategoriesUseCase,
    required UpdateProductAvailabilityUseCase updateProductAvailabilityUseCase,
  }) : _getStoreProductsUseCase = getStoreProductsUseCase,
       _getCategoriesUseCase = getCategoriesUseCase,
       _updateProductAvailabilityUseCase = updateProductAvailabilityUseCase,
       super(const StaffMenuInitial()) {
    on<FetchStaffMenuEvent>(_onFetchMenu);
    on<ToggleProductAvailabilityEvent>(_onToggleAvailability);
  }

  Future<void> _onFetchMenu(
    FetchStaffMenuEvent event,
    Emitter<StaffMenuState> emit,
  ) async {
    final currentState = state;
    if (event.append && currentState is StaffMenuLoaded) {
      if (currentState.isLoadingMore || !currentState.hasMore) return;
      emit(currentState.copyWith(isLoadingMore: true, message: null));
    } else if (event.showLoader) {
      emit(const StaffMenuLoading());
    }

    final productsResult = await _getStoreProductsUseCase(
      storeId: event.storeId,
      showAll: true,
      page: event.page,
      limit: event.limit,
    );

    if (event.append && currentState is StaffMenuLoaded) {
      productsResult.fold(
        (failure) => emit(
          currentState.copyWith(
            isLoadingMore: false,
            message: failure.message,
          ),
        ),
        (products) => emit(
          currentState.copyWith(
            products: [...currentState.products, ...products],
            page: event.page,
            hasMore: products.length >= event.limit,
            isLoadingMore: false,
          ),
        ),
      );
      return;
    }

    final categoriesResult = await _getCategoriesUseCase();

    productsResult.fold((failure) => emit(StaffMenuError(failure.message)), (
      products,
    ) {
      categoriesResult.fold(
        (failure) => emit(
          StaffMenuLoaded(
            products: products,
            categories: const ['Tất cả'],
            page: event.page,
            hasMore: products.length >= event.limit,
          ),
        ),
        (categories) => emit(
          StaffMenuLoaded(
            products: products,
            categories: ['Tất cả', ...categories],
            page: event.page,
            hasMore: products.length >= event.limit,
          ),
        ),
      );
    });
  }

  Future<void> _onToggleAvailability(
    ToggleProductAvailabilityEvent event,
    Emitter<StaffMenuState> emit,
  ) async {
    final currentState = state;
    if (currentState is! StaffMenuLoaded) return;

    emit(currentState.copyWith(actioningProductId: event.productId));

    final result = await _updateProductAvailabilityUseCase(
      productId: event.productId,
      isAvailable: event.isAvailable,
      status: event.status,
    );

    result.fold(
      (failure) => emit(currentState.copyWith(message: failure.message)),
      (updatedProduct) {
        final updatedProducts = currentState.products.map((p) {
          return p.id == updatedProduct.id ? updatedProduct : p;
        }).toList();

        final statusMsg = event.isAvailable
            ? 'Mở bán món ăn thành công!'
            : 'Tạm ngưng bán món ăn.';
        emit(
          currentState.copyWith(
            products: updatedProducts,
            message: statusMsg,
          ),
        );
      },
    );
  }
}
