import apiClient from '@/lib/api-client';

export interface SupportConversation {
    id: string;
    orderId: string;
    storeId?: string;
    status: 'open' | 'closed';
    createdAt: string;
    updatedAt: string;
}

export interface SupportMessage {
    id: string;
    conversationId: string;
    senderType: 'USER' | 'STAFF';
    senderId: string;
    content: string;
    createdAt: string;
    isRead: boolean;
}

export interface CreateConversationPayload {
    orderId?: string;
}

export interface CreateConversationResponse {
    conversation: SupportConversation;
}

export interface GetMessagesResponse {
    messages: SupportMessage[];
}

export interface SendMessagePayload {
    content: string;
}

export interface SendMessageResponse {
    message: SupportMessage;
}

const supportChatService = {
    createOrGetConversation(payload: CreateConversationPayload) {
        return apiClient.post<CreateConversationResponse>('/support/conversations', payload);
    },

    getMessages(conversationId: string) {
        return apiClient.get<GetMessagesResponse>(`/support/conversations/${conversationId}/messages`);
    },

    listConversations() {
        return apiClient.get<{ conversations: any[] }>('/support/conversations');
    },

    sendMessage(conversationId: string, payload: SendMessagePayload) {
        return apiClient.post<SendMessageResponse>(`/support/conversations/${conversationId}/messages`, payload);
    },

    markAsRead(conversationId: string) {
        return apiClient.patch(`/support/conversations/${conversationId}/read`);
    },
};

export default supportChatService;


