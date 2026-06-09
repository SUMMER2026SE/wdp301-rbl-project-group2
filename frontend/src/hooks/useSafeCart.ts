import { useCart } from './useCart';
import { useAuthStore } from '@/store/authStore';
import { checkProductAllergies } from './useAllergyCheck';
import { useAllergyWarningStore } from '@/store/allergyWarningStore';
import type { Product } from '@/types/product';
import type { CartItem } from '@/store/cartStore';

export const useSafeCart = () => {
  const cart = useCart();
  const user = useAuthStore((s) => s.user);
  const openWarning = useAllergyWarningStore((s) => s.openWarning);

  const safeAddItem = (product: Product, cartItemPayload: CartItem, onSuccess?: () => void) => {
    // Nếu người dùng chưa đăng nhập thì add thẳng (không check được hồ sơ)
    if (!user) {
      cart.addItem(cartItemPayload);
      onSuccess?.();
      return;
    }

    const ObjectUserAllergies = user.preferences?.allergies ?? [];
    const ObjectUserDietary = user.preferences?.dietary ?? [];

    const result = checkProductAllergies(product, ObjectUserAllergies, ObjectUserDietary);

    if (result.level === 'safe') {
      cart.addItem(cartItemPayload);
      onSuccess?.();
    } else {
      openWarning(
        {
          productName: product.name,
          conflictIngredients: result.conflictIngredients,
          warningMessage: result.warningMessage,
          level: result.level,
        },
        () => {
          cart.addItem(cartItemPayload);
          onSuccess?.();
        }
      );
    }
  };

  return { ...cart, safeAddItem };
};
