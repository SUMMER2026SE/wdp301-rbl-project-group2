/**
 * Order Messages Component - Staff-Customer messaging for orders needing review
 */
import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";

export interface OrderMessage {
    id: string;
    sender: 'staff' | 'customer';
    senderName: string;
    message: string;
    timestamp: string;
}

interface OrderMessagesProps {
    orderId: string;
    messages: OrderMessage[];
    onSendMessage?: (message: string) => void;
}

export default function OrderMessages({ orderId, messages, onSendMessage }: OrderMessagesProps) {
    const [newMessage, setNewMessage] = useState("");

    const handleSend = () => {
        if (!newMessage.trim()) return;

        onSendMessage?.(newMessage);
        setNewMessage("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-white" />
                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">Trao đổi với nhà hàng</h3>
                    <p className="text-orange-100 text-xs">Đơn hàng {orderId}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto bg-gray-50">
                {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có tin nhắn nào</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.sender === 'customer'
                                        ? 'bg-orange-600 text-white rounded-br-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold ${msg.sender === 'customer' ? 'text-orange-100' : 'text-orange-600'
                                        }`}>
                                        {msg.senderName}
                                    </span>
                                    <span className={`text-[10px] ${msg.sender === 'customer' ? 'text-orange-200' : 'text-gray-400'
                                        }`}>
                                        {msg.timestamp}
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed">{msg.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Nhập tin nhắn của bạn..."
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim()}
                        className="px-5 h-[72px] rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Gửi</span>
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    💡 Nhấn Enter để gửi, Shift + Enter để xuống dòng
                </p>
            </div>
        </div>
    );
}
