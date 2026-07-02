import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/features/products/domain/entities/product_entity.dart';
import 'package:foa_mobile/features/menu/domain/usecases/get_menu_products.dart';
import 'package:foa_mobile/features/menu/domain/usecases/get_menu_categories.dart';
import 'package:foa_mobile/features/menu/presentation/blocs/menu_event.dart';
import 'package:foa_mobile/features/menu/presentation/blocs/menu_state.dart';

class MenuBloc extends Bloc<MenuEvent, MenuState> {
  final GetMenuProductsUseCase getMenuProductsUseCase;
  final GetMenuCategoriesUseCase getMenuCategoriesUseCase;

  MenuBloc({
    required this.getMenuProductsUseCase,
    required this.getMenuCategoriesUseCase,
  }) : super(const MenuState()) {
    on<FetchMenu>(_onFetchMenu);
    on<LoadMoreMenu>(_onLoadMoreMenu);
    on<ChangeCategory>(_onChangeCategory);
    on<ChangeSearch>(_onChangeSearch);
    on<ChangeRatingFilter>(_onChangeRatingFilter);
    on<ResetFilters>(_onResetFilters);
    on<ApplyFilters>(_onApplyFilters);
  }

  Future<void> _onFetchMenu(FetchMenu event, Emitter<MenuState> emit) async {
    final isInitialLoad = state.products.isEmpty;
    emit(state.copyWith(
      isLoading: isInitialLoad, // Only show shimmer on initial load
      error: null,
      page: 1,
      hasMore: true,
      // Keep existing products visible while filtering
      products: isInitialLoad ? [] : state.products,
    ));

    try {
      // 1. Fetch categories if not already loaded
      var categories = state.categories;
      if (categories.isEmpty) {
        final categoriesResult = await getMenuCategoriesUseCase();
        categoriesResult.fold(
          (failure) => null, // Ignore failures for categories, fallback to empty list
          (list) => categories = list,
        );
      }

      // 2. Fetch products with all filters
      final productsResult = await getMenuProductsUseCase(
        category: state.selectedCategory,
        search: state.searchQuery,
        minRating: state.selectedRating,
        sort: state.sortBy,
        minPrice: state.minPrice,
        maxPrice: state.maxPrice,
        page: 1,
      );

      productsResult.fold(
        (failure) {
          emit(state.copyWith(
            isLoading: false,
            categories: categories,
            error: failure.message,
          ));
        },
        (result) {
          // Filter active products
          final activeProducts = result.products
              .where((p) => p.status == 'active')
              .toList();

          // Filter out allergy products if requested
          final userAllergies = LocalStorage.selectedAllergies;
          var filteredProducts = activeProducts;
          if (state.filterAllergies && userAllergies.isNotEmpty) {
            filteredProducts = activeProducts.where((p) {
              return !p.allergenTags.any((a) => userAllergies.contains(a));
            }).toList();
          }

          final uniqueProducts = <String, ProductEntity>{};
          for (final p in filteredProducts) {
            uniqueProducts[p.id] = p;
          }

          emit(state.copyWith(
            isLoading: false,
            categories: categories,
            products: uniqueProducts.values.toList(),
            page: 1,
            hasMore: 1 < result.totalPages,
          ));
        },
      );
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        error: 'Đã xảy ra lỗi không mong muốn.',
      ));
    }
  }

  Future<void> _onLoadMoreMenu(LoadMoreMenu event, Emitter<MenuState> emit) async {
    if (state.isLoadingMore || !state.hasMore) return;

    emit(state.copyWith(isLoadingMore: true));
    final nextPage = state.page + 1;

    try {
      final result = await getMenuProductsUseCase(
        category: state.selectedCategory,
        search: state.searchQuery,
        minRating: state.selectedRating,
        sort: state.sortBy,
        minPrice: state.minPrice,
        maxPrice: state.maxPrice,
        page: nextPage,
      );

      result.fold(
        (failure) {
          emit(state.copyWith(isLoadingMore: false));
        },
        (result) {
          // Filter active products
          final activeProducts = result.products
              .where((p) => p.status == 'active')
              .toList();

          // Filter out allergy products if requested
          final userAllergies = LocalStorage.selectedAllergies;
          var filteredProducts = activeProducts;
          if (state.filterAllergies && userAllergies.isNotEmpty) {
            filteredProducts = activeProducts.where((p) {
              return !p.allergenTags.any((a) => userAllergies.contains(a));
            }).toList();
          }

          final uniqueProducts = <String, ProductEntity>{};
          for (final p in state.products) {
            uniqueProducts[p.id] = p;
          }
          for (final p in filteredProducts) {
            uniqueProducts[p.id] = p;
          }

          emit(state.copyWith(
            isLoadingMore: false,
            products: uniqueProducts.values.toList(),
            page: nextPage,
            hasMore: nextPage < result.totalPages,
          ));
        },
      );
    } catch (e) {
      emit(state.copyWith(isLoadingMore: false));
    }
  }

  void _onChangeCategory(ChangeCategory event, Emitter<MenuState> emit) {
    final newCategory = state.selectedCategory == event.categoryId ? '' : (event.categoryId ?? '');
    emit(state.copyWith(
      selectedCategory: newCategory,
    ));
    add(const FetchMenu());
  }

  void _onChangeSearch(ChangeSearch event, Emitter<MenuState> emit) {
    emit(state.copyWith(
      searchQuery: event.query,
    ));
    add(const FetchMenu());
  }

  void _onChangeRatingFilter(ChangeRatingFilter event, Emitter<MenuState> emit) {
    final newRating = state.selectedRating == event.rating ? -1.0 : (event.rating ?? -1.0);
    emit(state.copyWith(
      selectedRating: newRating,
    ));
    add(const FetchMenu());
  }

  void _onResetFilters(ResetFilters event, Emitter<MenuState> emit) {
    emit(state.copyWith(
      selectedCategory: '',
      searchQuery: '',
      selectedRating: -1.0,
      sortBy: 'salesCount',
      minPrice: -1.0,
      maxPrice: -1.0,
      filterAllergies: false,
    ));
    add(const FetchMenu());
  }

  void _onApplyFilters(ApplyFilters event, Emitter<MenuState> emit) {
    emit(state.copyWith(
      sortBy: event.sortBy,
      minPrice: event.minPrice ?? -1.0,
      maxPrice: event.maxPrice ?? -1.0,
      filterAllergies: event.filterAllergies,
    ));
    add(const FetchMenu());
  }
}
