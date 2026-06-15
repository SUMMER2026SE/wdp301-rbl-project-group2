import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Users,
  WalletCards,
  MenuSquare,
  Clock,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getStores } from "@/services/store.service";

export default function ManagerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeName, setStoreName] = useState("Chi nhánh quản lý");
  const [isHovered, setIsHovered] = useState(false); // Sidebar hover

  const SIDEBAR_EXPANDED = 260;
  const SIDEBAR_COLLAPSED = 80;
  const sidebarW = isHovered ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  // Fetch store name that manager is working at
  useEffect(() => {
    const fetchStore = async () => {
      if (!user?.storeId) {
        setStoreName("Chưa gán chi nhánh");
        return;
      }
      try {
        const res = await getStores();
        if (res?.success && Array.isArray(res.data)) {
          const matchedStore = res.data.find((s) => s._id === user.storeId);
          if (matchedStore) {
            setStoreName(matchedStore.name);
          } else {
            setStoreName("Chi nhánh không xác định");
          }
        }
      } catch (err) {
        console.error("Failed to fetch store name for manager:", err);
        setStoreName("Chi nhánh quản lý");
      }
    };
    void fetchStore();
  }, [user?.storeId]);

  const navItems = [
    {
      path: "/manager/dashboard",
      label: "Tổng quan",
      icon: BarChart3,
      exact: true,
    },
    { path: "/manager/orders", label: "Quản lý Đơn hàng", icon: ClipboardList },
    { path: "/manager/menu", label: "Menu chi nhánh", icon: MenuSquare },
    { path: "/manager/staff", label: "Nhân viên", icon: Users },
    { path: "/manager/staff-requests", label: "Đề xuất nhân sự", icon: Users },
    { path: "/manager/cash", label: "Doanh thu & COD", icon: WalletCards },
    { path: "/manager/settings", label: "Cài đặt", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getCurrentPageTitle = () => {
    const currentItem = navItems.find((item) =>
      item.exact
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path),
    );
    return currentItem?.label || "Quản lý Chi nhánh";
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed lg:static top-0 left-0 z-[100] flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
          sidebarOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: sidebarOpen ? 260 : sidebarW }}
      >
        {/* Logo Area */}
        <div
          className={`h-20 flex items-center justify-between border-b border-slate-100 shrink-0 transition-all duration-300 ${isHovered ? "px-6" : "px-0"}`}
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
            <div className="flex flex-col overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
              <span className="text-2xl font-black tracking-tighter m-0 leading-none">
                FoodieDash
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600/80 mt-1">
                Manager Portal
              </span>
            </div>
          )}
          <button
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-4 overflow-y-auto no-scrollbar space-y-1">
          <div
            className={`px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0 h-0 overflow-hidden"}`}
          >
            Menu Quản Lý
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              title={!isHovered ? item.label : undefined}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                } ${isHovered ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"}`
              }
            >
              <item.icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ${!isHovered && "scale-110"}`}
              />
              {isHovered && (
                <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div
            className={`flex items-center p-3 bg-slate-50 border border-slate-200/60 rounded-xl mb-3 transition-all duration-300 ${isHovered ? "gap-3" : "justify-center p-2"}`}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
            {isHovered && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap animate-in fade-in duration-300 text-left">
                <span className="text-xs font-black text-slate-800">
                  Quản lý cửa hàng
                </span>
                <span
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate max-w-[150px]"
                  title={storeName}
                >
                  {storeName}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={!isHovered ? "Đăng xuất" : undefined}
            className={`flex items-center w-full text-sm font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 ${isHovered ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isHovered && <span className="whitespace-nowrap">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
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
                FoodieDash - Không gian làm việc dành cho quản lý
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* User Profile */}
            <div className="flex items-center gap-3 pl-2 sm:pl-0">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-bold text-slate-800 leading-none mb-1">
                  {user?.fullName || user?.username || "Manager"}
                </div>
                <div className="text-[11px] font-semibold text-orange-500 uppercase tracking-wider">
                  Quản lý chi nhánh
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center overflow-hidden shrink-0">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold">
                    {user?.username?.charAt(0)?.toUpperCase() || "M"}
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
