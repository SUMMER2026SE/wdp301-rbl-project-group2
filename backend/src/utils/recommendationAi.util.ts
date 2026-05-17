import { filterSafeProducts } from '@/utils/healthFilter';

export type AiRecommendationRow = { productId: string; reason: string; healthScore: number };

function clampHealthScore(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 7;
  return Math.max(1, Math.min(10, Math.round(x)));
}

export function normalizeAiRecommendations(raw: unknown): AiRecommendationRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && (r as any).productId != null && String((r as any).productId).trim())
    .map((r) => {
      const row = r as any;
      const reason =
        typeof row.reason === 'string' && row.reason.trim()
          ? row.reason.trim().slice(0, 220)
          : 'Phù hợp với hồ sơ sức khỏe của bạn';
      return {
        productId: String(row.productId).trim(),
        reason,
        healthScore: clampHealthScore(row.healthScore),
      };
    });
}

const DEFAULT_MAX = 6;

/**
 * Giữ gợi ý chỉ từ ID đã gửi cho AI, xác minh lại bằng filterSafeProducts.
 * Không ép đủ số lượng — chỉ trả các món thật sự an toàn (tối đa maxCount).
 */
export function sanitizeAiRecommendations(
  recommendations: unknown,
  ctx: {
    allowedIds: Set<string>;
    preferences: { dietary: string[]; allergies: string[]; health_goals: string[] };
    fetchedProducts: any[];
    maxCount?: number;
  }
): AiRecommendationRow[] {
  const maxCount = ctx.maxCount ?? DEFAULT_MAX;
  let recs = normalizeAiRecommendations(recommendations);
  recs = recs.filter((r) => ctx.allowedIds.has(r.productId));

  const productById = new Map(ctx.fetchedProducts.map((p) => [p._id.toString(), p]));
  const verified: AiRecommendationRow[] = [];
  const seen = new Set<string>();

  for (const r of recs) {
    if (seen.has(r.productId)) continue;
    const p = productById.get(r.productId);
    if (!p) continue;
    if (filterSafeProducts([p], ctx.preferences).length !== 1) continue;
    verified.push(r);
    seen.add(r.productId);
    if (verified.length >= maxCount) break;
  }

  return verified;
}

/** @deprecated Dùng sanitizeAiRecommendations — không còn backfill ép đủ slot */
export const sanitizeAndBackfillRecommendations = sanitizeAiRecommendations;
