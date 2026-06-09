import { apiClient } from "@/lib/api-client";

export interface Ingredient {
  id: string;
  _id: string;
  name: string;
  description?: string;
  allergenTags: string[];
  allergenSuggestion?: {
    suggestedTags: string[];
    confidence: number;
    reason: string;
    suggestedAt?: string;
  } | null;
  allergenReviewStatus?: "pending" | "reviewed" | "rejected";
  allergenConfidence?: number | null;
  allergenSource?: "manual" | "ai" | "ai_confirmed";
  usedInProducts: number;
}

export interface AllergenSuggestion {
  suggestedTags: string[];
  confidence: number;
  reason: string;
  source: "ai" | "fallback";
}

export interface AllergenCatalogItem {
  id: string;
  label: string;
  aliases: string[];
}

export interface IngredientPayload {
  name: string;
  description?: string;
  allergenTags: string[];
}

const ingredientService = {
  async list() {
    const response = await apiClient.get<{ data: Ingredient[] }>("/ingredients");
    return response.data.data;
  },

  async create(payload: IngredientPayload) {
    const response = await apiClient.post<{ data: Ingredient }>("/ingredients", payload);
    return response.data.data;
  },

  async update(id: string, payload: Partial<IngredientPayload>) {
    const response = await apiClient.patch<{ data: Ingredient }>(`/ingredients/${id}`, payload);
    return response.data.data;
  },

  async remove(id: string) {
    const response = await apiClient.delete<{ data: { id: string } }>(`/ingredients/${id}`);
    return response.data.data;
  },

  async suggestAllergens(payload: { name: string; description?: string }) {
    const response = await apiClient.post<{ data: AllergenSuggestion }>("/ingredients/suggest-allergens", payload);
    return response.data.data;
  },

  async listAllergens() {
    const response = await apiClient.get<{ data: AllergenCatalogItem[] }>("/allergens");
    return response.data.data;
  },
};

export default ingredientService;
