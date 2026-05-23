import { OK } from '@/constants/http';
import { catchErrors } from '@/utils/asyncHandler';
import { addToCart, getCart, mergeCart, clearCart, updateItemQuantity, removeItem } from '@/services/cart.service';
import { addToCartValidator } from '@/validators/cart.validator';

export const getCartHandler = catchErrors(async (req, res) => {
  const user = req.userId;
  const cart = await getCart(user);

  return res.success(OK, {
    data: cart,
  });
});

export const addToCartHandler = catchErrors(async (req, res) => {
  const user = req.userId;
  const input = addToCartValidator.parse(req.body);

  const cart = await addToCart(user, input);

  return res.success(OK, {
    data: cart,
    message: 'Thêm vào giỏ thành công.',
  });
});

export const mergeCartHandler = catchErrors(async (req, res) => {
  const user = req.userId;
  const { items } = req.body;
  const cart = await mergeCart(user, items || []);
  return res.success(OK, { data: cart, message: 'Gộp giỏ hàng thành công' });
});

export const updateItemHandler = catchErrors(async (req, res) => {
  const user = req.userId;
  const { product_id, variations, quantity } = req.body;
  const cart = await updateItemQuantity(user, product_id, variations || [], quantity);
  return res.success(OK, { data: cart, message: 'Cập nhật số lượng thành công' });
});

export const removeItemHandler = catchErrors(async (req, res) => {
  const user = req.userId;
  const { product_id, variations } = req.body;
  const cart = await removeItem(user, product_id, variations || []);
  return res.success(OK, { data: cart, message: 'Đã xóa món ăn khỏi giỏ hàng' });
});

export const clearCartHandler = catchErrors(async (req, res) => {
  const user = req.userId;
  await clearCart(user);
  return res.success(OK, { message: 'Đã xóa giỏ hàng' });
});
