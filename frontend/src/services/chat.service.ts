import apiClient from '@/lib/api-client';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export const sendChatMessage = async (message: string, history: ChatMessage[]) => {
    const response = await apiClient.post('/chat', {
        message,
        history,
    });
    return {
        response: response.data.response,
        recommendedProducts: response.data.recommendedProducts || []
    };
};
