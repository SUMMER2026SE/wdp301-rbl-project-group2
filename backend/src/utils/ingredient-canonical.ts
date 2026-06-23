export type RecipeIngredientInput = {
  name: string;
  quantity: number;
  unit: string;
};

const exactNameMap: Record<string, string> = {
  'Bắp bò': 'Thịt bò',
  'Thịt Heo': 'Thịt heo',
  'Thịt ba chỉ': 'Thịt heo',
  'Thịt heo xíu': 'Thịt heo',
  'Sườn nướng': 'Thịt heo',
  'Xương heo': 'Thịt heo',
  'Đùi gà': 'Thịt gà',
  'Ức gà': 'Thịt gà',
  'Ức gà phi lê': 'Thịt gà',
  'Tôm sú': 'Tôm',
  'Tôm đất': 'Tôm',
  'Nấm đông cô': 'Nấm',
  'Nấm đùi gà': 'Nấm',
  'Cơm trắng': 'Cơm',
  'Cơm thố': 'Cơm',
  'Cơm chiên': 'Cơm',
  'Cơm tấm': 'Cơm',
  'Hạt Sen': 'Hạt sen',
  'Trứng Cút': 'Trứng',
  'bột mì': 'Bột mì',
  'trứng': 'Trứng',
  'đường': 'Đường',
  'sữa tươi': 'Sữa',
};

const splitNameMap: Record<string, string[]> = {
  'Hải sản (Tôm, Mực)': ['Tôm', 'Mực'],
  'Bánh tráng, rau sống': ['Bánh tráng', 'Rau sống'],
  'Xà lách, rau củ': ['Xà lách', 'Rau củ'],
};

export const INVALID_INGREDIENT_NAMES = ['Hải sản', 'Nước dùng', 'Thành phần tổng hợp'];
export const SPLIT_INGREDIENT_NAMES = Object.keys(splitNameMap);
export const REMAPPED_INGREDIENT_NAMES = Object.keys(exactNameMap);

export const canonicalIngredientName = (name: string) => exactNameMap[name.trim()] ?? name.trim();

export const canonicalizeRecipeIngredient = (item: RecipeIngredientInput): RecipeIngredientInput[] => {
  const name = item.name.trim();
  if (!name || INVALID_INGREDIENT_NAMES.includes(name)) return [];

  const splitNames = splitNameMap[name];
  if (splitNames) {
    const splitQuantity = Number.isFinite(item.quantity) && item.quantity > 0
      ? item.quantity / splitNames.length
      : 1;

    return splitNames.map((splitName) => ({
      name: splitName,
      quantity: splitQuantity,
      unit: item.unit,
    }));
  }

  return [{
    name: canonicalIngredientName(name),
    quantity: item.quantity,
    unit: item.unit,
  }];
};
