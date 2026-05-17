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
  {
    id: "beef",
    label: "Bò",
    icon: "cruelty_free",
    colorClass: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
  {
    id: "pork",
    label: "Heo",
    icon: "savings",
    colorClass:
      "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
  },
  {
    id: "chicken",
    label: "Gà",
    icon: "pest_control_rodent",
    colorClass:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  {
    id: "fish",
    label: "Cá",
    icon: "phishing",
    colorClass:
      "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "shrimp",
    label: "Tôm",
    icon: "set_meal",
    colorClass:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  {
    id: "crab",
    label: "Cua",
    icon: "pest_control",
    colorClass: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400",
  },
  {
    id: "squid",
    label: "Mực",
    icon: "waves",
    colorClass:
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "shellfish",
    label: "Hải sản có vỏ",
    icon: "water",
    colorClass:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    id: "peanuts",
    label: "Đậu phộng",
    icon: "spa",
    colorClass:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500",
  },
  {
    id: "eggs",
    label: "Trứng",
    icon: "egg",
    colorClass:
      "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500 dark:text-yellow-400",
  },
  {
    id: "dairy",
    label: "Sữa & Lactose",
    icon: "water_drop",
    colorClass: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
  },
  {
    id: "soy",
    label: "Đậu nành",
    icon: "grass",
    colorClass:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
];

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
  health_goals: string[];
}
