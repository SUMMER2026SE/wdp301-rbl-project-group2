import { Outlet } from "react-router-dom";
import HomeHeader from "@/pages/Home/components/HomeHeader";
import HomeFooter from "@/pages/Home/components/HomeFooter";
import { FloatingAIChatbot } from "@/components/shared/FloatingAIChatbot";
import { OrderSupportChat } from "@/components/shared/OrderSupportChat";
import { useSupportChatStore } from "@/store/supportChatStore";

const MainLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50/50 text-slate-800 font-sans selection:bg-orange-100 selection:text-orange-600 flex flex-col">
            <HomeHeader />
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
            <HomeFooter />
            <FloatingAIChatbot />
            <SupportChatGlobal />
        </div>
    );
};

const SupportChatGlobal = () => {
    const { isMounted } = useSupportChatStore();
    if (!isMounted) return null;
    return <OrderSupportChat showEntryCard={false} />;
};

export default MainLayout;
