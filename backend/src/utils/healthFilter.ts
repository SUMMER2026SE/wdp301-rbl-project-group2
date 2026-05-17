export const DIETARY_CONFLICT_MAP: Record<string, string[]> = {
  'vegetarian': ['bò', 'gà', 'lợn', 'heo', 'cá', 'tôm', 'mực', 'thịt', 'cua', 'ốc'],
  'chay': ['bò', 'gà', 'lợn', 'heo', 'cá', 'tôm', 'mực', 'thịt', 'cua', 'ốc'],
  /** Thuần chay: không động vật + không sữa/trứng */
  'vegan': [
    'bò', 'gà', 'lợn', 'heo', 'cá', 'tôm', 'mực', 'thịt', 'cua', 'ốc',
    'trứng', 'phô mai', 'sữa bò', 'sữa đặc', 'sữa tươi', 'kem béo', 'bơ sữa',
    'whipping cream', 'yogurt', 'sữa chua',
  ],
  /** Đồng bộ với FE HIGH_CARB / keto — phải có "mì" (mì tươi, mì gói, mì quảng...) */
  'keto': [
    'cơm', 'bún', 'phở', 'mì', 'mì gạo', 'mì gói', 'bánh mì', 'bánh gạo', 'đường', 'ngọt', 'trái cây',
    'khoai', 'khoai tây', 'bột', 'bột mì', 'trân châu',
  ],
  'eat clean': ['chiên', 'nướng', 'rán', 'đường', 'ngọt', 'béo', 'mỡ', 'xúc xích', 'lạp xưởng'],
  'low carb': [
    'cơm', 'bún', 'mì', 'mì gạo', 'bánh mì', 'bánh gạo', 'đường', 'ngọt', 'khoai', 'khoai tây', 'bột', 'trân châu',
  ],
};

export const ALLERGY_MAP: Record<string, string[]> = {
  'hải sản': ['tôm', 'cua', 'mực', 'nghêu', 'sò', 'ốc', 'hến', 'cá', 'chả cá', 'surimi'],
  'sữa': ['phô mai', 'sữa bò', 'sữa đặc', 'sữa tươi', 'kem béo', 'bơ sữa', 'whipping cream', 'yogurt', 'sữa chua'],
  'trứng': ['trứng gà', 'trứng vịt', 'trứng cút', 'trứng muối', 'lòng đỏ', 'lòng trắng'],
  'đậu phộng': ['lạc', 'bơ đậu phộng'],
  'gluten': ['lúa mì', 'bánh mì', 'bột mì', 'hoành thánh', 'ramen', 'cereal', 'seitan'],
  'đậu nành': ['đậu nành', 'tương', 'đậu hũ', 'tofu'],
};

/**
 * FE/Onboarding lưu allergies là id tiếng Anh (fish, shrimp, beef...).
 * Phải map sang từ khóa tiếng Việt trong tên/mô tả món — nếu không sẽ không loại được "tôm", "cá".
 */
export const ALLERGY_ID_KEYWORDS: Record<string, string[]> = {
  beef: ['bò', 'thịt bò', 'bò viên', 'gân bò', 'nạm bò', 'ba chỉ bò'],
  pork: ['heo', 'lợn', 'thịt heo', 'sườn', 'ba chỉ', 'nạc heo', 'xúc xích', 'chả lụa', 'giò', 'nem'],
  chicken: ['gà', 'thịt gà', 'gà ta', 'cánh gà', 'đùi gà'],
  fish: ['cá', 'chả cá', 'cá hồi', 'cá ngừ', 'cá lóc', 'cá thu', 'cá basa', 'surimi', 'mắm cá', 'hải sản'],
  shrimp: ['tôm', 'tôm hùm', 'tôm sú', 'tôm khô', 'mắm tôm', 'hải sản'],
  crab: ['cua', 'ghẹ', 'càng cua'],
  squid: ['mực', 'mực ống'],
  shellfish: ['nghêu', 'sò', 'ốc', 'hến', 'sò điệp', 'hải sản'],
  peanuts: ['đậu phộng', 'lạc', 'bơ đậu phộng'],
  eggs: ['trứng', 'trứng gà', 'trứng vịt', 'trứng cút', 'trứng muối', 'lòng đỏ', 'lòng trắng'],
  dairy: ['sữa', 'phô mai', 'kem', 'sữa chua', 'yogurt', 'bơ sữa', 'sữa đặc'],
  soy: ['đậu nành', 'tương', 'tofu', 'đậu hũ'],
};

