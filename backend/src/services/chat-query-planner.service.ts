import { ProductCategory } from '@/types/product.type';

export type ChatHealthNeed = 'diabetes_friendly' | 'low_fat' | 'healthy';
export type ChatExcludeTrait = 'hot' | 'sweet' | 'spicy';

export interface ChatSearchPlan {
  originalMessage: string;
  normalizedMessage: string;
  cleanedQuery: string;
  expandedQuery: string;
  budgetVnd: number | null;
  hasNoBudget: boolean;
  wantsCombo: boolean;
  requiresDrink: boolean;
  requiresFood: boolean;
  maxItems: number;
  preferredCategory?: string;
  includeTastes: string[];
  excludeTraits: ChatExcludeTrait[];
  healthNeeds: ChatHealthNeed[];
}

export const normalizeVietnameseText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

const unique = <T>(items: T[]) => [...new Set(items)];

const parseMoneyAmount = (rawAmount: string, unit?: string) => {
  const compactAmount = rawAmount.replace(/\s+/g, '');
  const hasMoneyUnit = ['vnd', 'd', 'dong'].includes(unit || '');
  const hasThousandGrouping = /^\d{1,3}([.,]\d{3})+$/.test(compactAmount);

  if (hasThousandGrouping || hasMoneyUnit) {
    const digitsOnly = compactAmount.replace(/[.,]/g, '');
    return Number(digitsOnly);
  }

  return Number(compactAmount.replace(/,/g, '.'));
};

const extractBudgetVnd = (message: string) => {
  const normalized = normalizeVietnameseText(message);
  const matches = normalized.matchAll(/\b(\d[\d.,\s]*\d|\d)\s*(k|nghin|ngan|canh|vnd|d|dong)?\b/g);

  for (const match of matches) {
    const unit = match[2];
    const amount = parseMoneyAmount(match[1], unit);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    if (['k', 'nghin', 'ngan', 'canh'].includes(unit || '')) return Math.round(amount * 1000);
    if (['vnd', 'd', 'dong'].includes(unit || '')) return Math.round(amount);
    if (!unit && amount >= 20 && amount <= 500) return Math.round(amount * 1000);
    if (!unit && amount >= 1000) return Math.round(amount);
  }

  return null;
};

const stripBudgetTerms = (message: string) => {
  const cleaned = message
    .replace(/\b(\d[\d.,\s]*\d|\d)\s*(k|nghìn|nghin|ngàn|ngan|cành|canh|vnd|đ|d|đồng|dong)?\b/gi, ' ')
    .replace(/\b(combo|mua được|mua duoc|ăn được|an duoc|gợi ý|goi y|chọn món|chon mon|món ăn|mon an|ăn gì|an gi|cho tôi|cho toi|tôi có|toi co|dưới|duoi|tối đa|toi da|ngân sách|ngan sach|khoảng|khoang|tầm|tam|có|co|cả|ca|và|va|đồ ăn|do an|đồ uống|do uong|nước uống|nuoc uong)\b/gi, ' ')
    .replace(/[đd]\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopwords = new Set([
    'toi', 'co', 'thi', 'gi', 'cho', 'mon', 'an', 'duoi', 'day', 'la', 'mot', 'so',
    'phu', 'hop', 'voi', 'cua', 'ban', 'minh', 'muon', 'can', 'ca', 'va', 'do', 'kem',
    'nuoc', 'uong',
  ]);

  return cleaned
    .split(/[,\s]+/)
    .filter((token) => {
      const normalizedToken = normalizeVietnameseText(token).replace(/[^a-z0-9]/g, '');
      return normalizedToken.length > 1 && !stopwords.has(normalizedToken);
    })
    .join(' ');
};

const extractMaxItems = (normalized: string) => {
  const match = normalized.match(/\b(\d+)\s*(mon|phan|combo)\b/);
  if (!match) return 3;
  const count = Number(match[1]);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 5) : 3;
};

