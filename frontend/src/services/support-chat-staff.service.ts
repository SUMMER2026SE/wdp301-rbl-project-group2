import apiClient from '@/lib/api-client';

export interface StaffConversationSummary {
    id: string;
    orderCode: string;
    orderId: string;
    customerName: string;
    lastMessage?: {
        content: string;
        image_url?: string;
        createdAt: string;
        senderType: 'USER' | 'STAFF';
    };
    unreadCount: number;
    status: 'open' | 'closed';
    createdAt: string;
}

export interface SupportMessage {
    id: string;
    conversationId: string;
    senderType: 'USER' | 'STAFF';
    senderId: string;
    content: string;
    image_url?: string;
    createdAt: string;
    isRead: boolean;
}

export interface ListConversationsResponse {
    conversations: StaffConversationSummary[];
}

export interface GetMessagesResponse {
    messages: SupportMessage[];
}

export interface SendMessagePayload {
    content: string;
    image_url?: string;
}

export interface SendMessageResponse {
    message: SupportMessage;
}

const staffSupportChatService = {
    listConversations() {
        return apiClient.get<ListConversationsResponse>('/support/staff/conversations');
    },

    getMessages(conversationId: string) {
        return apiClient.get<GetMessagesResponse>(`/support/conversations/${conversationId}/messages`);
    },

    sendMessage(conversationId: string, payload: SendMessagePayload) {
        return apiClient.post<SendMessageResponse>(`/support/conversations/${conversationId}/messages`, payload);
    },

    markAsRead(conversationId: string) {
        return apiClient.patch(`/support/conversations/${conversationId}/read`);
    },

    closeConversation(conversationId: string) {
        return apiClient.patch(`/support/conversations/${conversationId}/close`);
    },

    getSettings() {
        return apiClient.get<{ settings: any }>('/support/settings');
    },

    updateSettings(settings: any) {
        return apiClient.post<{ settings: any }>('/support/settings', settings);
    },

    uploadImage(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post<{ secure_url: string }>('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

export default staffSupportChatService;

