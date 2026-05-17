/**
 * FSS-34: Shipping fee utility
 * Delivery is ONLY available within 7 zones of Đà Nẵng.
 * Matching is case-insensitive and trim-safe.
 */

export const DELIVERABLE_CITY = "Đà Nẵng";

export const INNER_DISTRICTS = [
  "Hải Châu",
  "Thanh Khê",
  "Sơn Trà",
  "Ngũ Hành Sơn",
];

export const OUTER_DISTRICTS = ["Liên Chiểu", "Cẩm Lệ", "Hòa Vang"];

export const ALL_DELIVERABLE_DISTRICTS = [
  ...INNER_DISTRICTS,
  ...OUTER_DISTRICTS,
];

/** Sub-wards grouped by parent district (for the cascaded dropdown) */
export const DA_NANG_ZONES: Record<string, string[]> = {
  "Hải Châu": [
    "Thanh Bình",
    "Thuận Phước",
    "Thạch Thang",
    "Phước Ninh",
    "Hải Châu",
    "Hòa Cường",
    "Bình Thuận",
    "Hòa Thuận Tây",
    "Hòa Cường Bắc",
    "Hòa Cường Nam",
  ],
  "Thanh Khê": [
    "Xuân Hà",
    "Chính Gián",
    "Thạc Gián",
    "Thanh Khê Tây",
    "Thanh Khê Đông",
    "Hòa An",
    "Hòa Phát",
    "An Khê",
  ],
  "Sơn Trà": [
    "Phước Mỹ",
    "An Hải Bắc",
    "An Hải Nam",
    "Thọ Quang",
    "Nại Hiên Đông",
    "Mân Thái",
  ],
  "Ngũ Hành Sơn": ["Mỹ An", "Khuê Mỹ", "Hòa Hải", "Hòa Quý"],
  "Liên Chiểu": [
    "Hòa Khánh Nam",
    "Hòa Minh",
    "Hòa Sơn",
    "Hòa Hiệp Bắc",
    "Hòa Hiệp Nam",
    "Hòa Bắc",
    "Hòa Liên",
    "Hòa Khánh Bắc",
  ],
  "Cẩm Lệ": ["Hòa Thọ Tây", "Hòa Thọ Đông", "Khuê Trung"],
  "Hòa Vang": [
    "Hòa Phong",
    "Hòa Phú",
    "Hòa Khương",
    "Hòa Tiến",
    "Hòa Ninh",
    "Hòa Nhơn",
  ],
};

export interface ShippingResult {
  fee: number;
  blocked: boolean;
  reason?: string;
  zone?: "inner" | "outer" | "free";
}

export interface ShippingConfig {
  /** Base delivery fee in VND (applied to inner zone) */
  baseDeliveryFee: number;
  /** Extra fee per km for outer zones (in VND) */
  feePerKm: number;
  /** Whether free delivery is enabled */
  freeDeliveryEnabled: boolean;
  /** Subtotal threshold for free delivery (VND) */
  freeDeliveryThreshold: number;
}

// Default values used as fallback when settings haven't loaded yet
export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  baseDeliveryFee: 15_000,
  feePerKm: 5_000,
  freeDeliveryEnabled: true,
  freeDeliveryThreshold: 300_000,
};

/**
 * Calculate shipping fee based on address and dynamic config from Store Settings.
 * @param district - value from `address.district`
 * @param city     - value from `address.city`
 * @param subtotal - cart subtotal in VND
 * @param config   - fee configuration from Store Settings API (optional, falls back to defaults)
 */
export function calculateShippingFee(
  district: string,
  city: string,
  subtotal: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG
): ShippingResult {
  const normalCity = city.trim();
  const normalDistrict = district.trim();

  const {
    baseDeliveryFee,
    feePerKm,
    freeDeliveryEnabled,
    freeDeliveryThreshold,
  } = config;

  // 1. Check city
  if (normalCity.toLowerCase() !== DELIVERABLE_CITY.toLowerCase()) {
    return {
      fee: 0,
      blocked: true,
      reason: "Hiện tại chỉ giao hàng trong khu vực Đà Nẵng",
    };
  }

  // 2. Check district whitelist (case-insensitive)
  const isInner = INNER_DISTRICTS.some(
    (d) => d.toLowerCase() === normalDistrict.toLowerCase()
  );
  const isOuter = OUTER_DISTRICTS.some(
    (d) => d.toLowerCase() === normalDistrict.toLowerCase()
  );

  if (!isInner && !isOuter) {
    return {
      fee: 0,
      blocked: true,
      reason: `Khu vực "${normalDistrict}" nằm ngoài vùng giao hàng của chúng tôi`,
    };
  }

  // 3. Free shipping check
  if (freeDeliveryEnabled && subtotal >= freeDeliveryThreshold) {
    return { fee: 0, blocked: false, zone: "free" };
  }

  // 4. Tiered fee: inner zone = baseDeliveryFee, outer zone = baseDeliveryFee + feePerKm * 5km
  if (isInner) {
    return { fee: baseDeliveryFee, blocked: false, zone: "inner" };
  }
  // Outer zone gets an extra distance surcharge
  return { fee: baseDeliveryFee + feePerKm * 5, blocked: false, zone: "outer" };
}
