import apiClient from '@/lib/api-client';

export interface StaffConversationSummary {
    id: string;
    orderCode: string;
    orderId: string;
    customerName: string;
    lastMessage?: {
        content: string;
        imageUrl?: string;
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
    imageUrl?: string;
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
    imageUrl?: string;
}

export interface SendMessageResponse {
    message: SupportMessage;
}

export interface SupportSettings {
    id?: string;
    userId?: string;
    welcomeMessage?: {
        enabled: boolean;
        content: string;
    };
    outOfOffice?: {
        enabled: boolean;
        message: string;
        schedule: {
            days: string[];
            startTime: string;
            endTime: string;
        };
    };
    quickReplies?: Array<{
        shortcut: string;
        content: string;
    }>;
    createdAt?: string;
    updatedAt?: string;
}

const staffSupportChatService = {
    listConversations(params?: { storeId?: string }) {
        return apiClient.get<ListConversationsResponse>('/support/staff/conversations', { params });
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
        return apiClient.get<{ settings: SupportSettings }>('/support/settings');
    },

    updateSettings(settings: Omit<SupportSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
        return apiClient.post<{ settings: SupportSettings }>('/support/settings', settings);
    },

    uploadImage(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post<{ success: boolean; data: { secureUrl: string } }>('/files/upload?ownerType=review', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

export default staffSupportChatService;

