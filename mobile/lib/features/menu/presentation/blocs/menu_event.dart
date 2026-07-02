import 'package:equatable/equatable.dart';

abstract class MenuEvent extends Equatable {
  const MenuEvent();

  @override
  List<Object?> get props => [];
}

class FetchMenu extends MenuEvent {
  const FetchMenu();
}

class LoadMoreMenu extends MenuEvent {
  const LoadMoreMenu();
}

class ChangeCategory extends MenuEvent {
  final String? categoryId;
  const ChangeCategory(this.categoryId);

  @override
  List<Object?> get props => [categoryId];
}

class ChangeSearch extends MenuEvent {
  final String query;
  const ChangeSearch(this.query);

  @override
  List<Object?> get props => [query];
}

class ChangeRatingFilter extends MenuEvent {
  final double? rating;
  const ChangeRatingFilter(this.rating);

  @override
  List<Object?> get props => [rating];
}

class ResetFilters extends MenuEvent {
  const ResetFilters();
}

class ApplyFilters extends MenuEvent {
  final String sortBy;
  final double? minPrice;
  final double? maxPrice;
  final bool filterAllergies;

  const ApplyFilters({
    required this.sortBy,
    this.minPrice,
    this.maxPrice,
    required this.filterAllergies,
  });

  @override
  List<Object?> get props => [sortBy, minPrice, maxPrice, filterAllergies];
}
