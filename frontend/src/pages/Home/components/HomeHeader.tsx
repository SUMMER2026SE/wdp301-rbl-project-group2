import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import i18n from "../../../config/i18n";
import type { Notification } from "@/types/notification";
import notificationService from "@/services/notification.service";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { getSupportSocket } from "@/lib/support-socket";
// import { apiClient } from "@/lib/api-client";
import logo from "@/assets/logo.png";
import { useCart } from "@/hooks/useCart";
import { CartPreviewDropdown } from "@/components/shared/CartPreviewDropdown";

interface HomeHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const HomeHeader = ({ searchQuery, onSearchChange }: HomeHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "customer"]);
  const { user, isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { items: cartItems, totalItems, totalPrice, clearCart } = useCart();

  const cartCount = totalItems > 0 ? totalItems : cartItems.length;
  // Local input state for header search
  const [localSearch, setLocalSearch] = useState(searchQuery || "");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

//   const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { playNotification } = useNotificationSound();
  const prevUnreadCountRef = useRef(0);
  const hasInitializedNotificationRef = useRef(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    // Đầu tiên logout để auth chuyển sang guest (giữ lại cart của user trong localStorage)
    logout();
    // Sau đó clear cart theo key guest để UI trống cho khách
    clearCart();
    setShowDropdown(false);
    navigate("/");
  };

  // Navigate to /menu with search keyword
  const handleSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate(`/menu?search=${encodeURIComponent(trimmed)}`);
    setShowMobileSearch(false);
  };

  const displayName = user?.fullName || user?.username || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = user?.avatar || "";
  const isVN = i18n.language === "vi-VN";

  // Countdown
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const eod = new Date();
  eod.setHours(23, 59, 59, 999);
  const diff = eod.getTime() - now.getTime();
  const cH = String(Math.floor((diff / 3600000) % 24)).padStart(2, "0");
  const cM = String(Math.floor((diff / 60000) % 60)).padStart(2, "0");
  const cS = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");

  // Close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setShowNotificationDropdown(false);
      }

      if (
        mobileMenuRef.current &&
        isMobileMenuOpen &&
        !mobileMenuRef.current.contains(target)
      ) {
        const hamburger = document.querySelector("[data-mobile-trigger]");
        if (hamburger && !hamburger.contains(target)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const fetchNotifications = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        notificationService.getMyNotifications(),
        notificationService.getUnreadCount(),
      ]);

      setNotifications(listRes.data.data || []);
      setUnreadCount(countRes.data.data?.count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [isAuthenticated]);

