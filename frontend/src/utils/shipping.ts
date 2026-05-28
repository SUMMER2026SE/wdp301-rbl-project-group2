/**
 * FSS-34: Shipping fee utility
 * Delivery is available within supported wards of Đà Nẵng.
 * Matching is case-insensitive and trim-safe.
 */

export const DELIVERABLE_CITY = "Đà Nẵng";

export const INNER_WARDS = [
  "Hải Châu",
  "Hòa Cường",
  "Thanh Khê",
  "An Khê",
  "An Hải",
  "Sơn Trà",
  "Ngũ Hành Sơn",
];

export const OUTER_WARDS = [
  "Hòa Khánh",
  "Hải Vân",
  "Liên Chiểu",
  "Cẩm Lệ",
  "Hòa Xuân",
];

export const DELIVERABLE_WARDS = [...INNER_WARDS, ...OUTER_WARDS];

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
 * @param ward     - value from `address.ward`
 * @param city     - value from `address.city`
 * @param subtotal - cart subtotal in VND
 * @param config   - fee configuration from Store Settings API (optional, falls back to defaults)
 */
export function calculateShippingFee(
  ward: string,
  city: string,
  subtotal: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG
): ShippingResult {
  const normalCity = city.trim();
  const normalWard = ward.trim();

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

  // 2. Check ward whitelist (case-insensitive)
  const isInner = INNER_WARDS.some(
    (w) => w.toLowerCase() === normalWard.toLowerCase()
  );
  const isOuter = OUTER_WARDS.some(
    (w) => w.toLowerCase() === normalWard.toLowerCase()
  );

  if (!isInner && !isOuter) {
    return {
      fee: 0,
      blocked: true,
      reason: `Phường/Xã "${normalWard}" nằm ngoài vùng giao hàng của chúng tôi`,
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
