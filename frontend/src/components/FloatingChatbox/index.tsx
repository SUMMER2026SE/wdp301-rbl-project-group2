import { useState } from 'react';

const FloatingChatbox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    return (
        <>
            {/* Floating Chat Button (when closed) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 size-16 bg-gradient-to-br from-primary to-orange-600 text-white rounded-full shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
                >
                    <span className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform">
                        smart_toy
                    </span>
                    {/* Notification Badge */}
                    <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                        1
                    </span>
                    {/* Pulse Effect */}
                    <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[400px] bg-white dark:bg-[#1c130d] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden transition-all duration-300"
                    style={{ height: isMinimized ? '64px' : '600px' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary to-orange-600 text-white border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center size-10 rounded-full bg-white/20 backdrop-blur">
                                <span className="material-symbols-outlined">smart_toy</span>
                                {/* Status Dot */}
                                <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                </span>
                            </div>
                            <div>
                                <h2 className="font-bold text-base leading-none">Foodie AI</h2>
                                <span className="text-xs text-white/80 flex items-center gap-1">
                                    <span className="size-1.5 rounded-full bg-green-500"></span> Online
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {isMinimized ? 'expand_more' : 'remove'}
                                </span>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    </div>

                    {/* Chat Content (hidden when minimized) */}
                    {!isMinimized && (
                        <>
                            {/* Chat Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50 dark:bg-[#23180f]">
                                {/* Timestamp */}
                                <div className="flex justify-center">
                                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-white/5 px-2 py-1 rounded-full">
                                        Hôm nay, 12:30
                                    </span>
                                </div>

                                {/* AI Welcome Message */}
                                <div className="flex items-end gap-2 max-w-[85%]">
                                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
                                        <span className="material-symbols-outlined text-primary text-base">smart_toy</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 ml-1">Foodie AI</span>
                                        <div className="p-3 bg-white dark:bg-[#2f2219] rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 dark:border-white/5 text-sm leading-relaxed">
                                            Xin chào! Tôi có thể giúp bạn tìm món ăn ngon, kiểm tra đơn hàng, hoặc gợi ý món lành mạnh. Bạn cần gì? 🍜
                                        </div>
                                    </div>
                                </div>

                                {/* Sample User Message */}
                                <div className="flex items-end justify-end gap-2 w-full">
                                    <div className="flex flex-col gap-1 items-end max-w-[85%]">
                                        <div className="p-3 bg-gray-200 dark:bg-white/10 rounded-2xl rounded-br-sm text-sm leading-relaxed">
                                            Tìm món Việt dưới 100k
                                        </div>
                                        <span className="text-[10px] text-gray-400 mr-1">Đã đọc 12:32</span>
                                    </div>
                                </div>

                                {/* AI Response with Cards */}
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-end gap-2 max-w-[95%]">
                                        <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
                                            <span className="material-symbols-outlined text-primary text-base">smart_toy</span>
                                        </div>
                                        <div className="flex flex-col gap-2 w-full">
                                            <span className="text-[10px] text-gray-500 ml-1">Foodie AI</span>
                                            <div className="p-3 bg-white dark:bg-[#2f2219] rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-white/5 text-sm leading-relaxed">
                                                Đây là những món ngon dưới 100k:
                                            </div>

                                            {/* Food Card */}
                                            <div className="bg-white dark:bg-[#2f2219] rounded-xl shadow-md border border-gray-100 dark:border-white/5 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                                                <div className="h-24 w-full bg-cover bg-center relative"
                                                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=400&h=300&fit=crop')" }}
                                                >
                                                    <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg text-xs font-bold shadow-sm">
                                                        4.8 <span className="text-primary">★</span>
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="font-bold text-sm mb-1">Phở Bò Đặc Biệt</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Phở Thìn • 15 phút</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-primary">85.000đ</span>
                                                        <button className="bg-primary/10 hover:bg-primary text-primary hover:text-white p-1.5 rounded-lg transition-colors">
                                                            <span className="material-symbols-outlined text-base">add</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-[#1c130d] border-t border-gray-200 dark:border-white/5">
                                {/* Quick Action Chips */}
                                <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3 pb-1">
                                    <button className="shrink-0 px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-full text-xs font-bold transition-all whitespace-nowrap">
                                        ✨ Gợi ý cho tôi
                                    </button>
                                    <button className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-400 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium transition-all whitespace-nowrap">
                                        🥗 Món lành mạnh
                                    </button>
                                    <button className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-400 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium transition-all whitespace-nowrap">
                                        🚚 Theo dõi đơn
                                    </button>
                                </div>

                                {/* Input Field */}
                                <div className="flex gap-2 items-end">
                                    <div className="relative flex-1">
                                        <input
                                            className="w-full pl-4 pr-10 py-2.5 bg-gray-100 dark:bg-white/5 border-none focus:ring-2 focus:ring-primary/50 rounded-xl text-sm placeholder-gray-400 dark:text-white transition-all"
                                            placeholder="Nhập câu hỏi..."
                                            type="text"
                                        />
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors">
                                            <span className="material-symbols-outlined text-base">mic</span>
                                        </button>
                                    </div>
                                    <button className="flex items-center justify-center size-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95">
                                        <span className="material-symbols-outlined text-base">send</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default FloatingChatbox;
