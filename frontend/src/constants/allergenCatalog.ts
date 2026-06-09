export interface AllergenOption {
  id: string;
  label: string;
}

export const ALLERGEN_OPTIONS: AllergenOption[] = [
  { id: "beef", label: "Thịt bò" },
  { id: "pork", label: "Thịt heo" },
  { id: "chicken", label: "Thịt gà" },
  { id: "fish", label: "Cá" },
  { id: "shrimp", label: "Tôm" },
  { id: "crab", label: "Cua" },
  { id: "squid", label: "Mực" },
  { id: "shellfish", label: "Hải sản có vỏ" },
  { id: "eggs", label: "Trứng" },
  { id: "dairy", label: "Sữa" },
  { id: "peanuts", label: "Đậu phộng" },
  { id: "soy", label: "Đậu nành" },
  { id: "gluten", label: "Gluten" },
  { id: "tree_nuts", label: "Hạt cây" },
  { id: "sesame", label: "Mè" },
  { id: "allium", label: "Hành / Tỏi" },
  { id: "msg", label: "Bột ngọt" },
];

export const getAllergenLabel = (id: string) => ALLERGEN_OPTIONS.find((item) => item.id === id)?.label ?? id;
