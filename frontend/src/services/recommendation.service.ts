import { apiClient } from '@/lib/api-client';
import type { Product } from '@/types/product';

export interface AIRecommendation {
    product: Product;
    aiReason: string;
    healthScore: number;
    explanation?: {
        reason: string;
        algorithmVersion: string;
        finalScore: number;
        scoreBreakdown: Record<string, number>;
        matchedSignals: string[];
    };
}

export interface SafeFoodsResponse {
    data: Product[];
    filters: {
        allergies: string[];
        dietary: string[];
        healthGoals: string[];
    };
    stats: {
        total: number;
        safe: number;
        excluded: number;
    };
    message: string;
}

const recommendationService = {
    getPersonalizedRecommendations: (params?: { storeId?: string; refresh?: boolean }) => {
        return apiClient.get<{ data: AIRecommendation[] }>('/products/recommendations', { params });
    },
    getAIRecommendations: (params?: { storeId?: string; refresh?: boolean }) => {
        return apiClient.get<{ data: AIRecommendation[] }>('/products/recommendations', { params });
    },
    getSafeFoods: (params?: { storeId?: string; refresh?: boolean }) => {
        return apiClient.get<SafeFoodsResponse>('/products/safe-foods', { params });
    },
};

export default recommendationService;