//   const fetchActiveOrders = useCallback(async () => {
//     try {
//       const res = await apiClient.get("/orders/active-count");
//       setActiveOrdersCount(res.data.data?.count || 0);
//     } catch (error) {
//       console.error("Failed to fetch active orders count", error);
//     }
//   }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) {
      if (notifications.length > 0) setNotifications([]);
      if (unreadCount !== 0) setUnreadCount(0);
      if (prevUnreadCountRef.current !== 0) prevUnreadCountRef.current = 0;
      if (hasInitializedNotificationRef.current !== false) hasInitializedNotificationRef.current = false;
      return;
    }

    fetchNotifications();
    // fetchActiveOrders();

    const interval = setInterval(() => {
      fetchNotifications();
      // fetchActiveOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!hasInitializedNotificationRef.current) {
      prevUnreadCountRef.current = unreadCount;
      hasInitializedNotificationRef.current = true;
      return;
    }

    if (unreadCount > prevUnreadCountRef.current && !showNotificationDropdown) {
      playNotification();
    }
    prevUnreadCountRef.current = unreadCount;
  }, [isAuthenticated, unreadCount, playNotification, showNotificationDropdown]);

  // Real-time socket listener for notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSupportSocket();

    socket.on("order:status_updated", (data: { message: string }) => {
      console.log("Header received real-time notification:", data);

      // Create a local notification object to append to the list
      const newNoti: Notification = {
        _id: `temp-${Date.now()}`,
        title: "Cập nhật đơn hàng",
        body: data.message,
        type: "ORDER_STATUS_UPDATED",
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setNotifications((prev) => [newNoti, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
      playNotification();
    });

    return () => {
      socket.off("order:status_updated");
    };
  }, [isAuthenticated, user?._id, playNotification]);


  return (
    <>
      {/* ═══════ TOP BANNER — scrolls away ═══════ */}
      <div className="bg-[#3c2415] text-white/90 py-1.5 text-[11px] lg:text-xs font-medium z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-1.5">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5 hover:text-orange-300 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[14px]">
                location_on
              </span>
              <span>Đà Nẵng, VN</span>
            </div>
            <div className="flex items-center gap-1.5 hover:text-orange-300 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[14px]">
                call
              </span>
              <span>1900 xxxx</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 hover:text-orange-300 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[14px]">
                mail
              </span>
              <span>contact@foodiedash.vn</span>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="#"
              className="hidden md:flex items-center gap-1.5 hover:text-orange-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">
                help
              </span>
              <span>Hỗ Trợ</span>
            </a>
            <button
              onClick={() => i18n.changeLanguage(isVN ? "en-US" : "vi-VN")}
              className="flex items-center gap-1.5 hover:text-orange-300 transition-colors"
            >
              <span className="text-sm leading-none">{isVN ? "🇻🇳" : "🇺🇸"}</span>
              <span>{isVN ? "VI" : "EN"}</span>
            </button>
            <div className="bg-orange-500 text-white px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm font-bold text-[11px]">
              <span className="material-symbols-outlined text-[13px]">
                timer
              </span>
              <span>
                Ưu đãi: {cH}:{cM}:{cS}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ STICKY HEADER + NAVBAR ═══════ */}
      <header className="sticky top-0 z-50">
        {/* ═══════ MAIN HEADER — white, clean ═══════ */}
        <div className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 text-orange-600 hover:scale-105 transition-transform group shrink-0">
              <img
                src={logo}
                alt="FoodieDash"
                className="h-18 -mt-2 -mb-2 -ml-10 -mr-12 object-contain group-hover:rotate-12 transition-transform duration-300"
              />
              <h1 className="text-2xl font-black tracking-tighter">FoodieDash</h1>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl hidden md:block mx-4">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-orange-400 group-focus-within:text-orange-600 transition-colors">
                  search
                </span>
                <input
                  type="text"
                  value={onSearchChange ? searchQuery || "" : localSearch}
                  onChange={(e) => {
                    if (onSearchChange) onSearchChange(e.target.value);
                    else setLocalSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (onSearchChange)
                        onSearchChange((e.target as HTMLInputElement).value);
                      else handleSearch(localSearch);
                    }
                  }}
                  placeholder={t("customer:menu.searchPlaceholder")}
                  className="w-full h-12 pl-12 pr-28 bg-orange-50/60 text-gray-900 rounded-full border-2 border-orange-200 placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-none transition-all duration-300 text-sm font-medium"
                />
                <button
                  onClick={() =>
                    handleSearch(
                      onSearchChange ? searchQuery || "" : localSearch,
                    )
                  }
                  className="absolute right-1.5 top-1.5 h-9 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center gap-1.5 transition-all hover:scale-[1.02] shadow-md text-sm font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    search
                  </span>
                  <span className="hidden lg:inline">Tìm kiếm</span>
                </button>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Mobile search */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="p-2.5 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 md:hidden"
              >
                <span className="material-symbols-outlined text-[22px]">
                  search
                </span>
              </button>

              {isAuthenticated && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotificationDropdown((prev) => !prev)}
                    className="p-2.5 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 relative"
                    aria-label="Thông báo"
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      notifications
                    </span>

                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotificationDropdown && (
                    <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">Thông báo</h3>

                        {notifications.length > 0 && (
                          <button
                            onClick={async () => {
                              try {
                                await notificationService.markAllAsRead();
                                await fetchNotifications();
                              } catch (error) {
                                console.error(
                                  "Failed to mark all notifications as read:",
                                  error,
                                );
                              }
                            }}
                            className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-gray-400">
                            Chưa có thông báo nào.
                          </div>
                        ) : (
                          notifications.map((noti) => (
                            <button
                              key={noti._id}
                              onClick={async () => {
                                try {
                                  if (!noti.isRead) {
                                    await notificationService.markAsRead(
                                      noti._id,
                                    );
                                  }

                                  setShowNotificationDropdown(false);
                                  await fetchNotifications();
                                  navigate("/profile/history");
                                } catch (error) {
                                  console.error(
                                    "Failed to handle notification click:",
                                    error,
                                  );
                                }
                              }}
                              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-orange-50/60 transition-colors ${!noti.isRead ? "bg-orange-50/40" : "bg-white"
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  <span className="material-symbols-outlined text-[20px] text-orange-500">
                                    notifications
                                  </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                      {noti.title}
                                    </p>

                                    {!noti.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                                    )}
                                  </div>

                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {noti.body}
                                  </p>

                                  <p className="text-[11px] text-gray-400 mt-2">
                                    {new Date(noti.createdAt).toLocaleString(
                                      "vi-VN",
                                    )}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cart + hover preview */}
              <CartPreviewDropdown items={cartItems} totalPrice={totalPrice}>
                <button
                  type="button"
                  data-cart-icon
                  onClick={() => navigate("/cart")}
                  className="p-2.5 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 relative group cursor-pointer"
                  aria-label={t("customer:cart.title", "Giỏ hàng")}
                >
                  <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">
                    shopping_cart
                  </span>
                  {cartCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-orange-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-0.5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
              </CartPreviewDropdown>

              <div className="h-7 w-px bg-gray-200 mx-2 hidden sm:block"></div>

              {/* ── User Account ── */}
              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      login
                    </span>
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-px transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      person_add
                    </span>
                    Đăng ký
                  </Link>
                  <Link
                    to="/login"
                    className="sm:hidden p-2.5 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-all"
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      person
                    </span>
                  </Link>
                </div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 h-10 px-2.5 rounded-xl hover:bg-orange-50 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-full ring-2 ring-orange-200 overflow-hidden bg-orange-100">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="avatar"
                          className="w-full h-full object-cover block"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-sm font-bold text-white">
                          {initial}
                        </div>
                      )}
                    </div>
                    <span className="hidden lg:inline text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                      {displayName.split(" ")[0]}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-gray-400">
                      expand_more
                    </span>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-5 py-4 bg-gradient-to-br from-orange-50 to-yellow-50/50 border-b border-orange-100/50">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full ring-2 ring-orange-100 overflow-hidden bg-orange-100">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  className="w-full h-full object-cover block"
                                  alt="avatar"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-lg">
                                  {initial}
                                </div>
                              )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {displayName}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {displayEmail}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <Link
                          to="/profile"
                          className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-all group"
                          onClick={() => setShowDropdown(false)}
                        >
                          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 group-hover:scale-110 transition-all">
                            <span className="material-symbols-outlined text-[18px] text-orange-600">
                              person
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">
                              {t("customer:profile.personalInfo")}
                            </p>
                            <p className="text-xs text-gray-500">
                              Chỉnh sửa hồ sơ của bạn
                            </p>
                          </div>
                        </Link>
                        <Link
                          to="/profile/history"
                          className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all group"
                          onClick={() => setShowDropdown(false)}
                        >
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 group-hover:scale-110 transition-all relative">
                            <span className="material-symbols-outlined text-[18px] text-emerald-600">
                              receipt_long
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">Đơn hàng</p>
                            <p className="text-xs text-gray-500">Xem lại lịch sử đơn hàng</p>
                          </div>
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-5 py-3.5 text-sm text-red-600 hover:bg-red-50 w-full transition-all group font-semibold"
                        >
                          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 group-hover:scale-110 transition-all">
                            <span className="material-symbols-outlined text-[18px] text-red-600">
                              logout
                            </span>
                          </div>
                          <span>{t("customer:profile.logout")}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                data-mobile-trigger
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2.5 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 lg:hidden ml-0.5"
                aria-label="Menu"
              >
                <span className="material-symbols-outlined text-[24px]">
                  menu
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ═══════ NAV BAR — warm cream, content on both sides ═══════ */}
        <div className="bg-[#fef7f0] border-b border-orange-100 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex items-center justify-between h-11 text-[13px] font-semibold">
              {/* Left: main nav */}
              <nav className="flex items-center gap-1">
                <Link
                  to="/"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#3c2415] hover:bg-orange-100 hover:text-orange-600 transition-all duration-200 font-bold"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    home
                  </span>
                  {t("common:nav.home", "Trang chủ")}
                </Link>
                <Link
                  to="/menu"
                  className="px-3 py-1.5 rounded-lg text-[#6b4c2a] hover:bg-orange-100 hover:text-orange-600 transition-all duration-200"
                >
                  {t("common:nav.menu")}
                </Link>
                <Link
                  to="/about"
                  className="px-3 py-1.5 rounded-lg text-[#6b4c2a] hover:bg-orange-100 hover:text-orange-600 transition-all duration-200"
                >
                  {t("common:nav.about")}
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/profile/history"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#6b4c2a] hover:bg-orange-100 hover:text-orange-600 transition-all duration-200"
                  >
                    {t("common:nav.orders")}
                  </Link>
                )}
              </nav>

              {/* Right: secondary info */}
              <div className="flex items-center gap-5 text-[#6b4c2a]">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-orange-500 text-[15px]">
                    local_shipping
                  </span>
                  <span>Miễn phí giao hàng từ 50K</span>
                </div>
                <div className="h-3.5 w-px bg-orange-200"></div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-orange-500 text-[15px]">
                    schedule
                  </span>
                  <span>7:00 - 22:00</span>
                </div>
                <div className="h-3.5 w-px bg-orange-200"></div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="material-symbols-outlined text-orange-500 text-[15px]">
                    location_on
                  </span>
                  <span>Đà Nẵng, VN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ MOBILE SEARCH MODAL ═══════ */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setShowMobileSearch(false)}
          />
          <div className="absolute top-0 left-0 right-0 bg-white shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-orange-400">
                    search
                  </span>
                  <input
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSearch(localSearch)
                    }
                    placeholder={t("customer:menu.searchPlaceholder")}
                    className="w-full h-12 pl-12 pr-4 bg-orange-50/60 text-gray-900 rounded-full border-2 border-orange-200 placeholder:text-gray-400 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:outline-none text-sm"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => handleSearch(localSearch)}
                  className="h-12 px-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                >
                  Tìm
                </button>
                <button
                  onClick={() => setShowMobileSearch(false)}
                  className="h-12 w-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    close
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MOBILE SLIDE MENU ═══════ */}
      <div
        ref={mobileMenuRef}
        className={`fixed inset-0 z-[100] lg:hidden transition-opacity duration-300 ${isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
          }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={closeMobileMenu}
        />
        <div
          className={`absolute top-0 right-0 h-full w-full max-w-[300px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          style={{ zIndex: 101 }}
        >
          <div className="flex items-center justify-between p-4 border-b border-orange-100 bg-[#fef7f0]">
            {isAuthenticated ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {displayEmail}
                  </p>
                </div>
              </div>
            ) : (
              <span className="font-bold text-gray-800">Menu</span>
            )}
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-xl text-gray-500 hover:bg-orange-100 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[22px]">
                close
              </span>
            </button>
          </div>

          <nav className="flex flex-col p-4 gap-1 flex-1 overflow-y-auto">
            <Link
              to="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[22px] text-orange-500">
                home
              </span>
              {t("common:nav.home", "Trang chủ")}
            </Link>
            <Link
              to="/menu"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[22px] text-orange-500">
                restaurant
              </span>
              {t("common:nav.menu")}
            </Link>
            <Link
              to="/about"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[22px] text-orange-500">
                info
              </span>
              {t("common:nav.about")}
            </Link>

            <div className="border-t border-orange-100 my-2" />

            <button
              onClick={() => i18n.changeLanguage(isVN ? "en-US" : "vi-VN")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 text-left w-full"
            >
              <span className="text-[22px] leading-none">
                {isVN ? "🇻🇳" : "🇺🇸"}
              </span>
              {isVN ? "English" : "Tiếng Việt"}
            </button>

            <button
              onClick={() => {
                closeMobileMenu();
                navigate("/cart");
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 text-left w-full"
            >
              <span className="material-symbols-outlined text-[22px] text-orange-500">
                shopping_cart
              </span>
              {t("common:nav.cart")}
              {cartCount > 0 && (
                <span className="ml-auto bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {isAuthenticated && (
              <>
                <div className="border-t border-orange-100 my-2" />
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-[22px] text-orange-500">
                    person
                  </span>
                  {t("common:nav.profile")}
                </Link>
                <Link
                  to="/profile/history"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
                >
                  <span className="material-symbols-outlined text-[22px] text-orange-500">
                    receipt_long
                  </span>
                  {t("common:nav.orders")}
                </Link>
              </>
            )}

            <div className="mt-auto border-t border-orange-100 pt-3">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    closeMobileMenu();
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    logout
                  </span>
                  Đăng xuất
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-400 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      login
                    </span>
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      person_add
                    </span>
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default HomeHeader;
