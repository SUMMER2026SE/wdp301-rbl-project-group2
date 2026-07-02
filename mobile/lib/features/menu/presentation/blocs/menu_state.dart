import 'package:equatable/equatable.dart';
import 'package:foa_mobile/features/products/domain/entities/product_entity.dart';
import 'package:foa_mobile/features/products/domain/entities/category_entity.dart';

class MenuState extends Equatable {
  final List<ProductEntity> products;
  final List<CategoryEntity> categories;
  final String? selectedCategory;
  final String searchQuery;
  final double? selectedRating;
  final String sortBy;
  final double? minPrice;
  final double? maxPrice;
  final bool filterAllergies;
  final int page;
  final bool hasMore;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;

  const MenuState({
    this.products = const [],
    this.categories = const [],
    this.selectedCategory,
    this.searchQuery = '',
    this.selectedRating,
    this.sortBy = 'salesCount',
    this.minPrice,
    this.maxPrice,
    this.filterAllergies = false,
    this.page = 1,
    this.hasMore = true,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
  });

  MenuState copyWith({
    List<ProductEntity>? products,
    List<CategoryEntity>? categories,
    String? selectedCategory,
    String? searchQuery,
    double? selectedRating,
    String? sortBy,
    double? minPrice,
    double? maxPrice,
    bool? filterAllergies,
    int? page,
    bool? hasMore,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
  }) {
    return MenuState(
      products: products ?? this.products,
      categories: categories ?? this.categories,
      selectedCategory: selectedCategory == '' ? null : (selectedCategory ?? this.selectedCategory),
      searchQuery: searchQuery ?? this.searchQuery,
      selectedRating: selectedRating == -1 ? null : (selectedRating ?? this.selectedRating),
      sortBy: sortBy ?? this.sortBy,
      minPrice: minPrice == -1 ? null : (minPrice ?? this.minPrice),
      maxPrice: maxPrice == -1 ? null : (maxPrice ?? this.maxPrice),
      filterAllergies: filterAllergies ?? this.filterAllergies,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
        products,
        categories,
        selectedCategory,
        searchQuery,
        selectedRating,
        sortBy,
        minPrice,
        maxPrice,
        filterAllergies,
        page,
        hasMore,
        isLoading,
        isLoadingMore,
        error,
      ];
}
