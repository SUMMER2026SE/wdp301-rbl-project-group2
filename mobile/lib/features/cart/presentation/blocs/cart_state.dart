import 'package:equatable/equatable.dart';

abstract class CartState extends Equatable {
  const CartState();

  @override
  List<Object?> get props => [];
}

class CartInitial extends CartState {
  const CartInitial();
}

class CartLoading extends CartState {
  const CartLoading();
}

class CartLoaded extends CartState {
  final List<Map<String, dynamic>> items;
  final String? storeName;

  const CartLoaded({required this.items, this.storeName});

  int get totalCount {
    int count = 0;
    for (final item in items) {
      final qty = (item['quantity'] as num?)?.toInt() ?? 0;
      count += qty;
    }
    return count;
  }

  @override
  List<Object?> get props => [items, storeName];
}

class CartError extends CartState {
  final String message;

  const CartError(this.message);

  @override
  List<Object?> get props => [message];
}
