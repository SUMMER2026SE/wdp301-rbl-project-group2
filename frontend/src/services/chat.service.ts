import apiClient from '@/lib/api-client';

export interface ChatMessage {
    role: 'user';
    content: string;
}

export interface ChatOrderCard {
    _id: string;
    code: string;
    status: string;
    totalPrice: number;
    createdAt: string;
    firstItemName?: string;
    itemCount: number;
}

export interface ChatRecommendedProduct {
    _id: string;
    name: string;
    price: number;
    originalPrice?: number;
    discountPercentage?: number;
    campaignName?: string;
    campaignEndTime?: string;
    image?: string;
    category?: string;
    description?: string;
}

interface SendChatOptions {
    clientMessageId?: string;
    conversationId?: string;
    storeId?: string;
    fulfillmentType?: 'delivery' | 'pickup' | 'dine_in';
}

export const sendChatMessage = async (message: string, history: ChatMessage[], options: SendChatOptions = {}) => {
    const response = await apiClient.post('/chat', {
        message,
        clientMessageId: options.clientMessageId,
        conversationId: options.conversationId,
        storeId: options.storeId,
        fulfillmentType: options.fulfillmentType,
        history,
    });
    return {
        response: response.data.response,
        recommendedProducts: response.data.recommendedProducts || [],
        orderCards: response.data.orderCards || []
    };
};
