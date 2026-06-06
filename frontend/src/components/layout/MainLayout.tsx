import { Outlet } from "react-router-dom";
import HomeHeader from "@/pages/Home/components/HomeHeader";
import HomeFooter from "@/pages/Home/components/HomeFooter";
import { FloatingAIChatbot } from "@/components/shared/FloatingAIChatbot";
import { OrderSupportChat } from "@/components/shared/OrderSupportChat";
import { useSupportChatStore } from "@/store/supportChatStore";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";


import { useStoreStore } from "@/store/storeStore";
import { BranchSelectorModal } from "@/components/shared/BranchSelectorModal";

const ScrollToTopButton = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };
        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
        
        // Reset custom scrollable layout elements
        const scrollableElements = document.querySelectorAll(
            ".overflow-y-auto, .overflow-auto, main, #root, body, html, .layout-content-container"
        );
        scrollableElements.forEach((el) => {
            el.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    if (!visible) return null;

    return (
        <button
            onClick={scrollToTop}
            className="fixed bottom-[168px] right-6 z-50 w-14 h-14 rounded-full bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-slate-700 shadow-xl flex items-center justify-center hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 transition-all duration-300 hover:scale-110 active:scale-95 animate-in zoom-in fade-in"
            aria-label="Scroll to top"
            title="Cuộn lên đầu trang"
        >
            <span className="material-symbols-outlined text-[26px]">arrow_upward</span>
        </button>
    );
};

const MainLayout = () => {
    const { selectedStore } = useStoreStore();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!selectedStore) {
            setShowModal(true);
        } else {
            setShowModal(false);
        }
    }, [selectedStore]);

    return (
        <div className="min-h-screen bg-gray-50/50 text-slate-800 font-sans selection:bg-orange-100 selection:text-orange-600 flex flex-col">
            <HomeHeader />
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
            <HomeFooter />
            <FloatingAIChatbot />
            <SupportChatGlobal />
            <ScrollToTopButton />
            <BranchSelectorModal isOpen={showModal} isClosable={false} />
        </div>
    );
};

const SupportChatGlobal = () => {
    const { isAuthenticated, isCustomer } = useAuth();
    const { isMounted } = useSupportChatStore();
    if (!isMounted && !(isAuthenticated && isCustomer)) return null;
    return <OrderSupportChat showEntryCard={false} />;
};

export default MainLayout;
