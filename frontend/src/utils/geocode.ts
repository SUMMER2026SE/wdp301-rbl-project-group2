/**
 * Geocode utility — converts a detailed address string into [lng, lat] coordinates
 * using Nominatim (OpenStreetMap), which is free and requires no API key.
 *
 * Used by checkout flow to calculate accurate shipping distance from the
 * customer's actual address instead of the ward centroid fallback.
 */

const GEOCODE_CACHE = new Map<string, [number, number] | null>();

const REQUEST_DELAY_MS = 1100; // Nominatim rate limit: max 1 req/s

let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Geocode a full address into [lng, lat] coordinates via Nominatim.
 * Results are cached in-memory for the session.
 *
 * @returns [lng, lat] tuple, or null if geocoding failed
 */
export async function geocodeAddress(
  detail: string,
  ward: string,
  district: string,
  city: string,
): Promise<[number, number] | null> {
  const query = [detail, ward || "", district || "", city, "Việt Nam"]
    .filter(Boolean)
    .join(", ");

  const cacheKey = query.toLowerCase().trim();
  // Return cached result (including null = failed lookups)
  if (GEOCODE_CACHE.has(cacheKey)) return GEOCODE_CACHE.get(cacheKey)!;

  await throttle();

  try {
    const params = new URLSearchParams({
      format: "json",
      q: query,
      limit: "1",
      "accept-language": "vi",
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "FoodieDash-Checkout/1.0 (checkout@foodiedash.vn)",
        },
      },
    );

    if (!res.ok) {
      console.warn("Geocode non-OK status:", res.status);
      GEOCODE_CACHE.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].lon && data[0].lat) {
      const coords: [number, number] = [
        parseFloat(data[0].lon),
        parseFloat(data[0].lat),
      ];
      GEOCODE_CACHE.set(cacheKey, coords);
      return coords;
    }

    GEOCODE_CACHE.set(cacheKey, null);
    return null;
  } catch (err) {
    console.warn("Geocode address failed:", err);
    GEOCODE_CACHE.set(cacheKey, null);
    return null;
  }
}