const resolveCategory = (normalized: string) => {
  if (/\b(com|rice)\b/.test(normalized)) return ProductCategory.COM_DIA_TRUYEN_THONG;
  if (/\b(healthy|suc khoe|tot cho suc khoe|lanh manh|an kieng|diet|chay|vegan)\b/.test(normalized)) return ProductCategory.GOC_HEALTHY_AN_KIENG;
  if (/\b(kem|side|extra|goi them|an kem)\b/.test(normalized)) return ProductCategory.GOI_THEM_AN_KEM;
  if (/\b(khat|uong|nuoc|trang mieng|dessert|drink|beverage)\b/.test(normalized)) return ProductCategory.GIAI_KHAT_TRANG_MIENG;
  if (/\b(mon nuoc|soup|pho|bun|chao)\b/.test(normalized)) return ProductCategory.TRU_DANH_MON_NUOC;
  return undefined;
};

export const parseChatSearchPlan = (message: string): ChatSearchPlan => {
  const normalized = normalizeVietnameseText(message);
  const cleanedQuery = stripBudgetTerms(message);
  const budgetVnd = extractBudgetVnd(message);
  const hasNoBudget = /\b(khong co tien|het tien|chua co tien|khong du tien|khong co ngan sach|ngan sach 0|vi rong|chay tui|sach tien|can tien|0\s*(d|dong|vnd)?)\b/.test(normalized);
  const wantsCombo = /\b(combo|mua duoc|an duoc|goi y|chon mon|mon an|an gi|duoi|toi da|ngan sach|khoang|tam|co)\b/.test(normalized);
  const requiresDrink = /\b(do uong|nuoc uong|thuc uong|giai khat|kem nuoc|va nuoc|ca nuoc|nuoc va do an|nuoc voi do an)\b/.test(normalized);
  const requiresFood = /\b(do an|mon an|phan an|com|bun|pho|banh|salad|food|meal|ca nuoc va do an|nuoc va do an|nuoc voi do an)\b/.test(normalized);

  const includeTastes: string[] = [];
  if (/\bcay\b/.test(normalized)) includeTastes.push('cay');
  if (/\bngot\b/.test(normalized)) includeTastes.push('ngọt');
  if (/\bchua\b/.test(normalized)) includeTastes.push('chua');
  if (/\bthanh dam\b/.test(normalized)) includeTastes.push('thanh đạm');

  const excludeTraits: ChatExcludeTrait[] = [];
  if (/\b(khong|ko|k)\s+(phai\s+la\s+)?mon\s+nong\b/.test(normalized) || /\b(khong|ko|k)\s+nong\b/.test(normalized)) {
    excludeTraits.push('hot');
  }
  if (/\b(khong|ko|k)\s+ngot\b/.test(normalized)) excludeTraits.push('sweet');
  if (/\b(khong|ko|k)\s+cay\b/.test(normalized)) excludeTraits.push('spicy');

  const healthNeeds: ChatHealthNeed[] = [];
  if (/\b(tieu duong|dai thao duong|it duong|khong duong|giam duong|low sugar|diabetes|diabetic)\b/.test(normalized)) {
    healthNeeds.push('diabetes_friendly');
  }
  if (/\b(it beo|it dau|it dau mo|low fat)\b/.test(normalized)) healthNeeds.push('low_fat');
  if (/\b(healthy|suc khoe|tot cho suc khoe|lanh manh|an kieng|thanh dam)\b/.test(normalized)) healthNeeds.push('healthy');

  const expansionTerms = [
    ...includeTastes,
    healthNeeds.includes('diabetes_friendly') ? 'ít đường không đường thanh đạm healthy ít béo rau củ protein' : '',
    healthNeeds.includes('low_fat') ? 'ít béo ít dầu thanh đạm hấp luộc' : '',
    healthNeeds.includes('healthy') ? 'healthy tốt cho sức khỏe lành mạnh thanh đạm rau củ salad ức gà ít dầu' : '',
    excludeTraits.includes('hot') ? 'món lạnh món khô thanh mát' : '',
  ].filter(Boolean);

  const preferredCategory = healthNeeds.includes('diabetes_friendly')
    ? ProductCategory.GOC_HEALTHY_AN_KIENG
    : resolveCategory(normalized);

  return {
    originalMessage: message,
    normalizedMessage: normalized,
    cleanedQuery,
    expandedQuery: unique([cleanedQuery || message, ...expansionTerms]).join(' '),
    budgetVnd,
    hasNoBudget,
    wantsCombo,
    requiresDrink,
    requiresFood,
    maxItems: wantsCombo ? extractMaxItems(normalized) : 3,
    preferredCategory,
    includeTastes: unique(includeTastes),
    excludeTraits: unique(excludeTraits),
    healthNeeds: unique(healthNeeds),
  };
};
