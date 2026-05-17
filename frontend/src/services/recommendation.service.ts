import { apiClient } from '@/lib/api-client';
import type { Product } from '@/types/product';

export interface AIRecommendation {
    product: Product;
    aiReason: string;
    healthScore: number;
}

export interface SafeFoodsResponse {
    data: Product[];
    filters: {
        allergies: string[];
        dietary: string[];
        health_goals: string[];
    };
    stats: {
        total: number;
        safe: number;
        excluded: number;
    };
    message: string;
}

const recommendationService = {
    getAIRecommendations: () => {
        return apiClient.get<{ data: AIRecommendation[] }>('/products/recommendations');
    },
    getSafeFoods: () => {
        return apiClient.get<SafeFoodsResponse>('/products/safe-foods');
    },
};

export default recommendationService;
