import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    MessageCircle,
    Search,
    Loader2,
    Send,
    Smile,
    Image,
    Paperclip,
    MoreVertical,
    Package,
    MapPin,
    Phone,
    ChevronRight,
    ExternalLink,
    Settings,
    RefreshCw,
} from 'lucide-react';
import { useStaffSupportChat } from '@/hooks/useStaffSupportChat';
import orderService from '@/services/order.service';
import type { Order } from '@/services/order.service';
import staffSupportChatService from '@/services/support-chat-staff.service';
import toast from 'react-hot-toast';

const QUICK_REPLIES = [
    'Chào bạn!',
    'Sản phẩm còn hàng',
    'Đơn đang được giao',
    'Cảm ơn bạn!',
    'Vui lòng chờ chút ạ',
];

// Helper to wrap URLs in anchor tags
const linkify = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
        urlRegex.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline">
                {part}
            </a>
        ) : (
            <span key={i}>{part}</span>
        )
    );
};

function groupMessagesByDate(messages: { id: string; createdAt: string; senderType: string; content: string; image_url?: string }[]) {
    const groups: { date: string; messages: typeof messages }[] = [];
    let currentDate = '';
    for (const msg of messages) {
        const d = new Date(msg.createdAt);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (d.toDateString() === today.toDateString()) label = 'HÔM NAY';
        else if (d.toDateString() === yesterday.toDateString()) label = 'HÔM QUA';
        if (label !== currentDate) {
            currentDate = label;
            groups.push({ date: label, messages: [] });
        }
        groups[groups.length - 1].messages.push(msg);
    }
    return groups;
}

