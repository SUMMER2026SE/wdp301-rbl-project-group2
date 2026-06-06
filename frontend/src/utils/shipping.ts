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
  distance?: number;
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

export const WARD_CENTROIDS: Record<string, [number, number]> = {
  "Hải Châu": [108.2200, 16.0600],
  "Hòa Cường": [108.2200, 16.0300],
  "Thanh Khê": [108.1800, 16.0600],
  "An Khê": [108.1700, 16.0500],
  "An Hải": [108.2300, 16.0600],
  "Sơn Trà": [108.2400, 16.0700],
  "Ngũ Hành Sơn": [108.2500, 16.0100],
  "Hòa Khánh": [108.1500, 16.0800],
  "Hải Vân": [108.1300, 16.1800],
  "Liên Chiểu": [108.1600, 16.0800],
  "Cẩm Lệ": [108.2100, 16.0100],
  "Hòa Xuân": [108.2200, 15.9900],
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getWardCentroid = (wardName: string): [number, number] | null => {
  const normalized = wardName.trim().toLowerCase();
  for (const [key, coords] of Object.entries(WARD_CENTROIDS)) {
    if (key.toLowerCase() === normalized) {
      return coords;
    }
  }
  return null;
};

/**
 * Calculate shipping fee based on address and dynamic config from Store Settings.
 * @param ward             - value from `address.ward`
 * @param city             - value from `address.city`
 * @param subtotal         - cart subtotal in VND
 * @param storeCoordinates - Coordinates [lng, lat] of the selected store branch
 * @param config           - fee configuration from Store Settings API (optional, falls back to defaults)
 */
export function calculateShippingFee(
  ward: string,
  city: string,
  subtotal: number,
  storeCoordinates?: number[],
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

  // Determine distance
  let distance = isInner ? 2.0 : 5.0; // fallback defaults
  if (storeCoordinates && storeCoordinates.length === 2) {
    const wardCentroid = getWardCentroid(normalWard);
    if (wardCentroid) {
      const storeLng = storeCoordinates[0];
      const storeLat = storeCoordinates[1];
      const wardLng = wardCentroid[0];
      const wardLat = wardCentroid[1];
      const rawDistance = calculateDistance(storeLat, storeLng, wardLat, wardLng);
      // Round to 1 decimal place (e.g. 2.4 km)
      distance = Math.round(rawDistance * 10) / 10;
    }
  }

  // 3. Free shipping check
  if (freeDeliveryEnabled && subtotal >= freeDeliveryThreshold) {
    return { fee: 0, blocked: false, zone: "free", distance };
  }

  // 4. Calculate dynamic fee based on distance
  const fee = Math.round(baseDeliveryFee + feePerKm * distance);
  return { fee, blocked: false, zone: isInner ? "inner" : "outer", distance };
}
