import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/features/cart/domain/repositories/cart_repository.dart';
import 'cart_state.dart';

class CartCubit extends Cubit<CartState> {
  final CartRepository _cartRepository;

  CartCubit(this._cartRepository) : super(const CartInitial());

  /// Load cart from server.
  Future<void> loadCart() async {
    emit(const CartLoading());
    final result = await _cartRepository.getCart();
    result.fold(
      (failure) => emit(const CartError('Không thể tải giỏ hàng')),
      (cartData) {
        final itemsRaw = (cartData['items'] as List<dynamic>? ?? []);
        final items = itemsRaw.map((e) => e as Map<String, dynamic>).toList();
        final storeName = cartData['storeName'] as String?;
        emit(CartLoaded(items: items, storeName: storeName));
      },
    );
  }

  /// Manually update cart items in state (used for optimistic updates or syncing).
  void updateCartItems(List<Map<String, dynamic>> items, [String? storeName]) {
    emit(CartLoaded(items: items, storeName: storeName));
  }

  /// Add item to cart.
  Future<void> addToCart({
    required String productId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  }) async {
    // We can show loading or perform addition and reload.
    // To keep it simple and reactive: perform the call, and on success, reload cart.
    final result = await _cartRepository.addItem(
      productId: productId,
      quantity: quantity,
      variations: variations,
      note: note,
    );
    await result.fold(
      (failure) async {
        // Keep previous state or emit error temporarily
        emit(const CartError('Không thể thêm sản phẩm vào giỏ hàng'));
        await loadCart();
      },
      (_) async {
        await loadCart();
      },
    );
  }

  /// Update item quantity.
  Future<void> updateItemQty({
    required String itemId,
    required int quantity,
    List<Map<String, dynamic>>? variations,
    String? note,
  }) async {
    final result = await _cartRepository.updateItem(
      itemId: itemId,
      quantity: quantity,
      variations: variations,
      note: note,
    );
    await result.fold(
      (failure) async {
        emit(const CartError('Không thể cập nhật số lượng'));
        await loadCart();
      },
      (_) async {
        await loadCart();
      },
    );
  }

  /// Remove item from cart.
  Future<void> removeItem(String itemId) async {
    final result = await _cartRepository.removeItem(itemId);
    await result.fold(
      (failure) async {
        emit(const CartError('Không thể xóa sản phẩm'));
        await loadCart();
      },
      (_) async {
        await loadCart();
      },
    );
  }

  /// Clear the entire cart.
  Future<void> clearCart() async {
    final result = await _cartRepository.clearCart();
    await result.fold(
      (failure) async {
        emit(const CartError('Không thể xóa giỏ hàng'));
        await loadCart();
      },
      (_) async {
        emit(const CartLoaded(items: []));
      },
    );
  }
}