export const HEALTH_GOAL_CONFLICT_MAP: Record<string, string[]> = {
  'giảm cân': ['đường', 'sữa đặc', 'trân châu', 'kem béo', 'phô mai', 'nước cốt dừa', 'chiên', 'rán'],
  'tiểu đường': ['đường', 'sữa đặc', 'nước đường', 'trân châu', 'ngọt'],
  'ít đường': ['đường', 'sữa đặc', 'nước đường', 'trân châu', 'ngọt'],
  'mỡ máu': ['chiên', 'rán', 'dầu mỡ', 'da gà', 'nội tạng', 'mỡ bò', 'mỡ heo', 'bơ béo'],
};

export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .trim();
}

export function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  return nb.includes(na) || na.includes(nb);
}

/** Tập từ khóa cấm (tiếng Việt + id) dùng chung cho lọc món, đơn hàng, AI. */
export function buildForbiddenKeywordSet(preferences: any): Set<string> {
  const userAllergies: string[] = (preferences?.allergies ?? []).map((a: string) =>
    normalizeText(a).trim()
  );
  const userDietary: string[] = (preferences?.dietary ?? []).map((d: string) =>
    normalizeText(d).trim()
  );
  const userHealthGoals: string[] = (preferences?.health_goals ?? []).map((g: string) =>
    normalizeText(g).trim()
  );

  const forbiddenKeywords = new Set<string>(userAllergies);

  for (const allergy of userAllergies) {
    const byId = ALLERGY_ID_KEYWORDS[allergy];
    if (byId) {
      byId.forEach((k) => forbiddenKeywords.add(k));
    }
  }

  for (const allergy of userAllergies) {
    for (const [broad, items] of Object.entries(ALLERGY_MAP)) {
      if (allergy.includes(broad) || broad.includes(allergy)) {
        items.forEach((k) => forbiddenKeywords.add(k));
      }
    }
  }

  for (const diet of userDietary) {
    const normalizedDiet = diet.replace(/_/g, ' ').toLowerCase();
    for (const [key, forbiddenList] of Object.entries(DIETARY_CONFLICT_MAP)) {
      if (normalizedDiet.includes(key)) {
        forbiddenList.forEach((k) => forbiddenKeywords.add(k));
      }
    }
  }

  for (const goal of userHealthGoals) {
    for (const [key, forbiddenList] of Object.entries(HEALTH_GOAL_CONFLICT_MAP)) {
      if (goal.includes(key)) {
        forbiddenList.forEach((k) => forbiddenKeywords.add(k));
      }
    }
  }

  return forbiddenKeywords;
}

/**
 * Filter a list of products to strictly return ONLY the ones that
 * have NO conflicts with the user's allergies and dietary preferences.
 */
export function filterSafeProducts(products: any[], preferences: any): any[] {
  const forbiddenKeywords = buildForbiddenKeywordSet(preferences);

  // If no restrictions, everything is safe
  if (forbiddenKeywords.size === 0) return products;

  const safeProducts = [];

  for (const product of products) {
    let hasConflict = false;
    const recipe: { name: string }[] = product.recipe ?? [];
    const tagList: string[] = [
      ...(Array.isArray(product.tags) ? product.tags : []),
      ...(Array.isArray(product.health_tags) ? product.health_tags : []),
    ];

    // Tên, mô tả, công thức, tag — mô tả thường ghi "cùng tôm..." như tên món ngắn
    const keywordsToScan = [
      product.name,
      product.description,
      ...recipe.map((r) => r.name),
      ...tagList,
    ];

    for (const keyword of keywordsToScan) {
      if (!keyword) continue;
      for (const forbidden of forbiddenKeywords) {
        if (fuzzyMatch(forbidden, keyword)) {
          hasConflict = true;
          break;
        }
      }
      if (hasConflict) break;
    }

    if (!hasConflict) {
      safeProducts.push(product);
    }
  }

  return safeProducts;
}
