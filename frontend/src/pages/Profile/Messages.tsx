import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import supportChatService from "@/services/support-chat.service";
import { MessageSquare, Clock, ArrowRight, ShoppingBag } from "lucide-react";
import { useSupportChatStore } from "@/store/supportChatStore";

/*
- [x] Frontend: Creating `Messages.tsx` page as a standalone view (no profile layout)
- [x] Frontend: Registering `/messages` route in `App.tsx`
- [x] Frontend: Implement Global Chat Persistence in `MainLayout`
- [x] Frontend: Add floating bubble trigger to `OrderSupportChat`
- [x] Verification: Test chat persistence across home page and other routes
*/
interface Conversation {
  id: string;
  orderCode: string;
  orderId: string;
  lastMessage?: {
    content: string;
    imageUrl?: string;
    createdAt: string;
    senderType: string;
  };
  unreadCount: number;
  status: string;
  updatedAt: string;
}

const CustomerMessagesPage = () => {
  const { } = useTranslation(["common", "customer"]);
  const { openChat } = useSupportChatStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await supportChatService.listConversations();
      setConversations(res.data.conversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleOpenChat = (orderId: string | undefined) => {
    openChat(orderId || "");
  };

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-foreground">
          Hộp thư hỗ trợ
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
          Danh sách cuộc trò chuyện với nhân viên cửa hàng. Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">
            Đang tải dữ liệu...
          </p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-card rounded-xl border-2 border-dashed border-border p-16 text-center flex flex-col items-center gap-6 shadow-sm">
          <div className="size-24 rounded-full bg-accent flex items-center justify-center">
            <MessageSquare className="size-12 text-muted-foreground" />
          </div>
          <div className="max-w-sm">
            <h3 className="text-2xl font-bold text-foreground">Chưa có cuộc hội thoại nào</h3>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Bắt đầu trò chuyện bằng cách bấm vào nút <b className="text-foreground">"Nhắn tin"</b> trong trang chi tiết sản phẩm hoặc đơn hàng của bạn.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleOpenChat(conv.orderId || undefined)}
              className="group bg-card rounded-xl p-6 border border-border shadow-[0_4px_20px_-2px_rgba(28,19,13,0.05)] hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex items-center gap-6"
            >
              <div className={`size-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                conv.orderId ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                {conv.orderId ? (
                  <ShoppingBag className="size-8" />
                ) : (
                  <MessageSquare className="size-8" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg ${
                    conv.orderId ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {conv.orderId ? `Đơn hàng #${conv.orderCode}` : 'Tư vấn chung'}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black shadow-lg shadow-red-500/30">
                      {conv.unreadCount}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground font-bold ml-auto shrink-0">
                    {new Date(conv.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <p className="text-base font-bold text-foreground truncate group-hover:text-orange-500 transition-colors">
                  {conv.lastMessage?.content || (conv.lastMessage?.imageUrl ? "Hình ảnh" : "Vừa bắt đầu cuộc trò chuyện")}
                </p>

                <div className="flex items-center gap-2 mt-3 text-[12px] text-muted-foreground font-semibold">
                  <Clock className="size-3.5" />
                  <span>Cuối cùng lúc {new Date(conv.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="size-12 rounded-2xl bg-accent flex items-center justify-center text-muted-foreground group-hover:bg-orange-500 group-hover:text-white transition-all group-hover:translate-x-1">
                <ArrowRight className="size-6" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerMessagesPage;
