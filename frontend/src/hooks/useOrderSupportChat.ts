import { useEffect, useState } from 'react';
import supportChatService, {
    type SupportMessage,
    type SupportConversation,
} from '@/services/support-chat.service';
import { useSupportRealtime } from '@/hooks/useSupportRealtime';

interface UseOrderSupportChatOptions {
    enabled?: boolean;
}

export function useOrderSupportChat(orderId?: string, options: UseOrderSupportChatOptions = {}) {
    const { enabled = true } = options;

    const [conversation, setConversation] = useState<SupportConversation | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const conversationId = conversation?.id ?? (conversation as any)?._id ?? null;

    useEffect(() => {
        if (!enabled) return;

        const init = async () => {
            try {
                setInitializing(true);
                setError(null);

                const payload = orderId ? { orderId } : {};
                const convRes = await supportChatService.createOrGetConversation(payload);
                const conv = convRes.data.conversation;
                setConversation(conv);

                const convId = conv?.id ?? (conv as any)?._id;
                if (!convId) {
                    throw new Error('Không nhận được ID cuộc trò chuyện từ server');
                }
                const msgRes = await supportChatService.getMessages(String(convId));
                setMessages(msgRes.data.messages);
            } catch (err: any) {
                console.error('Failed to init support chat', err);
                setError(err?.response?.data?.message || 'Không thể khởi tạo chat hỗ trợ');
            } finally {
                setInitializing(false);
            }
        };

        void init();
    }, [orderId, enabled]);

    useSupportRealtime(conversationId ? String(conversationId) : null, (msg) => {
        setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
    });

    const refreshMessages = async () => {
        if (!conversation) return;
        const convId = conversation.id ?? (conversation as any)?._id;
        if (!convId) return;
        try {
            setLoading(true);
            const msgRes = await supportChatService.getMessages(String(convId));
            setMessages(msgRes.data.messages);
        } catch (err: any) {
            console.error('Failed to refresh support messages', err);
            setError(err?.response?.data?.message || 'Không thể tải tin nhắn');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (content: string) => {
        if (!conversation || !content.trim()) return;
        const convId = conversation.id ?? (conversation as any)?._id;
        if (!convId) return;
        try {
            setSending(true);
            setError(null);
            const res = await supportChatService.sendMessage(String(convId), { content: content.trim() });
            const newMsg = res.data.message;
            // Optimistically add the sent message for the sender.
            // The socket handler deduplicates by `id`, so no double if socket also delivers it.
            setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        } catch (err: any) {
            console.error('Failed to send support message', err);
            setError(err?.response?.data?.message || 'Gửi tin nhắn thất bại, vui lòng thử lại');
            throw err;
        } finally {
            setSending(false);
        }
    };

    return {
        conversation,
        messages,
        loading,
        initializing,
        error,
        sending,
        refreshMessages,
        sendMessage,
    };
}

