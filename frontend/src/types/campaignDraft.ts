export type CampaignSuggestionKind =
  | "scale"
  | "recover"
  | "bundle"
  | "maintain";

export type CampaignStoreReadiness = "ready" | "watch" | "not_ready";

export type CampaignDraftStoreBreakdown = {
  storeId: string;
  storeName: string;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  previousQuantitySold: number;
  growthPercent: number | null;
  readiness: CampaignStoreReadiness;
  reason: string;
};

export type CampaignDraft = {
  source: "admin-dashboard-product-performance";
  scope: "all_stores";
  productId: string;
  productName: string;
  suggestion: CampaignSuggestionKind;
  suggestionLabel: string;
  suggestionReason: string;
  suggestedDiscount: number;
  periodDays: 7 | 30 | 90;
  eligibleStoreCount: number;
  totalStoreCount: number;
  coveragePercent: number;
  averageGrowthPercent: number | null;
  storeBreakdown: CampaignDraftStoreBreakdown[];
};

export type CampaignNavigationState = {
  campaignDraft?: CampaignDraft;
};

const isValidSuggestion = (value: unknown): value is CampaignSuggestionKind => {
  return ["scale", "recover", "bundle", "maintain"].includes(String(value));
};

const isValidPeriodDays = (value: unknown): value is 7 | 30 | 90 => {
  return value === 7 || value === 30 || value === 90;
};

const isValidStoreBreakdown = (
  value: unknown,
): value is CampaignDraftStoreBreakdown[] => {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;

    const row = item as Partial<CampaignDraftStoreBreakdown>;

    return (
      typeof row.storeId === "string" &&
      row.storeId.length > 0 &&
      typeof row.storeName === "string" &&
      typeof row.quantitySold === "number" &&
      typeof row.orderCount === "number" &&
      typeof row.revenue === "number" &&
      typeof row.previousQuantitySold === "number" &&
      (typeof row.growthPercent === "number" || row.growthPercent === null) &&
      ["ready", "watch", "not_ready"].includes(String(row.readiness)) &&
      typeof row.reason === "string"
    );
  });
};

export const isCampaignDraft = (value: unknown): value is CampaignDraft => {
  if (!value || typeof value !== "object") return false;

  const draft = value as Partial<CampaignDraft>;

  return (
    draft.source === "admin-dashboard-product-performance" &&
    draft.scope === "all_stores" &&
    typeof draft.productId === "string" &&
    draft.productId.length > 0 &&
    typeof draft.productName === "string" &&
    isValidSuggestion(draft.suggestion) &&
    typeof draft.suggestionLabel === "string" &&
    typeof draft.suggestionReason === "string" &&
    typeof draft.suggestedDiscount === "number" &&
    draft.suggestedDiscount >= 0 &&
    draft.suggestedDiscount <= 100 &&
    isValidPeriodDays(draft.periodDays) &&
    typeof draft.eligibleStoreCount === "number" &&
    typeof draft.totalStoreCount === "number" &&
    typeof draft.coveragePercent === "number" &&
    (typeof draft.averageGrowthPercent === "number" ||
      draft.averageGrowthPercent === null) &&
    isValidStoreBreakdown(draft.storeBreakdown)
  );
};
