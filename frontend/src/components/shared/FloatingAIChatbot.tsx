import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { sendChatMessage, type ChatMessage as ChatServiceMessage, type ChatOrderCard } from '@/services/chat.service';
import { useNavigate, useLocation } from 'react-router-dom';

// ---- Types ----

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    recommendedProducts?: any[];
    orderCards?: ChatOrderCard[];
}

const CHAT_HISTORY_LIMIT = 12;

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
};

// Simple Markdown parser to avoid React 19 JSX namespace conflicts with react-markdown
function SimpleMarkdown({ children }: { children: string }) {
    if (!children) return null;
    const paragraphs = children.split('\n');
    return (
        <div className="space-y-1">
            {paragraphs.map((p, idx) => {
                if (p.trim().startsWith('- ')) {
                    const text = p.trim().substring(2);
                    return (
                        <ul key={idx} className="list-disc pl-4 my-0.5 space-y-0.5">
                            <li className="text-inherit">
                                {parseBold(text)}
                            </li>
                        </ul>
                    );
                }
                return (
                    <p key={idx} className="my-0.5 leading-relaxed text-inherit">
                        {parseBold(p)}
                    </p>
                );
            })}
        </div>
    );
}

function parseBold(text: string) {
    const parts = text.split('**');
    return parts.map((part, index) => {
        if (index % 2 === 1) {
            return <strong key={index} className="font-bold">{part}</strong>;
        }
        return part;
    });
}

// ---- Component ----

import { useAuth } from '@/hooks/useAuth';

