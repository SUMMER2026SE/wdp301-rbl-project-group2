/**
 * Shared preference constants used by both Onboarding and Profile Settings.
 * Single source of truth — never duplicate these lists.
 */

export interface DietOption {
  id: string;
  label: string;
  icon: string;
}

export interface AllergyOption {
  id: string;
  label: string;
  icon: string;
  colorClass: string;
}

export interface HealthGoalOption {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

export const DIET_OPTIONS: DietOption[] = [
  { id: "heart-healthy", label: "Tốt cho tim mạch", icon: "favorite" },
  { id: "low-sugar", label: "Ít đường", icon: "water_drop" },
  { id: "low-fat", label: "Ít béo", icon: "monitor_weight" },
  { id: "high-protein", label: "Nhiều đạm", icon: "fitness_center" },
  { id: "keto", label: "Keto", icon: "local_fire_department" },
  { id: "vegetarian", label: "Món chay", icon: "eco" },
  { id: "high-sodium-warning", label: "Cảnh báo: Cao Natri", icon: "warning" },
  { id: "high-sugar-warning", label: "Cảnh báo: Nhiều đường", icon: "warning" },
];


export const ALLERGY_OPTIONS: AllergyOption[] = [
  // ---------------- HẢI SẢN ----------------
  {
    id: "fish",
    label: "Cá",
    icon: "set_meal", // Icon con cá nằm trên đĩa (Chuẩn nhất)
    colorClass: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "shrimp",
    label: "Tôm",
    icon: "water", // Dùng icon gợn sóng nước
    colorClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    id: "crab",
    label: "Cua",
    icon: "waves", // Tránh dùng bọ, dùng icon biển cả
    colorClass: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400",
  },
  {
    id: "shellfish",
    label: "Hải sản có vỏ (Nghêu, Sò, Ốc)",
    icon: "bubble_chart", // Biểu tượng bọt biển/vỏ sò
    colorClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    id: "squid",
    label: "Mực / Bạch tuộc",
    icon: "water_drop",
    colorClass: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  },

  // ---------------- THỊT & GIA CẦM ----------------
  {
    id: "beef",
    label: "Thịt Bò",
    icon: "restaurant", // Icon chung cho món ăn sang trọng
    colorClass: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
  {
    id: "pork",
    label: "Thịt Heo",
    icon: "savings", // Lợn đất (Icon nhận diện con heo tốt nhất của Google)
    colorClass: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
  },
  {
    id: "chicken",
    label: "Thịt Gà / Gia cầm",
    icon: "dinner_dining", // Hình con gà quay trên khay
    colorClass: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },

  // ---------------- THỰC VẬT & CÁC LOẠI HẠT ----------------
  {
    id: "peanuts",
    label: "Đậu phộng (Lạc)",
    icon: "grain", // Icon hạt
    colorClass: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500",
  },
  {
    id: "tree_nuts", // Bổ sung mới
    label: "Các loại hạt (Macca, Hạnh nhân...)",
    icon: "forest", // Tượng trưng cho hạt từ cây
    colorClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500",
  },
  {
    id: "soy",
    label: "Đậu nành",
    icon: "eco", // Icon chiếc lá/tự nhiên
    colorClass: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
  {
    id: "gluten", // Bổ sung mới
    label: "Gluten / Lúa mì",
    icon: "bakery_dining", // Icon bánh mì / croissant
    colorClass: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500",
  },
  {
    id: "allium", // Bổ sung mới
    label: "Hành / Tỏi",
    icon: "spa", // Icon thực vật nhánh
    colorClass: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },

  // ---------------- THÀNH PHẦN KHÁC ----------------
  {
    id: "eggs",
    label: "Trứng",
    icon: "egg", // Chuẩn
    colorClass: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500 dark:text-yellow-400",
  },
  {
    id: "dairy",
    label: "Sữa & Lactose",
    icon: "local_drink", // Ly sữa (water_drop hay bị nhầm thành nước khoáng)
    colorClass: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  },
  {
    id: "msg", // Bổ sung mới
    label: "Bột ngọt (MSG)",
    icon: "science", // Icon khoa học / tinh thể bột
    colorClass: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  },
];
const STANDARD_ALLERGY_OPTIONS: AllergyOption[] = [
  { id: "fish", label: "Cá", icon: "set_meal", colorClass: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" },
  { id: "shrimp", label: "Tôm", icon: "water", colorClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" },
  { id: "crab", label: "Cua", icon: "waves", colorClass: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400" },
  { id: "shellfish", label: "Hải sản có vỏ", icon: "bubble_chart", colorClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
  { id: "squid", label: "Mực", icon: "water_drop", colorClass: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
  { id: "beef", label: "Thịt bò", icon: "restaurant", colorClass: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
  { id: "pork", label: "Thịt heo", icon: "savings", colorClass: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" },
  { id: "chicken", label: "Thịt gà", icon: "dinner_dining", colorClass: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  { id: "peanuts", label: "Đậu phộng", icon: "grain", colorClass: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500" },
  { id: "tree_nuts", label: "Hạt cây", icon: "forest", colorClass: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500" },
  { id: "soy", label: "Đậu nành", icon: "eco", colorClass: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
  { id: "gluten", label: "Gluten / Lúa mì", icon: "bakery_dining", colorClass: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500" },
  { id: "sesame", label: "Mè / Vừng", icon: "scatter_plot", colorClass: "bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-500" },
  { id: "allium", label: "Hành / Tỏi", icon: "spa", colorClass: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
  { id: "eggs", label: "Trứng", icon: "egg", colorClass: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500 dark:text-yellow-400" },
  { id: "dairy", label: "Sữa & lactose", icon: "local_drink", colorClass: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" },
  { id: "msg", label: "Bột ngọt (MSG)", icon: "science", colorClass: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
];

ALLERGY_OPTIONS.splice(0, ALLERGY_OPTIONS.length, ...STANDARD_ALLERGY_OPTIONS);

export const HEALTH_GOALS: HealthGoalOption[] = [
  {
    id: "weight-loss",
    label: "Giảm cân",
    icon: "monitoring",
    desc: "Kiểm soát calo & chất béo",
  },
  {
    id: "muscle-gain",
    label: "Tăng cơ",
    icon: "fitness_center",
    desc: "Tăng khẩu phần protein",
  },
  {
    id: "energy",
    label: "Năng lượng",
    icon: "bolt",
    desc: "Duy trì sức bền cả ngày",
  },
  {
    id: "digestion",
    label: "Tiêu hóa tốt",
    icon: "favorite",
    desc: "Nhiều chất xơ & men vi sinh",
  },
  {
    id: "heart-health",
    label: "Tim mạch",
    icon: "cardiology",
    desc: "Ít muối, ít chất béo bão hòa",
  },
  {
    id: "balance",
    label: "Dinh dưỡng cân bằng",
    icon: "balance",
    desc: "Đầy đủ dưỡng chất mỗi ngày",
  },
];

/** Key for saving pending onboarding prefs to localStorage (before login). */
export const PENDING_PREFS_KEY = "foodiedash_pending_prefs";
export interface PendingPreferences {
  dietary: string[];
  allergies: string[];
  healthGoals: string[];
}
