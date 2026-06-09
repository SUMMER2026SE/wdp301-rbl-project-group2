export type AllergenCatalogItem = {
  id: string;
  label: string;
  aliases: string[];
};

export const ALLERGEN_CATALOG = [
  { id: 'beef', label: 'Thịt bò', aliases: ['bò', 'thịt bò', 'bò viên', 'gân bò', 'nạm bò', 'ba chỉ bò'] },
  { id: 'pork', label: 'Thịt heo', aliases: ['heo', 'lợn', 'thịt heo', 'sườn', 'ba chỉ', 'chả lụa', 'giò', 'nem'] },
  { id: 'chicken', label: 'Thịt gà', aliases: ['gà', 'thịt gà', 'gà ta', 'cánh gà', 'đùi gà'] },
  { id: 'fish', label: 'Cá', aliases: ['cá', 'chả cá', 'cá hồi', 'cá ngừ', 'cá lóc', 'cá thu', 'cá basa', 'nước mắm'] },
  { id: 'shrimp', label: 'Tôm', aliases: ['tôm', 'tôm hùm', 'tôm sú', 'tôm khô', 'mắm tôm'] },
  { id: 'crab', label: 'Cua', aliases: ['cua', 'ghẹ', 'càng cua'] },
  { id: 'squid', label: 'Mực', aliases: ['mực', 'mực ống'] },
  { id: 'shellfish', label: 'Hải sản có vỏ', aliases: ['nghêu', 'sò', 'ốc', 'hến', 'sò điệp', 'hải sản'] },
  { id: 'eggs', label: 'Trứng', aliases: ['trứng', 'trứng gà', 'trứng vịt', 'trứng cút', 'trứng muối'] },
  { id: 'dairy', label: 'Sữa', aliases: ['sữa', 'phô mai', 'kem', 'sữa chua', 'yogurt', 'bơ sữa', 'sữa đặc'] },
  { id: 'peanuts', label: 'Đậu phộng', aliases: ['đậu phộng', 'lạc', 'bơ đậu phộng'] },
  { id: 'soy', label: 'Đậu nành', aliases: ['đậu nành', 'tương', 'tofu', 'đậu hũ'] },
  { id: 'gluten', label: 'Gluten', aliases: ['lúa mì', 'bánh mì', 'bột mì', 'hoành thánh', 'ramen', 'seitan'] },
  { id: 'tree_nuts', label: 'Hạt cây', aliases: ['hạnh nhân', 'óc chó', 'hạt điều', 'hạt dẻ', 'macca'] },
  { id: 'sesame', label: 'Mè', aliases: ['mè', 'vừng', 'dầu mè'] },
  { id: 'allium', label: 'Hành / Tỏi', aliases: ['hành', 'hành lá', 'hành tây', 'tỏi', 'kiệu', 'hẹ'] },
  { id: 'msg', label: 'Bột ngọt', aliases: ['bột ngọt', 'mì chính', 'msg'] },
] as const satisfies AllergenCatalogItem[];

export const ALLERGEN_TAG_IDS: string[] = ALLERGEN_CATALOG.map((item) => item.id);

export const isKnownAllergenTag = (tag: string) => ALLERGEN_TAG_IDS.includes(tag);

export const normalizeAllergenTag = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, '_');

export const sanitizeAllergenTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .map((tag) => normalizeAllergenTag(String(tag)))
    .filter(isKnownAllergenTag);
  return [...new Set(normalized)];
};
