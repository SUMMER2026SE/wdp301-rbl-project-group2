import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { userService, type UserMeResponse } from "@/services/profile.service";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
const ProfileLayout = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [me, setMe] = useState<UserMeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { setUser, user } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingMe(true);
        const res = await userService.getMe();
        if (!mounted) return;
        setMe(res.data.data);
      } catch (e: any) {
        toast.error(e?.message || "Không thể tải thông tin");
      } finally {
        if (mounted) setLoadingMe(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const onPickAvatar = () => fileRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await userService.updateAvatar(file);
      setMe(res.data.data);
      if (user) {
        setUser({ ...user, avatar: res.data.data.avatar });
      }
      toast.success("Cập nhật avatar thành công");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Upload avatar thất bại";
      toast.error(msg);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const avatarUrl = me?.avatar || "";

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-card rounded-2xl p-8 shadow-[0_4px_20px_-2px_rgba(28,19,13,0.05)] border border-border flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-orange-600/10 to-transparent" />

              <div className="relative mb-4">
                <div className="size-28 rounded-full border-4 border-card shadow-md overflow-hidden bg-accent flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground">
                      {(me?.username?.[0] || "?").toUpperCase()}
                    </span>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarChange}
                />

                <button
                  type="button"
                  onClick={onPickAvatar}
                  disabled={uploading || loadingMe}
                  className="absolute bottom-0 right-0 bg-orange-600 text-orange-600-foreground p-1.5 rounded-full border-2 border-card shadow-sm hover:scale-105 transition-transform disabled:opacity-60"
                  title="Đổi ảnh đại diện"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {uploading ? "progress_activity" : "edit"}
                  </span>
                </button>
              </div>

              <h2 className="text-2xl font-bold mb-1">
                {loadingMe ? "..." : (me?.fullName || me?.username || "—")}
              </h2>

              <p className="text-muted-foreground text-sm mb-4">
                {loadingMe ? "" : (me?.email || "")}
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600/10 text-orange-600 text-xs font-bold uppercase tracking-wider mb-6 border border-orange-600/20">
                <span className="material-symbols-outlined text-sm">stars</span>
                {typeof user?.collectedPoints === "number" ? `${user.collectedPoints} điểm` : "—"}
              </div>
              <div className="grid grid-cols-3 gap-4 w-full border-t border-border pt-6">
                <div>
                  <p className="text-xl font-bold">{loadingMe ? "..." : (me?.ordersCount ?? 0)}</p>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Đơn hàng</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{loadingMe ? "..." : (me?.reviewsCount ?? 0)}</p>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Đánh giá</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{loadingMe ? "..." : (me?.savedCount ?? 0)}</p>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Đã lưu</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="bg-card rounded-2xl p-3 shadow-[0_4px_20px_-2px_rgba(28,19,13,0.05)] border border-border flex flex-col gap-1">
              <NavLink
                to="/profile"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`material-symbols-outlined ${isActive ? "text-orange-600" : ""}`}
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      person
                    </span>
                    Hồ sơ & Sức khỏe
                  </>
                )}
              </NavLink>
              <NavLink
                to="/profile/history"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined ${isActive ? "text-orange-600" : ""}`}>
                      receipt_long
                    </span>
                    Lịch sử đơn hàng
                  </>
                )}
              </NavLink>
              <NavLink
                to="/profile/messages"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined ${isActive ? "text-orange-600" : ""}`}>
                      chat
                    </span>
                    Tin nhắn
                  </>
                )}
              </NavLink>
              <NavLink
                to="/profile/wallet"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined ${isActive ? "text-orange-600" : ""}`}>
                      confirmation_number
                    </span>
                    Ví Voucher
                  </>
                )}
              </NavLink>
              <NavLink
                to="/profile/addresses"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`material-symbols-outlined ${isActive ? "text-orange-600" : ""}`}
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      location_on
                    </span>
                    Địa chỉ
                  </>
                )}
              </NavLink>
              <div className="h-px bg-border mx-4 my-2" />
              <button
                type="button"
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 font-medium transition-colors w-full text-left"
              >
                <span className="material-symbols-outlined">logout</span>
                Đăng xuất
              </button>
            </nav>
          </aside>

          {/* RIGHT COLUMN: Tab content */}
          <section className="min-w-0 lg:col-span-8 space-y-8">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfileLayout;
