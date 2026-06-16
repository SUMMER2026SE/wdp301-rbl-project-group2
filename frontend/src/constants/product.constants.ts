/**
 * Shared product constants — Single source of truth.
 * Dùng chung giữa Admin và Customer để tránh mismatch với database.
 */

export const CATEGORIES = [
  "Cơm Đĩa Truyền Thống",
  "Giải Khát & Tráng Miệng",
  "Góc Healthy & Ăn Kiêng",
  "Gọi Thêm Ăn Kèm",
  "Trứ Danh Món Nước",
  "Đặc Sản & Bán Chạy",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Category list kèm nhãn hiển thị cho Customer filter */
export const CUSTOMER_CATEGORY_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "Cơm Đĩa Truyền Thống", label: "Cơm Đĩa Truyền Thống" },
  { id: "Giải Khát & Tráng Miệng", label: "Giải Khát & Tráng Miệng" },
  { id: "Góc Healthy & Ăn Kiêng", label: "Góc Healthy & Ăn Kiêng" },
  { id: "Gọi Thêm Ăn Kèm", label: "Gọi Thêm Ăn Kèm" },
  { id: "Trứ Danh Món Nước", label: "Trứ Danh Món Nước" },
  { id: "Đặc Sản & Bán Chạy", label: "Đặc Sản & Bán Chạy" },
] as const;

/** Price range presets (đơn vị: VNĐ) */
export const PRICE_STEPS = [
  { label: "Dưới 50.000đ", max: 50_000 },
  { label: "50.000 – 100.000đ", min: 50_000, max: 100_000 },
  { label: "100.000 – 200.000đ", min: 100_000, max: 200_000 },
  { label: "Trên 200.000đ", min: 200_000 },
] as const;

/** Health tag options dùng chung */
export const HEALTH_TAG_OPTIONS = [
  {
    id: "heart_healthy",
    label: "Tốt cho tim mạch",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  {
    id: "low_sugar",
    label: "Ít đường",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "low_fat",
    label: "Ít béo",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  {
    id: "high_protein",
    label: "Nhiều đạm",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    id: "keto",
    label: "Keto",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    id: "vegan",
    label: "Món chay",
    color: "bg-teal-100 text-teal-700 border-teal-200",
  },
  {
    id: "warning_sodium",
    label: "Cảnh báo: Cao Natri",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  {
    id: "warning_sugar",
    label: "Cảnh báo: Nhiều đường",
    color: "bg-rose-100 text-rose-700 border-rose-200",
  },
] as const;
