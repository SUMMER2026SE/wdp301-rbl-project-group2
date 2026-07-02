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

const buildSharedToppingOptions = (
  product: ProductLike,
  sideDishPriceByName: Map<string, number>,
) => {
  const rules = getSharedToppingRulesForProduct({
    name: product.name,
    category: product.category,
    tags: product.tags ?? [],
  });

  return rules
    .filter((rule) => sideDishPriceByName.has(rule.sourceProductName))
    .map((rule) => ({
      choice: rule.sourceProductName,
      extraPrice: sideDishPriceByName.get(rule.sourceProductName) ?? rule.fallbackPrice,
    }));
};

const withSharedToppingGroup = <T extends ProductLike>(
  product: T,
  options: Array<{ choice: string; extraPrice: number }>,
): T => ({
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
});

export const attachSharedToppingVariants = async <T extends ProductLike | null | undefined>(
  product: T,
): Promise<T> => {
  if (!product || product.category === SIDE_DISH_CATEGORY || hasSharedToppingGroup(product)) {
    return product;
  }

  const sideDishes = await ProductModel.find({
    category: SIDE_DISH_CATEGORY,
    isAvailable: { $ne: false },
  })
    .select('name price')
    .lean();

  const sideDishPriceByName = new Map(sideDishes.map((item) => [item.name, Number(item.price ?? 0)]));
  const options = buildSharedToppingOptions(product, sideDishPriceByName);

  if (options.length === 0) return product;

  return withSharedToppingGroup(product, options);
};

export const attachSharedToppingVariantsToProducts = async <T extends ProductLike>(products: T[]): Promise<T[]> =>
  {
    const eligibleProducts = products.filter(
      (product) => product.category !== SIDE_DISH_CATEGORY && !hasSharedToppingGroup(product),
    );

    if (eligibleProducts.length === 0) return products;

    const productsWithRules = eligibleProducts.filter(
      (product) =>
        getSharedToppingRulesForProduct({
          name: product.name,
          category: product.category,
          tags: product.tags ?? [],
        }).length > 0,
    );

    if (productsWithRules.length === 0) return products;

    const sideDishes = await ProductModel.find({
      category: SIDE_DISH_CATEGORY,
      isAvailable: { $ne: false },
    })
      .select('name price')
      .lean();

    const sideDishPriceByName = new Map(sideDishes.map((item) => [item.name, Number(item.price ?? 0)]));

    return products.map((product) => {
      if (product.category === SIDE_DISH_CATEGORY || hasSharedToppingGroup(product)) return product;

      const options = buildSharedToppingOptions(product, sideDishPriceByName);
      return options.length > 0 ? withSharedToppingGroup(product, options) : product;
    });
  };
