import ProductModel from '@/models/product.model';
import {
  getSharedToppingRulesForProduct,
  SHARED_TOPPING_GROUP_NAME,
  SIDE_DISH_CATEGORY,
} from '@/config/shared-toppings';

type ProductLike = {
  name: string;
  category: string;
  storeId?: unknown;
  tags?: string[];
  variants?: any[];
};

const hasSharedToppingGroup = (product: ProductLike) =>
  (product.variants ?? []).some((group) => group?.name === SHARED_TOPPING_GROUP_NAME);

export const attachSharedToppingVariants = async <T extends ProductLike | null | undefined>(
  product: T,
): Promise<T> => {
  if (!product || product.category === SIDE_DISH_CATEGORY || hasSharedToppingGroup(product)) {
    return product;
  }

  const rules = getSharedToppingRulesForProduct({
    name: product.name,
    category: product.category,
    tags: product.tags ?? [],
  });

  if (rules.length === 0) return product;

  const storeId = product.storeId;
  if (!storeId) return product;

  const sideDishes = await ProductModel.find({
    storeId,
    category: SIDE_DISH_CATEGORY,
    isAvailable: { $ne: false },
  })
    .select('name price')
    .lean();

  const sideDishPriceByName = new Map(sideDishes.map((item) => [item.name, Number(item.price ?? 0)]));
  const options = rules
    .filter((rule) => sideDishPriceByName.has(rule.sourceProductName))
    .map((rule) => ({
      choice: rule.sourceProductName,
      extraPrice: sideDishPriceByName.get(rule.sourceProductName) ?? rule.fallbackPrice,
    }));

  if (options.length === 0) return product;

  return {
    ...product,
    variants: [
      ...(product.variants ?? []),
      {
        name: SHARED_TOPPING_GROUP_NAME,
        required: false,
        multiple: true,
        maxChoices: Math.min(3, options.length),
        options,
      },
    ],
  };
};

export const attachSharedToppingVariantsToProducts = async <T extends ProductLike>(products: T[]): Promise<T[]> =>
  Promise.all(products.map((product) => attachSharedToppingVariants(product)));
