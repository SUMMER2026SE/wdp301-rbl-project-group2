import { useCart } from './useCart';
import type { Product } from '@/types/product';
import type { CartItem } from '@/store/cartStore';

export const useSafeCart = () => {
  const cart = useCart();

  const safeAddItem = (_product: Product, cartItemPayload: CartItem, onSuccess?: () => void) => {
    cart.addItem(cartItemPayload);
    onSuccess?.();
  };

  return { ...cart, safeAddItem };
};
