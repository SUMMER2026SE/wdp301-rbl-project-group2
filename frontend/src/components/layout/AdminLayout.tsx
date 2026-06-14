import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";
import { getSupportSocket } from "@/lib/support-socket";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ShoppingBag } from "lucide-react";
import orderService from "@/services/order.service";

interface OrderNotification {
  id: string;
  code: string;
  totalPrice: number;
  itemsCount: number;
  createdAt: string;
  isRead: boolean;
}

// ---- Sidebar Item Component ----

interface SubItem {
  label: string;
  href: string;
  badge?: number;
}

interface SidebarItemProps {
  icon: string;
  label: string;
  href: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  currentPath: string;
  subItems?: SubItem[];
}

const SidebarItem = ({
  icon,
  label,
  href,
  isActive,
  isCollapsed,
  currentPath,
  subItems,
}: SidebarItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubItems = subItems && subItems.length > 0;

  // Exact match for "/admin" (dashboard), exact match or subpath with slash for other items
  const isPathMatch = (path: string, href: string) =>
    href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/");

  const hasActiveChild =
    hasSubItems && subItems.some((sub) => isPathMatch(currentPath, sub.href));

  // Sync open state with collapsed/active state
  if (isCollapsed && isOpen) {
    setIsOpen(false);
  } else if (!isCollapsed && hasActiveChild && !isOpen) {
    setIsOpen(true);
  }

  return (
    <div className="mb-0.5">
      <Link
        to={hasSubItems ? "#" : href}
        onClick={(e) => {
          if (hasSubItems) {
            e.preventDefault();
            if (!isCollapsed) setIsOpen(!isOpen);
          }
        }}
        title={isCollapsed ? label : undefined}
        className={cn(
          "group flex items-center justify-between rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer relative",
          isCollapsed ? "px-2.5 py-2.5 justify-center" : "px-3 py-2.5",
          isActive || hasActiveChild
            ? "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10"
            : "text-[#6b5744] dark:text-gray-400 hover:text-orange-700 dark:hover:text-orange-400 hover:bg-orange-50/60 dark:hover:bg-orange-500/5",
        )}
      >
        {(isActive || hasActiveChild) && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-orange-500 rounded-r-full" />
        )}

        <div className="flex items-center gap-3">
          <span
            className={cn(
              "material-symbols-outlined text-[20px] transition-all duration-200 shrink-0",
              isActive || hasActiveChild
                ? "text-orange-500 scale-105"
                : "text-[#9a734c]/60 dark:text-gray-500 group-hover:text-orange-500 group-hover:scale-105",
            )}
          >
            {icon}
          </span>
          {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
        </div>

        {hasSubItems && !isCollapsed && (
          <span
            className={cn(
              "material-symbols-outlined text-[16px] transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          >
            expand_more
          </span>
        )}
      </Link>

      {hasSubItems && isOpen && !isCollapsed && (
        <div className="mt-1 flex animate-in slide-in-from-top-2 duration-200">
          <div className="w-px bg-orange-200/50 dark:bg-orange-500/10 ml-[22px] my-1.5" />
          <div className="flex-1 ml-3 space-y-0.5">
            {subItems.map((sub) => {
              const isSubActive = isPathMatch(currentPath, sub.href);
              return (
                <Link
                  key={sub.href}
                  to={sub.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-200 relative",
                    isSubActive
                      ? "text-orange-700 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-500/10 font-semibold"
                      : "text-[#9a734c] dark:text-gray-500 hover:text-orange-700 dark:hover:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 font-medium",
                  )}
                >
                  {isSubActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-orange-500 rounded-r-full" />
                  )}
                  <span>{sub.label}</span>
                  {sub.badge && sub.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full font-bold leading-none min-w-[18px] text-center">
                      {sub.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Navigation Config ----

const NAV_ITEMS = [
  {
    label: "Bảng điều khiển",
    href: "/admin",
    icon: "dashboard",
  },
  {
    label: "Danh mục & AI",
    href: "/admin/menu",
    icon: "restaurant_menu",
    subItems: [
      { label: "Thực đơn", href: "/admin/menu" },
      { label: "Nguyên liệu & AI", href: "/admin/ingredients" },
      { label: "Kho hàng", href: "/admin/inventory" },
    ],
  },
  {
    label: "Đội ngũ nhân sự",
    href: "/admin/staff",
    icon: "group",
    subItems: [
      { label: "Danh sách nhân sự", href: "/admin/staff" },
      { label: "Đề xuất nhân sự", href: "/admin/staff-requests" },
    ],
  },
  {
    label: "Quản lí chiến dịch",
    href: "/admin/vouchers",
    icon: "campaign",
    subItems: [
      { label: "Vouchers", href: "/admin/vouchers" },
      { label: "Chiến dịch", href: "/admin/campaigns" },
    ],
  },
  {
    label: "Cài đặt & Hệ thống",
    href: "/admin/settings",
    icon: "settings",
    subItems: [{ label: "Cấu hình chung", href: "/admin/settings" }],
  },
];

// ---- Constants ----
const SIDEBAR_EXPANDED = 256; // 16rem = w-64
const SIDEBAR_COLLAPSED = 72; // w-[72px] = icon + padding
const TOPBAR_H = 56; // h-14

// ---- Admin Layout ----

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout: authLogout } = useAuth();

  const userRole = user?.role?.toUpperCase();
  const filteredNavItems = NAV_ITEMS.map(item => {
    if (userRole === "MANAGER") {
      if (item.label === "Marketing") {
        return {
          ...item,
          subItems: item.subItems?.filter(sub => sub.label === "Chiến dịch")
        };
      }
      if (item.label === "Danh mục & AI") {
        return {
          ...item,
          subItems: item.subItems?.filter(sub => sub.label === "Thực đơn")
        };
      }
    }
    return item;
  }).filter(item => {
    if (userRole === "MANAGER") {
      return item.label === "Bảng điều khiển" || item.label === "Marketing" || item.label === "Danh mục & AI";
    }
    return true;
  });

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("admin_theme") === "dark",
  );
  const [isHovered, setIsHovered] = useState(false);

  const sidebarW = isHovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { playNotification } = useNotificationSound();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Fetch pending orders on mount to pre-populate notifications
  useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        const res = await orderService.getAllOrders({
          status: "pending",
          limit: 20,
        });
        if (res?.success && Array.isArray(res.data)) {
          const mapped: OrderNotification[] = res.data.map((order) => ({
            id: order._id,
            code: order.code,
            totalPrice: order.totalPrice,
            itemsCount: order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            ),
            createdAt: order.createdAt,
            isRead: true,
          }));
          setNotifications(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch pending orders for notifications:", err);
      }
    };

    void fetchPendingOrders();
  }, []);

  // Socket listener for new orders
  useEffect(() => {
    const socket = getSupportSocket();

    socket.on(
      "order:new",
      (data: {
        _id: string;
        code: string;
        totalPrice: number;
        itemsCount: number;
        createdAt: string;
      }) => {
        console.log("New order received in AdminLayout:", data);

        const newNotif: OrderNotification = {
          id: data._id,
          code: data.code,
          totalPrice: data.totalPrice,
          itemsCount: data.itemsCount,
          createdAt: data.createdAt,
          isRead: false,
        };

        setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
        playNotification();

        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white dark:bg-gray-900 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 border-orange-500`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600">
                      <ShoppingBag size={20} />
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Đơn hàng mới #{data.code}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 font-medium h-5 overflow-hidden">
                      {data.itemsCount} món •{" "}
                      {data.totalPrice.toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-slate-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate(`/admin/orders`);
                  }}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-black text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-800 focus:outline-none"
                >
                  Xem ngay
                </button>
              </div>
            </div>
          ),
          { duration: 5000 },
        );
      },
    );

    return () => {
      socket.off("order:new");
    };
  }, [playNotification, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("admin_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = () => {
    authLogout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#f8f7f6] dark:bg-gray-950 text-[#1b140d] dark:text-white antialiased">
      {/* Sidebar */}
      <aside
        className="fixed h-full z-30 bg-white dark:bg-gray-900 border-r border-[#e7dbcf] dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
        style={{ width: sidebarW }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo — same height as topbar */}
        <div
          className="border-b border-[#e7dbcf]/50 dark:border-gray-800 flex items-center shrink-0"
          style={{ height: TOPBAR_H }}
        >
          <Link
            to="/admin/overview"
            className={cn(
              "flex items-center text-orange-600 cursor-pointer group transition-all duration-300",
              isHovered ? "gap-2.5 px-5" : "justify-center w-full",
            )}
          >
            <img
              src={logo}
              alt="FoodieDash"
              className={cn(
                "object-contain group-hover:rotate-12 transition-transform duration-300",
                isHovered ? "h-18 -ml-8 -mr-10" : "h-14",
              )}
            />
            {isHovered && (
              <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-200">
                <h1 className="text-xl font-black tracking-tighter leading-none">
                  FoodieDash
                </h1>
                <p className="text-[9px] text-orange-600/70 uppercase tracking-wider font-bold mt-0.5">
                  Khu vực quản trị
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filteredNavItems.map((item) => {
            // For "Tổng quan" parent, check for exact /admin match
            const isExactMatch =
              item.href === "/admin/overview"
                ? location.pathname === "/admin"
                : location.pathname === item.href;
            return (
              <SidebarItem
                key={item.label}
                {...item}
                isCollapsed={!isHovered}
                currentPath={location.pathname}
                isActive={isExactMatch}
              />
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-2 border-t border-[#e7dbcf]/50 dark:border-gray-800">
          {isHovered ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#f3ede7]/60 dark:bg-gray-800 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                  {user?.username?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[13px] font-semibold text-[#1b140d] dark:text-white truncate">
                    {user?.username || "Admin"}
                  </p>
                  <p className="text-[11px] text-[#9a734c] dark:text-gray-500 truncate">
                    {user?.email || "admin@foodiedash.vn"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Main — margin-left follows sidebar width */}
      <main
        className="flex-1 min-h-screen flex flex-col transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarW }}
      >
        {/* Topbar — same height as logo area */}
        <header
          className="border-b border-[#e7dbcf] dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6 sticky top-0 z-10"
          style={{ height: TOPBAR_H }}
        >
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#9a734c] dark:text-gray-500 text-lg">
                search
              </span>
              <input
                type="text"
                className="w-full bg-[#f3ede7] dark:bg-gray-800 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-orange-500/20 placeholder:text-[#9a734c] dark:placeholder:text-gray-500 dark:text-white"
                placeholder="Tìm đơn hàng, món ăn hoặc khách hàng..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#f3ede7] dark:bg-gray-800 text-[#1b140d] dark:text-white hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {darkMode ? "light_mode" : "dark_mode"}
              </span>
            </button>
            {/* Notification Bell */}
            <div
              className="relative flex items-center"
              ref={dropdownRef}
              onMouseEnter={() => {
                setShowNotifDropdown(true);
                // Mark all as read when hovering
                setNotifications((prev) =>
                  prev.map((n) => ({ ...n, isRead: true })),
                );
              }}
              onMouseLeave={() => setShowNotifDropdown(false)}
            >
              <button
                type="button"
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl bg-[#f3ede7] dark:bg-gray-800 text-[#1b140d] dark:text-white hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors relative",
                  showNotifDropdown && "bg-orange-100 text-orange-600",
                )}
                title="Thông báo"
              >
                <span className="material-symbols-outlined text-[18px]">
                  notifications
                </span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 -translate-y-1 translate-x-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white text-[8px] font-bold text-white items-center justify-center">
                      {unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifDropdown && (
                <div className="absolute right-0 top-full pt-2 w-80 sm:w-96 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-50 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-800/50">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                        Thông báo mới
                      </h3>
                      <button
                        onClick={() => setNotifications([])}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                      >
                        Xoá tất cả
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-[24px] text-slate-300">
                              notifications
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-400">
                            Không có thông báo mới
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Các đơn hàng mới sẽ xuất hiện ở đây
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50 dark:divide-gray-800">
                          {notifications.map((notif) => (
                            <div
                              key={notif.id + notif.createdAt}
                              onClick={() => {
                                navigate(`/admin/orders`);
                                setShowNotifDropdown(false);
                              }}
                              className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                            >
                              <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                                  <ShoppingBag className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-sm font-black text-slate-800 dark:text-white truncate">
                                      Đơn hàng #{notif.code}
                                    </p>
                                    <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
                                      {formatDistanceToNow(
                                        new Date(notif.createdAt),
                                        { addSuffix: true, locale: vi },
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-500 mb-2">
                                    {notif.itemsCount} món •{" "}
                                    {notif.totalPrice.toLocaleString("vi-VN")}₫
                                  </p>
                                  <div className="inline-flex items-center text-[11px] font-black text-orange-500 group-hover:translate-x-1 transition-transform">
                                    Chi tiết{" "}
                                    <span className="material-symbols-outlined text-[14px] ml-1">
                                      arrow_forward
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-3 bg-slate-50/50 dark:bg-gray-800/50 border-t border-slate-50 dark:border-gray-800">
                        <button
                          onClick={() => {
                            navigate("/admin/orders");
                            setShowNotifDropdown(false);
                          }}
                          className="w-full py-2.5 text-xs font-black text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                          Xem tất cả đơn hàng
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-8">
          <Breadcrumbs className="mb-4" />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
