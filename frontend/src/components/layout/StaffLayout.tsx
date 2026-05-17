
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    LogOut,
    Menu,
    X,
    UtensilsCrossed,
    Bell,
    Truck,
    MessageCircleMore,
    Search
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { getSupportSocket } from "@/lib/support-socket";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface OrderNotification {
    id: string;
    code: string;
    total_price: number;
    itemsCount: number;
    createdAt: string;
    isRead: boolean;
}

export default function StaffLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false); // Sidebar hover
    const [notifications, setNotifications] = useState<OrderNotification[]>([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { playNotification } = useNotificationSound();

    const SIDEBAR_EXPANDED = 260;
    const SIDEBAR_COLLAPSED = 80;
    const sidebarW = isHovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Socket listener for new orders
    useEffect(() => {
        const socket = getSupportSocket();

        socket.on('order:new', (data: { _id: string; code: string; total_price: number; itemsCount: number; createdAt: string }) => {
            console.log('New order received:', data);

            const newNotif: OrderNotification = {
                id: data._id,
                code: data.code,
                total_price: data.total_price,
                itemsCount: data.itemsCount,
                createdAt: data.createdAt,
                isRead: false
            };

            setNotifications(prev => [newNotif, ...prev].slice(0, 20)); // Keep last 20
            playNotification();

            toast.custom((t) => (
                <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'
                        } max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 border-orange-500`}
                >
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                    <ShoppingBag size={20} />
                                </div>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-black text-slate-900">
                                    Đơn hàng mới #{data.code}
                                </p>
                                <p className="mt-1 text-sm text-slate-500 font-medium h-5 overflow-hidden">
                                    {data.itemsCount} món • {data.total_price.toLocaleString('vi-VN')}₫
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex border-l border-slate-100">
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                navigate(`/staff/orders/${data._id}`);
                            }}
                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-black text-orange-600 hover:bg-orange-50 focus:outline-none"
                        >
                            Xem ngay
                        </button>
                    </div>
                </div>
            ), { duration: 5000 });
        });

        return () => {
            socket.off('order:new');
        };
    }, [playNotification, navigate]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { path: '/staff', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
        { path: '/staff/orders', label: 'Quản lý Đơn hàng', icon: ShoppingBag },
        { path: '/staff/delivery', label: 'Đơn đang giao', icon: Truck },
        { path: '/staff/menu', label: 'Thực đơn', icon: UtensilsCrossed },
        { path: '/staff/support', label: 'Chat Hỗ trợ', icon: MessageCircleMore },
        { path: '/staff/customers', label: 'Khách hàng', icon: Users },
    ];

    // Close sidebar on mobile when navigating
    // Sync sidebar state when location changes
    if (sidebarOpen) {
      setSidebarOpen(false);
    }

    const handleLogout = () => {
        // Clear token or auth state here
        navigate('/login');
    };

    // Helper để lấy tên trang hiện tại hiển thị trên Topbar
    const getCurrentPageTitle = () => {
        const currentItem = navItems.find(item =>
            item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
        );
        return currentItem?.label || 'FoodieDash Staff';
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

            {/* Sidebar */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`fixed lg:static top-0 left-0 z-[100] flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
                    }`}
                style={{ width: sidebarOpen ? 260 : sidebarW }}
            >
                {/* Logo Area */}
                <div className={`h-20 flex items-center justify-between border-b border-slate-100 shrink-0 transition-all duration-300 ${isHovered ? 'px-6' : 'px-0'}`}>
                    <Link
                        to="/"
                        className={`flex items-center text-orange-600 cursor-pointer group transition-all duration-300 ${isHovered ? 'gap-2.5' : 'justify-center w-full'}`}
                    >
                        <img
                            src={logo}
                            alt="FoodieDash"
                            className={cn(
                                "object-contain group-hover:rotate-12 transition-transform duration-300",
                                isHovered ? "h-18 -ml-8 -mr-10" : "h-14"
                            )}
                        />

                        {isHovered && (
                            <div className="flex flex-col overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
                                <span className="text-2xl font-black tracking-tighter m-0 leading-none">FoodieDash</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600/80 mt-1">Staff Portal</span>
                            </div>
                        )}
                    </Link>
                    {/* Close button for mobile */}
                    <button
                        className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 py-6 px-4 overflow-y-auto no-scrollbar space-y-1">
                    <div className={`px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                        Menu Chính
                    </div>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            title={!isHovered ? item.label : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${isActive
                                    ? 'bg-orange-50 text-orange-600'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                } ${isHovered ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}`
                            }
                        >
                            <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${!isHovered && 'scale-110'}`} />
                            {isHovered && <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom Section (AI Status & Logout) */}
                <div className="p-4 border-t border-slate-100 shrink-0">
                    {/* AI Status Widget */}
                    <div className={`flex items-center p-3 bg-slate-50 border border-slate-200/60 rounded-xl mb-3 transition-all duration-300 ${isHovered ? 'gap-3' : 'justify-center p-2'}`}>
                        {isHovered && (
                            <>
                                <div className="relative flex h-2.5 w-2.5 shrink-0 mr-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        title={!isHovered ? "Đăng xuất" : undefined}
                        className={`flex items-center w-full text-sm font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 ${isHovered ? 'gap-3 px-3 py-2.5' : 'justify-center p-2.5'}`}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {isHovered && <span className="whitespace-nowrap">Đăng xuất</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main
                className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
                style={{ marginLeft: 0 }} // Since footer is using lg:static, we don't need margin-left if it's in a flex container. 
            // But AdminLayout uses fixed sidebar. StaffLayout uses fixed/lg:static.
            // If it's lg:static, flex container handles it. 
            // Let's re-verify if marginal-left is needed.
            >

                {/* Topbar */}
                <header className="h-20 px-4 sm:px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-40 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="hidden sm:block">
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">
                                {getCurrentPageTitle()}
                            </h1>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                Hệ thống tự động cập nhật
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5">
                        {/* Search Box (Tùy chọn hiển thị trên topbar) */}
                        <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-full border border-transparent focus-within:border-orange-500/30 focus-within:bg-white transition-colors">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm mã đơn hàng..."
                                className="bg-transparent border-none outline-none text-sm text-slate-700 w-40 placeholder:text-slate-400"
                            />
                        </div>

                        <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                        {/* Notification Bell */}
                        <div
                            className="relative"
                            ref={dropdownRef}
                            onMouseEnter={() => {
                                setShowNotifDropdown(true);
                                // Mark all as read when hovering
                                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                            }}
                            onMouseLeave={() => setShowNotifDropdown(false)}
                        >
                            <button
                                className={`relative p-2 rounded-full transition-all duration-200 ${showNotifDropdown ? 'bg-orange-100 text-orange-600' : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'
                                    }`}
                                title="Thông báo"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white text-[8px] font-bold text-white items-center justify-center">
                                            {unreadCount}
                                        </span>
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            {showNotifDropdown && (
                                <div className="absolute right-0 pt-3 w-80 sm:w-96 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                            <h3 className="text-sm font-black text-slate-800 tracking-tight">Thông báo mới</h3>
                                            <button
                                                onClick={() => setNotifications([])}
                                                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                Xoá tất cả
                                            </button>
                                        </div>

                                        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                                        <Bell className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-400">Không có thông báo mới</p>
                                                    <p className="text-xs text-slate-400 mt-1">Các đơn hàng mới sẽ xuất hiện ở đây</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-50">
                                                    {notifications.map((notif) => (
                                                        <div
                                                            key={notif.id + notif.createdAt}
                                                            onClick={() => {
                                                                navigate(`/staff/orders/${notif.id}`);
                                                                setShowNotifDropdown(false);
                                                            }}
                                                            className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                                                                    <ShoppingBag className="w-5 h-5 text-orange-500" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-0.5">
                                                                        <p className="text-sm font-black text-slate-800">Đơn hàng #{notif.code}</p>
                                                                        <span className="text-[10px] font-medium text-slate-400">
                                                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs font-semibold text-slate-500 mb-2">
                                                                        {notif.itemsCount} món • {notif.total_price.toLocaleString('vi-VN')}₫
                                                                    </p>
                                                                    <div className="inline-flex items-center text-[11px] font-black text-orange-500 group-hover:translate-x-1 transition-transform">
                                                                        Chi tiết <span className="material-symbols-outlined text-[14px] ml-1">arrow_forward</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {notifications.length > 0 && (
                                            <div className="p-3 bg-slate-50/50 border-t border-slate-50">
                                                <button
                                                    onClick={() => {
                                                        navigate('/staff/orders');
                                                        setShowNotifDropdown(false);
                                                    }}
                                                    className="w-full py-2.5 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors"
                                                >
                                                    Xem tất cả đơn hàng
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 pl-2 sm:pl-0">
                            <div className="hidden sm:block text-right">
                                <div className="text-sm font-bold text-slate-800 leading-none mb-1">
                                    {user?.username || "Nhân viên"}
                                </div>
                                <div className="text-[11px] font-semibold text-orange-500 uppercase tracking-wider">
                                    {user?.role === 'ADMIN' ? "Quản trị viên" : "Nhân viên hệ thống"}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center overflow-hidden shrink-0">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">
                                        {user?.username?.charAt(0)?.toUpperCase() || "S"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}