export default function StaffSupportChatPage() {
    const navigate = useNavigate();
    const {
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
    } = useStaffSupportChat();

    const [search, setSearch] = useState('');
    const [input, setInput] = useState('');
    const [showOrderPanel, setShowOrderPanel] = useState(false);
    const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
    const [orderDetail, setOrderDetail] = useState<Order | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(false);

    // Image Upload State
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const [searchParams] = useSearchParams();

    // Auto-select conversation matching ?orderId= query param
    useEffect(() => {
        const orderId = searchParams.get('orderId');
        if (!orderId || conversations.length === 0) return;
        const match = conversations.find((c) => c.orderId === orderId);
        if (match && selectedConversationId !== match.id) {
            setSelectedConversationId(match.id);
            setExpandedCustomers((prev) => prev[match.customerName] ? prev : { ...prev, [match.customerName]: true });
        }
    }, [conversations, searchParams, setSelectedConversationId, selectedConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load order detail when conversation changes
    useEffect(() => {
        const conv = conversations.find((c) => c.id === selectedConversationId);
        if (!conv?.orderId) {
            if (orderDetail) setOrderDetail(null);
            return;
        }
        setLoadingOrder(true);
        orderService.getOrderById(conv.orderId)
            .then((res) => setOrderDetail(res.data))
            .catch(() => setOrderDetail(null))
            .finally(() => setLoadingOrder(false));
    }, [selectedConversationId, conversations]);

    const handleSend = async (content?: string) => {
        const text = (content ?? input).trim();
        if ((!text && !selectedImage) || sending) return;

        let uploadedUrl: string | undefined = undefined;
        try {
            if (selectedImage) {
                const toastId = toast.loading('Đang tải ảnh lên...');
                const uploadRes = await staffSupportChatService.uploadImage(selectedImage);
                uploadedUrl = uploadRes.data.secure_url;
                toast.dismiss(toastId);
            }

            if (!content) {
                setInput('');
                setSelectedImage(null);
                setImagePreview(null);
            }
            // Temporarily ignore the ts error as we haven't typed useStaffSupportChat perfectly above
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await sendMessage(text, uploadedUrl);
        } catch {
            if (!content) setInput(text);
            toast.error('Gửi tin nhắn thất bại');
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const filteredConversations = conversations.filter((c) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        return c.customerName.toLowerCase().includes(term) || c.orderCode.toLowerCase().includes(term);
    });

    // Group conversations by customer
    const groupedConversations = filteredConversations.reduce((acc, conv) => {
        const name = conv.customerName;
        if (!acc[name]) acc[name] = [];
        acc[name].push(conv);
        return acc;
    }, {} as Record<string, typeof conversations>);

    const toggleCustomerExpand = (customerName: string) => {
        setExpandedCustomers((prev) => ({
            ...prev,
            [customerName]: !prev[customerName],
        }));
    };

    const selectedConv = conversations.find((c) => c.id === selectedConversationId) || null;
    const messageGroups = groupMessagesByDate(messages);

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 -m-6">
            {/* Main 3-col layout */}
            <div className="flex-1 min-h-0 flex">

                {/* ── Sidebar ── */}
                <div className="w-[280px] shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                    {/* Sidebar header */}
                    <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-primary" />
                                Tin nhắn
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate('/staff/support/settings')}
                                    className="text-gray-400 hover:text-primary transition-colors flex items-center"
                                    title="Cài đặt tự động"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => fetchConversations()}
                                    className="text-gray-400 hover:text-primary transition-colors flex items-center"
                                    title="Làm mới"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm kiếm khách hàng..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-gray-750"
                            />
                        </div>
                    </div>

                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {loadingConversations && (
                            <div className="flex items-center justify-center py-8 text-xs text-gray-400 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tải...
                            </div>
                        )}
                        {!loadingConversations && filteredConversations.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                    <MessageCircle className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Chưa có hội thoại</p>
                                <p className="text-xs text-gray-400 mt-1">Khi khách chat từ đơn hàng, hội thoại xuất hiện tại đây.</p>
                            </div>
                        )}
                        {Object.entries(groupedConversations).map(([customerName, convs]) => {
                            const isExpanded = expandedCustomers[customerName];
                            // Check if this group contains the currently selected conversation
                            const hasSelected = convs.some((c) => c.id === selectedConversationId);
                            // Aggregate unread count across all of this customer's conversations
                            const totalUnread = convs.reduce((sum, c) => sum + c.unreadCount, 0);
                            // Find the most recent message across all their conversations
                            let latestConv = convs[0];
                            for (const c of convs) {
                                if (!latestConv.lastMessage && c.lastMessage) {
                                    latestConv = c;
                                } else if (latestConv.lastMessage && c.lastMessage) {
                                    if (new Date(c.createdAt) > new Date(latestConv.createdAt)) {
                                        latestConv = c;
                                    }
                                }
                            }

                            // Determine if any conversation in the group is 'open'
                            const hasOpen = convs.some((c) => c.status === 'open');

                            return (
                                <div key={customerName} className="border-b border-gray-50 dark:border-gray-800">
                                    {/* Group Header (Customer) */}
                                    <button
                                        type="button"
                                        onClick={() => toggleCustomerExpand(customerName)}
                                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-orange-50/60 dark:hover:bg-gray-800 transition-colors ${hasSelected && !isExpanded
                                            ? 'bg-orange-50 dark:bg-gray-800 border-l-[3px] border-l-primary'
                                            : 'border-l-[3px] border-l-transparent'
                                            }`}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-orange-400 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                                {customerName.charAt(0).toUpperCase()}
                                            </div>
                                            {hasOpen && (
                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1">
                                                <p className={`text-sm truncate ${totalUnread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-200'}`}>
                                                    {customerName}
                                                </p>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {totalUnread > 0 && (
                                                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                                            {totalUnread}
                                                        </span>
                                                    )}
                                                    {latestConv.lastMessage && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(latestConv.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Show quick preview if collapsed or if they only have 1 order */}
                                            {(!isExpanded || convs.length === 1) && (
                                                <>
                                                    <p className="text-[10px] text-primary/70 font-medium mb-0.5">
                                                        {convs.length > 1 ? `${convs.length} đơn hàng` : `#${convs[0].orderCode}`}
                                                    </p>
                                                    {latestConv.lastMessage ? (
                                                        <p className={`text-xs truncate ${totalUnread > 0 ? 'text-gray-600 dark:text-gray-300 font-medium' : 'text-gray-400'}`}>
                                                            {latestConv.lastMessage.senderType === 'USER' ? '' : 'Bạn: '}
                                                            {latestConv.lastMessage.content}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-300 italic">Chưa có tin nhắn</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        {/* Expand Icon */}
                                        {convs.length > 1 && (
                                            <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 mt-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        )}
                                    </button>

                                    {/* Children (Orders) - only show if expanded and has > 1 order */}
                                    {isExpanded && convs.length > 1 && (
                                        <div className="bg-gray-50/50 dark:bg-gray-800/20">
                                            {convs.map((conv) => {
                                                const isActive = conv.id === selectedConversationId;
                                                return (
                                                    <button
                                                        key={conv.id}
                                                        type="button"
                                                        onClick={() => setSelectedConversationId(conv.id)}
                                                        className={`w-full text-left pl-14 pr-4 py-2 flex justify-between items-center gap-2 hover:bg-orange-50 dark:hover:bg-gray-700/50 transition-colors ${isActive ? 'bg-orange-100/50 dark:bg-gray-700/50' : ''
                                                            }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[11px] font-bold ${isActive ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                    #{conv.orderCode}
                                                                </span>
                                                                {conv.unreadCount > 0 && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                )}
                                                            </div>
                                                            {conv.lastMessage ? (
                                                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                                                    {conv.lastMessage.senderType === 'USER' ? '' : 'Bạn: '}
                                                                    {conv.lastMessage.content}
                                                                </p>
                                                            ) : (
                                                                <p className="text-[11px] text-gray-300 italic mt-0.5">Mới</p>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] text-gray-400 shrink-0">
                                                            {conv.createdAt ? new Date(conv.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Chat panel ── */}
                <div className="flex-1 min-w-0 flex flex-col bg-gray-50 dark:bg-gray-950">
                    {!selectedConv ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <MessageCircle className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                                Chọn một hội thoại
                            </h3>
                            <p className="text-sm text-gray-400 max-w-xs">
                                Bạn sẽ thấy lịch sử tin nhắn giữa khách và cửa hàng cho từng đơn hàng.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <div className="px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/80 to-orange-400 flex items-center justify-center text-white text-sm font-bold">
                                            {selectedConv.customerName.charAt(0).toUpperCase()}
                                        </div>
                                        {selectedConv.status === 'open' && (
                                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                            {selectedConv.customerName}
                                        </p>
                                        <p className="text-[11px] text-green-500 font-medium">
                                            {selectedConv.status === 'open' ? 'Đang hỗ trợ' : 'Đã kết thúc'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowOrderPanel(!showOrderPanel)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showOrderPanel
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white dark:bg-gray-800 text-primary border-primary/30 hover:bg-primary/5'
                                            }`}
                                    >
                                        <Package className="w-3.5 h-3.5" />
                                        Xem đơn hàng
                                    </button>
                                    <button className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages area */}
                            <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-1">
                                {loadingMessages && (
                                    <div className="flex items-center justify-center py-8 text-xs text-gray-400 gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang tải tin nhắn...
                                    </div>
                                )}
                                {error && (
                                    <p className="text-xs text-red-500 text-center mt-2">{error}</p>
                                )}
                                {!loadingMessages && messages.length === 0 && !error && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <p className="text-sm text-gray-400">Chưa có tin nhắn nào.</p>
                                        <p className="text-xs text-gray-300 mt-1">Hãy gửi lời chào đầu tiên cho khách.</p>
                                    </div>
                                )}

                                {messageGroups.map((group) => (
                                    <div key={group.date}>
                                        {/* Date separator */}
                                        <div className="flex items-center gap-3 my-4">
                                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                            <span className="text-[10px] text-gray-400 font-semibold tracking-widest bg-gray-50 dark:bg-gray-950 px-2">
                                                {group.date}
                                            </span>
                                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                        </div>

                                        {/* Messages */}
                                        <div className="space-y-2">
                                            {group.messages.map((msg) => {
                                                const isStaff = msg.senderType === 'STAFF';
                                                return (
                                                    <div key={msg.id} className={`flex items-end gap-2 ${isStaff ? 'justify-end' : 'justify-start'}`}>
                                                        {/* Customer avatar */}
                                                        {!isStaff && (
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-orange-300 flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1">
                                                                {selectedConv.customerName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}

                                                        <div className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'} max-w-[65%]`}>
                                                            <div
                                                                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isStaff
                                                                    ? 'bg-primary text-white rounded-br-sm'
                                                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
                                                                    }`}
                                                            >
                                                                {msg.image_url && (
                                                                    <div className="mb-2">
                                                                        <img src={msg.image_url} alt="Attached" className="max-w-full rounded-lg max-h-48 object-cover" />
                                                                    </div>
                                                                )}
                                                                {linkify(msg.content)}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                                                {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>

                                                        {/* Staff avatar */}
                                                        {isStaff && (
                                                            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1">
                                                                S
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick replies */}
                            <div className="px-5 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                {QUICK_REPLIES.map((qr) => (
                                    <button
                                        key={qr}
                                        type="button"
                                        onClick={() => void handleSend(qr)}
                                        disabled={sending}
                                        className="shrink-0 px-3 py-1.5 rounded-full border border-primary/40 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        {qr}
                                    </button>
                                ))}
                            </div>

                            {/* Image Preview Area */}
                            {imagePreview && (
                                <div className="px-5 py-2 bg-gray-50 flex items-center gap-4 border-t border-gray-200">
                                    <div className="relative">
                                        <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded shadow-md border border-gray-200" />
                                        <button
                                            onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                        {selectedImage?.name}
                                    </span>
                                </div>
                            )}

                            {/* Input bar */}
                            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shrink-0">
                                <div className="flex items-center gap-2">
                                    {/* Icon actions */}
                                    <div className="flex items-center gap-1">
                                        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors">
                                            <Smile className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors"
                                        >
                                            <Image className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                        />
                                        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors">
                                            <Paperclip className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Text input */}
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                void handleSend();
                                            }
                                        }}
                                        placeholder="Nhập tin nhắn..."
                                        className="flex-1 h-10 px-4 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-gray-750"
                                    />

                                    {/* Send button */}
                                    <button
                                        type="button"
                                        onClick={() => void handleSend()}
                                        disabled={(!input.trim() && !selectedImage) || sending}
                                        className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Order detail panel ── */}
                {selectedConv && showOrderPanel && (
                    <div className="w-[280px] shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
                        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Chi tiết đơn hàng</h3>
                            {orderDetail && (
                                <button
                                    onClick={() => navigate(`/staff/orders/${orderDetail._id}`)}
                                    className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                                >
                                    Xem tất cả <ExternalLink className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {loadingOrder && (
                            <div className="flex items-center justify-center py-8 gap-2 text-xs text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tải đơn hàng...
                            </div>
                        )}

                        {!loadingOrder && !orderDetail && (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <Package className="w-8 h-8 text-gray-300 mb-2" />
                                <p className="text-xs text-gray-400">Không tìm thấy thông tin đơn hàng</p>
                            </div>
                        )}

                        {!loadingOrder && orderDetail && (
                            <div className="px-4 py-4 space-y-4">
                                {/* Order code + status */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">#{orderDetail.code}</span>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${orderDetail.status === 'completed' ? 'bg-green-100 text-green-700'
                                        : orderDetail.status === 'shipping' ? 'bg-indigo-100 text-indigo-700'
                                            : orderDetail.status === 'confirmed' ? 'bg-primary/10 text-primary'
                                                : orderDetail.status === 'cancelled' ? 'bg-red-100 text-red-600'
                                                    : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {orderDetail.status === 'completed' ? 'Hoàn thành'
                                            : orderDetail.status === 'shipping' ? 'Đang giao'
                                                : orderDetail.status === 'confirmed' ? 'Đã xác nhận'
                                                    : orderDetail.status === 'cancelled' ? 'Đã hủy'
                                                        : 'Chờ xử lý'}
                                    </span>
                                </div>

                                {/* Total */}
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
                                    <span className="text-xs text-gray-500">Tổng cộng</span>
                                    <span className="text-sm font-bold text-primary">
                                        {orderDetail.total_price.toLocaleString('vi-VN')}đ
                                    </span>
                                </div>

                                {/* Items */}
                                <div className="space-y-2">
                                    {orderDetail.items.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
                                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-primary">×{item.quantity}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                                                    {(item.product_id as unknown as { name: string })?.name || 'Sản phẩm'}
                                                </p>
                                                <p className="text-[10px] text-primary font-semibold mt-0.5">
                                                    {item.sub_total.toLocaleString('vi-VN')}đ
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gray-100 dark:bg-gray-700" />

                                {/* Delivery info */}
                                <div className="space-y-2.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Package className="w-3 h-3" /> Thông tin giao hàng
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <span>{orderDetail.delivery_address.phone || '—'}</span>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">
                                            {orderDetail.delivery_address.detail}, {orderDetail.delivery_address.ward}, {orderDetail.delivery_address.district}, {orderDetail.delivery_address.city}
                                        </span>
                                    </div>
                                </div>

                                {/* View order button */}
                                <button
                                    onClick={() => navigate(`/staff/orders/${orderDetail._id}`)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <span>Xem chi tiết đơn hàng</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
