import { useState, useEffect } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

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

  // Exact match for "/admin" (dashboard), startsWith for longer paths
  const isPathMatch = (path: string, href: string) =>
    href === "/admin" ? path === "/admin" : path.startsWith(href);

  const hasActiveChild = hasSubItems && subItems.some(sub => isPathMatch(currentPath, sub.href));

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
    label: "Vận hành",
    href: "/admin/orders", // Defaults to Orders, but will have tabs
    icon: "local_shipping",
    subItems: [
      { label: "Quản lý đơn hàng", href: "/admin/orders" },
      { label: "Công nợ nhân viên", href: "/admin/cash-control" },
      // { label: "Điều phối", href: "/admin/dispatch" },
      { label: "Lịch trình giao", href: "/admin/delivery" },
    ],
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
    label: "Khách hàng",
    href: "/admin/customers",
    icon: "group",
    subItems: [
      { label: "Người dùng", href: "/admin/customers" },
      { label: "Đánh giá", href: "/admin/reviews" },
    ],
  },
  {
    label: "Marketing",
    href: "/admin/vouchers",
    icon: "campaign",
  },
  {
    label: "Cài đặt & Hệ thống",
    href: "/admin/settings",
    icon: "settings",
    subItems: [
      { label: "Cấu hình chung", href: "/admin/settings" },
      { label: "Đội ngũ nhân sự", href: "/admin/staff" },
      { label: "Báo cáo chi tiết", href: "/admin/analytics" },
    ],
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
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("admin_theme") === "dark",
  );
  const [isHovered, setIsHovered] = useState(false);

  const sidebarW = isHovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

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
                isHovered ? "h-18 -ml-8 -mr-10" : "h-14"
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
          {NAV_ITEMS.map((item) => {
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
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#f3ede7] dark:bg-gray-800 text-[#1b140d] dark:text-white hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors relative"
            >
              <span className="material-symbols-outlined text-[18px]">
                notifications
              </span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
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