export function FloatingAIChatbot() {
    const { t } = useTranslation(['customer', 'common']);
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(() => {
        return sessionStorage.getItem('foa_chatbot_open') === 'true';
    });
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = sessionStorage.getItem('foa_chatbot_messages');
        return saved ? JSON.parse(saved) : [];
    });
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const prevPathname = useRef(location.pathname);

    const guestMessageCount = messages.filter(m => msgRoleIsUser(m)).length;
    const isGuest = !user;
    const isLimitReached = isGuest && guestMessageCount >= 5;

    // Helper to bypass TS strict check on msg role
    function msgRoleIsUser(m: Message): boolean {
        return m.role === 'user';
    }

    // Save state to sessionStorage to persist on page changes
    useEffect(() => {
        sessionStorage.setItem('foa_chatbot_open', String(isOpen));
    }, [isOpen]);

    useEffect(() => {
        sessionStorage.setItem('foa_chatbot_messages', JSON.stringify(messages));
    }, [messages]);

    // Auto-scroll to bottom, triggered on messages, typing, route changes, or opening chat
    useEffect(() => {
        if (isOpen && chatContainerRef.current) {
            const isPathChange = prevPathname.current !== location.pathname;
            prevPathname.current = location.pathname;

            const scroll = () => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            };

            // If it's a page transition, force instant scroll to bottom to override browser's scrollTo(0,0)
            if (isPathChange) {
                scroll();
                // Double check after a small delay to make sure route transition didn't reset it
                const doubleCheckTimer = setTimeout(scroll, 50);
                const tripleCheckTimer = setTimeout(scroll, 150);
                return () => {
                    clearTimeout(doubleCheckTimer);
                    clearTimeout(tripleCheckTimer);
                };
            } else {
                // Otherwise do a smooth scroll for new messages
                const timer = setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
                return () => clearTimeout(timer);
            }
        }
    }, [messages, isTyping, location.pathname, isOpen]);

    // Handle horizontal mouse wheel scrolling for desktop users
    const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY;
        }
    };

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Send greeting on first open
    const handleOpen = () => {
        setIsOpen(true);
        if (messages.length === 0) {
            const userName = user?.username || '';
            const greeting = userName
                ? `Xin chào ${userName}! 👋 Tôi là trợ lý AI của FoodieDash. Tôi đã nắm rõ hồ sơ sức khỏe của bạn và sẵn sàng gợi ý những món ăn an toàn nhất cho bạn hôm nay. Bạn cần tôi tư vấn gì nào?`
                : t('customer:chatbot.greeting');

            setMessages([{
                id: '1',
                role: 'assistant',
                content: greeting,
                timestamp: new Date(),
            }]);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsgContent = input.trim();
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: userMsgContent,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            // Chỉ gửi lại lời người dùng; assistant history trong sessionStorage không còn là nguồn đáng tin cho backend.
            const history: ChatServiceMessage[] = messages
                .filter((msg) => msg.role === 'user')
                .slice(-CHAT_HISTORY_LIMIT)
                .map(msg => ({
                    role: 'user',
                    content: msg.content
                }));

            const result = await sendChatMessage(userMsgContent, history, {
                clientMessageId: userMessage.id,
            });
 
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.response,
                recommendedProducts: result.recommendedProducts,
                orderCards: result.orderCards,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error: any) {
            console.error('Chat error details:', error);
            const errorText = error.response?.data?.message || 'Xin lỗi, tôi gặp chút trục trặc. Bạn vui lòng thử lại sau nhé!';
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errorText,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Chat Drawer */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-card rounded-3xl shadow-2xl shadow-black/10 border border-border flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">{t('customer:chatbot.title')}</h3>
                                <p className="text-[10px] text-white/80 font-medium">
                                    {t('customer:chatbot.subtitle')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    {/* Messages */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/30">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-orange-500 text-white rounded-br-lg'
                                        : 'bg-white dark:bg-slate-800 text-foreground border border-slate-100 shadow-sm rounded-bl-lg'
                                        }`}
                                >
                                    <SimpleMarkdown>
                                        {msg.content}
                                    </SimpleMarkdown>
                                </div>
                                {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                                    <div 
                                        onWheel={handleHorizontalWheel}
                                        className="max-w-[90%] mt-2 flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent hover:scrollbar-thumb-orange-500/40 transition-colors"
                                    >
                                        {msg.recommendedProducts.map((product) => (
                                            <div key={product._id} className="min-w-[140px] max-w-[140px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2 flex flex-col justify-between shadow-sm">
                                                {product.image && (
                                                    <img src={product.image} alt={product.name} className="w-full h-16 object-cover rounded-lg mb-1.5" />
                                                )}
                                                <div className="flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-[11px] line-clamp-1 text-foreground leading-snug">{product.name}</h4>
                                                        <p className="text-[9px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">{product.description}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                                                        <span className="text-[10px] font-extrabold text-orange-500">
                                                            {product.price.toLocaleString()}đ
                                                        </span>
                                                        <button 
                                                            onClick={() => {
                                                                navigate(`/food/${product._id}`);
                                                            }}
                                                            className="text-[9px] bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                                        >
                                                            Xem
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {msg.orderCards && msg.orderCards.length > 0 && (
                                    <div
                                        onWheel={handleHorizontalWheel}
                                        className="max-w-[92%] mt-2 flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent hover:scrollbar-thumb-orange-500/40 transition-colors"
                                    >
                                        {msg.orderCards.map((order) => (
                                            <div key={order._id} className="min-w-[180px] max-w-[180px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-sm">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-[12px] text-foreground leading-snug truncate">{order.code}</h4>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(order.createdAt)}</p>
                                                    </div>
                                                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300 max-w-[76px] truncate">
                                                        {order.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-2">
                                                    {order.firstItemName || `${order.itemCount} món`}
                                                </p>
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                    <span className="text-[11px] font-extrabold text-orange-500">{formatCurrency(order.totalPrice)}</span>
                                                    <button
                                                        onClick={() => {
                                                            setIsOpen(false);
                                                            navigate(`/orders/${order._id}`);
                                                        }}
                                                        className="text-[9px] bg-orange-500 hover:bg-orange-600 text-white font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        Xem đơn
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 px-4 py-3 border border-slate-100 rounded-2xl rounded-bl-lg flex items-center gap-1.5 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="px-4 py-3 border-t border-border bg-white dark:bg-slate-900 rounded-b-2xl">
                        {isLimitReached ? (
                            <div className="flex flex-col items-center text-center gap-2 py-1.5">
                                <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold leading-relaxed">
                                    Bạn đã dùng hết 5 lượt hỏi thử miễn phí. Hãy đăng ký hoặc đăng nhập để tiếp tục tư vấn sức khỏe & chọn món ăn!
                                </p>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/login');
                                    }}
                                    className="w-full text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-orange-500/20 active:scale-[0.98]"
                                >
                                    Đăng nhập ngay
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('customer:chatbot.placeholder')}
                                    className="flex-1 h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isTyping}
                                    className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/20 active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <button
                onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-90 ${isOpen
                    ? 'bg-slate-800 text-white rotate-0'
                    : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:shadow-orange-500/40 hover:shadow-2xl'
                    }`}
                aria-label={t('customer:chatbot.title')}
            >
                <span className="material-symbols-outlined text-[26px]">
                    {isOpen ? 'close' : 'smart_toy'}
                </span>
                {/* Pulse ring when closed */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-30" />
                )}
            </button>
        </>
    );
}
