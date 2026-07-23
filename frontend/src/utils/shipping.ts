/**
 * FSS-34: Shipping fee utility
 * Delivery is available within supported wards of Đà Nẵng.
 * Matching is case-insensitive and trim-safe.
 */

export const DELIVERABLE_CITY = "Đà Nẵng";

export const INNER_WARDS = [
  "Hải Châu I",
  "Hải Châu II",
  "Thạch Thang",
  "Thanh Bình",
  "Thuận Phước",
  "Hòa Thuận Đông",
  "Hòa Thuận Tây",
  "Nam Dương",
  "Phước Ninh",
  "Bình Hiên",
  "Bình Thuận",
  "Hòa Cường Bắc",
  "Hòa Cường Nam",
  "Hải Châu",
  "Hòa Cường",

  "Vĩnh Trung",
  "Tân Chính",
  "Thạc Gián",
  "Chính Gián",
  "Tam Thuận",
  "Xuân Hà",
  "An Khê",
  "Hòa Khê",
  "Thanh Khê Đông",
  "Thanh Khê Tây",
  "Thanh Khê",

  "An Hải Bắc",
  "An Hải Tây",
  "An Hải Đông",
  "Phước Mỹ",
  "Nại Hiên Đông",
  "Mân Thái",
  "Thọ Quang",
  "Sơn Trà",
  "An Hải",

  "Mỹ An",
  "Khuê Mỹ",
  "Hòa Hải",
  "Hòa Quý",
  "Ngũ Hành Sơn",

  "Khuê Trung",
  "Hòa Thọ Đông",
  "Hòa An",
  "Hòa Phát",
  "Cẩm Lệ",
];

export const OUTER_WARDS = [
  "Hòa Thọ Tây",
  "Hòa Xuân",
  "Hòa Minh",
  "Hòa Khánh Nam",
  "Hòa Khánh Bắc",
  "Hòa Hiệp Nam",
  "Hòa Hiệp Bắc",
  "Liên Chiểu",
  "Hòa Khánh",
  "Hải Vân",
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
  // --- Hải Châu ---
  "Hải Châu I": [108.2210, 16.0660],
  "Hải Châu II": [108.2170, 16.0620],
  "Thạch Thang": [108.2160, 16.0730],
  "Thanh Bình": [108.2110, 16.0750],
  "Thuận Phước": [108.2150, 16.0850],
  "Hòa Thuận Đông": [108.2190, 16.0480],
  "Hòa Thuận Tây": [108.2030, 16.0460],
  "Nam Dương": [108.2170, 16.0590],
  "Phước Ninh": [108.2200, 16.0580],
  "Bình Hiên": [108.2190, 16.0550],
  "Bình Thuận": [108.2180, 16.0510],
  "Hòa Cường Bắc": [108.2180, 16.0370],
  "Hòa Cường Nam": [108.2190, 16.0260],
  "Hải Châu": [108.2200, 16.0600],
  "Hòa Cường": [108.2200, 16.0300],

  // --- Thanh Khê ---
  "Vĩnh Trung": [108.2110, 16.0600],
  "Tân Chính": [108.2100, 16.0660],
  "Thạc Gián": [108.2080, 16.0580],
  "Chính Gián": [108.2000, 16.0610],
  "Tam Thuận": [108.2040, 16.0710],
  "Xuân Hà": [108.1960, 16.0670],
  "An Khê": [108.1720, 16.0540],
  "Hòa Khê": [108.1810, 16.0560],
  "Thanh Khê Đông": [108.1830, 16.0680],
  "Thanh Khê Tây": [108.1700, 16.0660],
  "Thanh Khê": [108.1800, 16.0600],

  // --- Sơn Trà ---
  "An Hải Bắc": [108.2370, 16.0690],
  "An Hải Tây": [108.2290, 16.0610],
  "An Hải Đông": [108.2360, 16.0580],
  "Phước Mỹ": [108.2430, 16.0590],
  "Nại Hiên Đông": [108.2340, 16.0880],
  "Mân Thái": [108.2440, 16.0760],
  "Thọ Quang": [108.2580, 16.1040],
  "Sơn Trà": [108.2400, 16.0700],
  "An Hải": [108.2300, 16.0600],

  // --- Ngũ Hành Sơn ---
  "Mỹ An": [108.2450, 16.0450],
  "Khuê Mỹ": [108.2480, 16.0230],
  "Hòa Hải": [108.2600, 15.9850],
  "Hòa Quý": [108.2320, 15.9800],
  "Ngũ Hành Sơn": [108.2500, 16.0100],

  // --- Cẩm Lệ ---
  "Khuê Trung": [108.2110, 16.0220],
  "Hòa Thọ Đông": [108.1990, 16.0140],
  "Hòa Thọ Tây": [108.1670, 16.0090],
  "Hòa An": [108.1760, 16.0330],
  "Hòa Phát": [108.1820, 16.0230],
  "Hòa Xuân": [108.2180, 15.9920],
  "Cẩm Lệ": [108.2100, 16.0100],

  // --- Liên Chiểu ---
  "Hòa Minh": [108.1740, 16.0710],
  "Hòa Khánh Nam": [108.1480, 16.0600],
  "Hòa Khánh Bắc": [108.1500, 16.0810],
  "Hòa Hiệp Nam": [108.1390, 16.0960],
  "Hòa Hiệp Bắc": [108.1180, 16.1430],
  "Liên Chiểu": [108.1600, 16.0800],
  "Hòa Khánh": [108.1500, 16.0800],
  "Hải Vân": [108.1300, 16.1800],
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

export const getWardCentroid = (wardName: string): [number, number] | null => {
  const normalized = wardName.trim().toLowerCase();
  for (const [key, coords] of Object.entries(WARD_CENTROIDS)) {
    if (key.toLowerCase() === normalized) {
      return coords;
    }
  }
  return null;
};

export const getAddressCoordinates = (address?: {
  ward?: string;
  latitude?: number;
  longitude?: number;
} | null): { lat: number; lng: number } | null => {
  if (!address) return null;

  if (
    typeof address.latitude === "number" &&
    Number.isFinite(address.latitude) &&
    typeof address.longitude === "number" &&
    Number.isFinite(address.longitude)
  ) {
    return { lat: address.latitude, lng: address.longitude };
  }

  const wardCentroid = address.ward ? getWardCentroid(address.ward) : null;
  if (!wardCentroid) return null;

  return { lat: wardCentroid[1], lng: wardCentroid[0] };
};

export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }

  return `${km.toFixed(1)}km`;
};

export const findNearestStore = <T extends {
  location?: { coordinates?: number[] };
}>(
  addressCoordinates: { lat: number; lng: number } | null,
  stores: T[],
): { store: T; distance: number } | null => {
  if (!addressCoordinates || stores.length === 0) return null;

  let nearest: { store: T; distance: number } | null = null;

  for (const store of stores) {
    const coordinates = store.location?.coordinates;
    if (!coordinates || coordinates.length !== 2) continue;

    const [storeLng, storeLat] = coordinates;
    if (!Number.isFinite(storeLat) || !Number.isFinite(storeLng)) continue;

    const distance = calculateDistance(
      addressCoordinates.lat,
      addressCoordinates.lng,
      storeLat,
      storeLng,
    );

    if (!nearest || distance < nearest.distance) {
      nearest = { store, distance };
    }
  }

  return nearest;
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
  const fee = Math.round((baseDeliveryFee + feePerKm * distance) / 2);
  return { fee, blocked: false, zone: isInner ? "inner" : "outer", distance };
}
