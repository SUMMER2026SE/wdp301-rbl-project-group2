import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
    { label: "Đơn hàng", href: "/admin/orders" },
    { label: "Công nợ Staff", href: "/admin/cash-control" },
    { label: "Điều phối", href: "/admin/dispatch" },
    { label: "Lịch trình", href: "/admin/delivery" },
];

const AdminOperationsLayout = () => {
    const location = useLocation();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-[#1b140d] dark:text-white">
                    Quản lý Vận hành
                </h1>
                <p className="text-sm text-[#9a734c] dark:text-gray-500">
                    Giám sát đơn hàng, dòng tiền và đội ngũ giao hàng theo thời gian thực.
                </p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-800">
                <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => {
                        const isActive = location.pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                to={tab.href}
                                className={cn(
                                    "pb-4 text-sm font-bold transition-all relative whitespace-nowrap",
                                    isActive
                                        ? "text-orange-600 dark:text-orange-500"
                                        : "text-[#9a734c] hover:text-[#1b140d] dark:hover:text-gray-300"
                                )}
                            >
                                {tab.label}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 dark:bg-orange-500 rounded-t-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminOperationsLayout;
