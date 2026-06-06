export const SIDE_DISH_CATEGORY = 'Gọi Thêm Ăn Kèm';
export const SHARED_TOPPING_GROUP_NAME = 'Topping ăn kèm';

export interface ToppingProductRule {
  sourceProductName: string;
  fallbackPrice: number;
  appliesTo: (product: ToppingProductInput) => boolean;
}

export interface ToppingProductInput {
  name: string;
  category: string;
  tags?: string[];
}

const normalize = (value: string = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

const hasAny = (value: string, keywords: string[]) => {
  const normalized = normalize(value);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
};

const isSideDish = (product: ToppingProductInput) =>
  normalize(product.category) === normalize(SIDE_DISH_CATEGORY);

const isDrinkOrDessert = (product: ToppingProductInput) =>
  hasAny(product.category, ['Giải Khát', 'Tráng Miệng']);

const isPlantBasedDish = (product: ToppingProductInput) =>
  hasAny(product.name, ['Rau Củ', 'Nấm']) ||
  (product.tags ?? []).some((tag) => ['chay', 'vegan', 'thuan chay'].includes(normalize(tag)));

const isWaterNoodle = (product: ToppingProductInput) =>
  hasAny(product.category, ['Trứ Danh Món Nước']) ||
  hasAny(product.name, ['Bún Bò', 'Hủ Tiếu', 'Bánh Canh', 'Bún Chả Cá']);

const isDryNoodleOrSpecial = (product: ToppingProductInput) =>
  hasAny(product.name, ['Cao Lầu', 'Mì Quảng', 'Mì Xá Xíu']);

const isRiceDish = (product: ToppingProductInput) =>
  hasAny(product.category, ['Cơm Đĩa']) || hasAny(product.name, ['Cơm']);

const isHealthyProteinDish = (product: ToppingProductInput) =>
  hasAny(product.category, ['Góc Healthy']) &&
  hasAny(product.name, ['Ức Gà', 'Salad']) &&
  !isPlantBasedDish(product);

const isEligibleFood = (product: ToppingProductInput) =>
  !isSideDish(product) && !isDrinkOrDessert(product);

export const SHARED_TOPPING_RULES: ToppingProductRule[] = [
  {
    sourceProductName: 'Trứng Luộc Lòng Đào',
    fallbackPrice: 8000,
    appliesTo: (product) =>
      isEligibleFood(product) &&
      !isPlantBasedDish(product) &&
      (isRiceDish(product) || isWaterNoodle(product) || isDryNoodleOrSpecial(product) || isHealthyProteinDish(product)),
  },
  {
    sourceProductName: 'Chén Bò Viên Thêm',
    fallbackPrice: 20000,
    appliesTo: (product) =>
      isEligibleFood(product) &&
      (isWaterNoodle(product) || hasAny(product.name, ['Mì Xá Xíu'])),
  },
  {
    sourceProductName: 'Đĩa Quẩy Giòn',
    fallbackPrice: 10000,
    appliesTo: (product) =>
      isEligibleFood(product) &&
      (isWaterNoodle(product) || hasAny(product.name, ['Bún Bò', 'Bánh Canh', 'Hủ Tiếu'])),
  },
  {
    sourceProductName: 'Chén Tóp Mỡ Rim Tỏi Ớt',
    fallbackPrice: 15000,
    appliesTo: (product) =>
      isEligibleFood(product) && !isPlantBasedDish(product) && (isRiceDish(product) || isDryNoodleOrSpecial(product)),
  },
];

export const getSharedToppingRulesForProduct = (product: ToppingProductInput) =>
  SHARED_TOPPING_RULES.filter((rule) => rule.appliesTo(product));
