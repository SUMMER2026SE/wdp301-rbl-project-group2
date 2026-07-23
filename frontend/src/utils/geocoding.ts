import type { AuthAddress } from "@/store/authStore";

export type MapCoordinates = { lat: number; lng: number };

export interface AddressSuggestion {
  id: string;
  label: string;
  detail: string;
  secondary: string;
  coordinates?: MapCoordinates;
  ward?: string;
}

interface PhotonFeature {
  geometry?: {
    coordinates?: unknown;
  };
  properties?: {
    osm_type?: string;
    osm_id?: string | number;
    housenumber?: string;
    street?: string;
    name?: string;
    suburb?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface NominatimResult {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const DANANG_LAT = "16.0544";
const DANANG_LNG = "108.2022";
const LEADING_HOUSE_NUMBER_REGEX = /^\s*([0-9]+[0-9A-Za-z/-]*)\b/;
const STREET_SEARCH_MIN_LENGTH = 2;
const STREET_PREFIX_EXPANSIONS: Record<string, string[]> = {
  ba: ["Bạch", "Bà"],
  bu: ["Bùi"],
  ca: ["Cách Mạng", "Cao"],
  chu: ["Chu"],
  di: ["Điện Biên"],
  do: ["Đống Đa", "Đỗ", "Đoàn"],
  du: ["Duy Tân"],
  ha: ["Hải Phòng", "Hàm Nghi", "Hoàng"],
  ho: ["Hoàng", "Hồ", "Hùng"],
  hu: ["Huỳnh", "Hùng"],
  le: ["Lê"],
  ly: ["Lý"],
  ng: ["Nguyễn"],
  ngu: ["Nguyễn"],
  ph: ["Phan", "Phạm"],
  ton: ["Tôn"],
  tr: ["Trần", "Trưng"],
  tran: ["Trần"],
  vo: ["Võ"],
};

const normalizeLookupText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const buildPhotonUrl = (query: string, limit: number) => {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lang", "vi");
  url.searchParams.set("lat", DANANG_LAT);
  url.searchParams.set("lon", DANANG_LNG);
  return url;
};

const buildNominatimUrl = (query: string, limit: number) => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "vn");
  url.searchParams.set("accept-language", "vi");
  url.searchParams.set("viewbox", "107.8,16.35,108.65,15.75");
  return url;
};

const getLeadingHouseNumber = (query: string) =>
  query.match(LEADING_HOUSE_NUMBER_REGEX)?.[1]?.trim() ?? "";

const stripLeadingHouseNumber = (query: string) =>
  query.replace(LEADING_HOUSE_NUMBER_REGEX, "").trim();

const hasStreetSearchText = (detail: string) => {
  const withoutHouseNumber = stripLeadingHouseNumber(detail);
  const compactText = normalizeLookupText(withoutHouseNumber).replace(
    /\s+/g,
    "",
  );
  return (
    /[a-z]/.test(normalizeLookupText(withoutHouseNumber)) &&
    compactText.length >= STREET_SEARCH_MIN_LENGTH
  );
};

const getStreetSearchTokens = (detail: string) =>
  normalizeLookupText(stripLeadingHouseNumber(detail))
    .split(" ")
    .filter(Boolean);

const buildDetailSearchVariants = (detail: string) => {
  const cleanDetail = detail.trim();
  const houseNumber = getLeadingHouseNumber(cleanDetail);
  const streetText = stripLeadingHouseNumber(cleanDetail);
  const tokens = getStreetSearchTokens(cleanDetail);
  const lastToken = tokens.at(-1);
  const expansions = lastToken ? STREET_PREFIX_EXPANSIONS[lastToken] ?? [] : [];

  const expandedDetails = expansions.map((expansion) => {
    const expandedStreet = streetText.replace(/\S+\s*$/, expansion).trim();
    return [houseNumber, expandedStreet].filter(Boolean).join(" ");
  });

  return Array.from(new Set([cleanDetail, ...expandedDetails].filter(Boolean)));
};

const suggestionMatchesTypedStreet = (
  suggestion: AddressSuggestion,
  typedDetail: string,
) => {
  const tokens = getStreetSearchTokens(typedDetail);
  if (tokens.length === 0) return false;

  const streetText = normalizeLookupText(
    stripLeadingHouseNumber(suggestion.detail || suggestion.label),
  );
  const streetWords = streetText.split(" ").filter(Boolean);

  return tokens.every((token) =>
    streetWords.some(
      (word) =>
        word.startsWith(token) || (token.length >= 4 && word.includes(token)),
    ),
  );
};

const suggestionMatchesSelectedCity = (
  suggestion: AddressSuggestion,
  city?: string | null,
) => {
  const normalizedCity = normalizeLookupText(String(city ?? ""));
  if (!normalizedCity) return true;

  const locationText = normalizeLookupText(
    [suggestion.secondary, suggestion.label].join(" "),
  );
  return locationText.includes(normalizedCity);
};

export const canSearchAddressSuggestions = (address: Partial<AuthAddress>) =>
  hasStreetSearchText(String(address.detail ?? ""));

export const buildAddressSearchQueries = (
  address: Partial<AuthAddress>,
): string[] => {
  const detail = String(address.detail ?? "").trim();
  if (!hasStreetSearchText(detail)) return [];

  const ward = String(address.ward ?? "").trim();
  const city = String(address.city ?? "").trim();
  const country = "Vietnam";
  const queries = buildDetailSearchVariants(detail).flatMap((detailVariant) =>
    [
      [detailVariant, ward, city, country],
      [detailVariant, city, country],
      [detailVariant, country],
    ]
      .map((parts) => parts.filter(Boolean).join(", "))
      .filter(Boolean),
  );

  return Array.from(new Set(queries));
};

const withTypedHouseNumber = (detail: string, query: string) => {
  const cleanDetail = detail.trim();
  const houseNumber = getLeadingHouseNumber(query);
  if (!houseNumber || !cleanDetail) return cleanDetail;

  const normalizedDetail = cleanDetail.toLowerCase();
  if (normalizedDetail.startsWith(houseNumber.toLowerCase())) {
    return cleanDetail;
  }

  return `${houseNumber} ${cleanDetail}`;
};

const buildOpenStreetMapQueryVariants = (query: string) => {
  const cleanQuery = query.trim();
  const withoutHouseNumber = stripLeadingHouseNumber(cleanQuery);
  const variants = [cleanQuery, withoutHouseNumber].filter(Boolean);
  return Array.from(new Set(variants));
};

const normalizePhotonFeature = (
  feature: PhotonFeature,
  query: string,
): AddressSuggestion | null => {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const [lng, lat] = coordinates.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const props = feature?.properties ?? {};
  if (!String(props.street ?? "").trim()) return null;

  const streetAddress = [props.housenumber, props.street]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const rawDetail = streetAddress || String(props.name ?? "").trim();
  const detail = withTypedHouseNumber(rawDetail, query);
  const ward = String(props.suburb ?? "").trim();
  const secondary = [
    props.suburb,
    props.district,
    props.city,
    props.state,
    props.country,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const label = [detail, secondary].filter(Boolean).join(", ");

  if (!label) return null;

  return {
    id: `${props.osm_type ?? "place"}-${props.osm_id ?? `${lat}-${lng}`}`,
    label,
    detail,
    secondary,
    ward,
    coordinates: { lat, lng },
  };
};

const normalizeNominatimResult = (
  result: NominatimResult,
  query: string,
): AddressSuggestion | null => {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const address = result.address ?? {};
  if (!String(address.road ?? "").trim()) return null;

  const streetAddress = [address.house_number, address.road]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const rawDetail =
    streetAddress ||
    String(result.name ?? "").trim() ||
    String(result.display_name ?? "").split(",")[0]?.trim();
  const detail = withTypedHouseNumber(rawDetail, query);
  const ward =
    String(address.suburb ?? "").trim() ||
    String(address.quarter ?? "").trim() ||
    String(address.neighbourhood ?? "").trim();
  const secondary =
    [
      address.neighbourhood,
      address.suburb,
      address.quarter,
      address.city_district,
      address.city,
      address.state,
      address.country,
    ]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(", ") || String(result.display_name ?? "");
  const label = [detail, secondary].filter(Boolean).join(", ");

  if (!label) return null;

  return {
    id: `nominatim-${result.place_id ?? `${lat}-${lng}`}`,
    label,
    detail,
    secondary,
    ward,
    coordinates: { lat, lng },
  };
};

const searchPhotonSuggestions = async (
  query: string,
  signal: AbortSignal,
  limit: number,
) => {
  const response = await fetch(buildPhotonUrl(query, limit).toString(), {
    signal,
  });
  if (!response.ok) return [];

  const data = await response.json();
  const features: PhotonFeature[] = Array.isArray(data?.features)
    ? data.features
    : [];

  return features
    .map((feature) => normalizePhotonFeature(feature, query))
    .filter((item): item is AddressSuggestion => Boolean(item));
};

const searchNominatimSuggestions = async (
  query: string,
  signal: AbortSignal,
  limit: number,
) => {
  const response = await fetch(buildNominatimUrl(query, limit).toString(), {
    signal,
  });
  if (!response.ok) return [];

  const data = await response.json();
  const results: NominatimResult[] = Array.isArray(data) ? data : [];

  return results
    .map((result) => normalizeNominatimResult(result, query))
    .filter((item): item is AddressSuggestion => Boolean(item));
};

export const searchAddressSuggestions = async (
  query: string,
  signal: AbortSignal,
  limit = 5,
): Promise<AddressSuggestion[]> => {
  const suggestionsById = new Map<string, AddressSuggestion>();
  const seenLabels = new Set<string>();

  for (const variant of buildOpenStreetMapQueryVariants(query)) {
    if (signal.aborted || suggestionsById.size >= limit) break;

    const suggestions = [
      ...(await searchPhotonSuggestions(variant, signal, limit).catch(() => [])),
      ...(await searchNominatimSuggestions(variant, signal, limit).catch(
        () => [],
      )),
    ];

    suggestions.forEach((suggestion) => {
      const labelKey = suggestion.label.trim().toLowerCase();
      if (suggestionsById.size < limit && !seenLabels.has(labelKey)) {
        seenLabels.add(labelKey);
        suggestionsById.set(suggestion.id, suggestion);
      }
    });
  }

  return Array.from(suggestionsById.values());
};

export const searchAddressSuggestionsForAddress = async (
  address: Partial<AuthAddress>,
  signal: AbortSignal,
  limit = 5,
): Promise<AddressSuggestion[]> => {
  const suggestionsById = new Map<string, AddressSuggestion>();
  const seenLabels = new Set<string>();

  for (const query of buildAddressSearchQueries(address)) {
    if (signal.aborted || suggestionsById.size >= limit) break;

    const suggestions = await searchAddressSuggestions(query, signal, limit);
    suggestions
      .filter(
        (suggestion) =>
          suggestionMatchesSelectedCity(suggestion, address.city) &&
          suggestionMatchesTypedStreet(suggestion, String(address.detail ?? "")),
      )
      .forEach((suggestion) => {
        const labelKey = suggestion.label.trim().toLowerCase();
        if (suggestionsById.size < limit && !seenLabels.has(labelKey)) {
          seenLabels.add(labelKey);
          suggestionsById.set(suggestion.id, suggestion);
        }
      });
  }

  return Array.from(suggestionsById.values());
};

export const resolveAddressSuggestionDetails = async (
  suggestion: AddressSuggestion,
): Promise<AddressSuggestion> => suggestion;
