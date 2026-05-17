import { useEffect, useState } from 'react';
import staffSupportChatService, {
    type StaffConversationSummary,
    type SupportMessage,
} from '@/services/support-chat-staff.service';
import { useSupportRealtime } from '@/hooks/useSupportRealtime';

export function useStaffSupportChat() {
    const [conversations, setConversations] = useState<StaffConversationSummary[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConversations = async () => {
        try {
            setLoadingConversations(true);
            const res = await staffSupportChatService.listConversations();
            setConversations(res.data.conversations);
            if (!selectedConversationId && res.data.conversations.length > 0) {
                setSelectedConversationId(res.data.conversations[0].id);
            }
        } catch (err: any) {
            console.error('Failed to load conversations', err);
            setError(err?.response?.data?.message || 'Không thể tải danh sách hội thoại');
        } finally {
            setLoadingConversations(false);
        }
    };

    useEffect(() => {
        void fetchConversations();
    }, []);

    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedConversationId) return;
            try {
                setLoadingMessages(true);
                const res = await staffSupportChatService.getMessages(selectedConversationId);
                setMessages(res.data.messages);

                // Mark conversation as read when opened
                void staffSupportChatService.markAsRead(selectedConversationId);
            } catch (err: any) {
                console.error('Failed to load messages', err);
                setError(err?.response?.data?.message || 'Không thể tải tin nhắn');
            } finally {
                setLoadingMessages(false);
            }
        };
        void loadMessages();
    }, [selectedConversationId]);

    useSupportRealtime(selectedConversationId, (msg) => {
        setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
    });

    const sendMessage = async (content: string, image_url?: string) => {
        if (!selectedConversationId || (!content.trim() && !image_url)) return;
        try {
            setSending(true);
            setError(null);
            const res = await staffSupportChatService.sendMessage(selectedConversationId, {
                content: content.trim(),
                image_url
            });
            // Optimistically add the sent message for the sender.
            // The socket handler deduplicates by `id`, so no double if socket also delivers it.
            setMessages((prev) => {
                if (prev.some((m) => m.id === res.data.message.id)) return prev;
                return [...prev, res.data.message];
            });
        } catch (err: any) {
            console.error('Failed to send message', err);
            setError(err?.response?.data?.message || 'Không thể gửi tin nhắn');
            throw err;
        } finally {
            setSending(false);
        }
    };

    const closeConversation = async (id: string = selectedConversationId!) => {
        if (!id) return;
        try {
            await staffSupportChatService.closeConversation(id);
            setConversations((prev) => prev.map(c => c.id === id ? { ...c, status: 'closed' } : c));
        } catch (err) {
            console.error('Failed to close conversation', err);
        }
    };

    return {
        conversations,
        selectedConversationId,
        setSelectedConversationId,
        messages,
        loadingConversations,
        loadingMessages,
        sending,
        error,
        fetchConversations,
        sendMessage,
        closeConversation,
    };
}

